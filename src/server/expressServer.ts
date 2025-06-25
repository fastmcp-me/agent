import { randomUUID } from 'node:crypto';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ServerManager } from '../serverManager.js';
import logger from '../logger/logger.js';
import { SSE_ENDPOINT, MESSAGES_ENDPOINT, STREAMABLE_HTTP_ENDPOINT } from '../constants.js';
import tagsExtractor from './tagsExtractor.js';
import errorHandler from './errorHandler.js';

export class ExpressServer {
  private app: express.Application;
  private serverManager: ServerManager;

  constructor(serverManager: ServerManager) {
    this.app = express();
    this.serverManager = serverManager;
    this.setupMiddleware();
    this.setupStreamableHttpRoutes();
    this.setupSseRoutes();
    this.setupOAuthEndpoints();
  }

  private setupMiddleware(): void {
    this.app.use(cors()); // Allow all origins for local dev
    this.app.use(bodyParser.json());

    // Add error handling middleware
    this.app.use(errorHandler);
  }

  private validateAccessToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      res.status(401).json({ error: 'invalid_token', error_description: 'Missing Bearer token' });
      return;
    }
    const token = auth.slice('Bearer '.length);
    const tokenData = this.accessTokens.get(token);
    if (!tokenData || tokenData.expires < Date.now()) {
      res.status(401).json({ error: 'invalid_token', error_description: 'Invalid or expired token' });
      return;
    }
    // Optionally: check resource match here if needed
    next();
  };

  private setupStreamableHttpRoutes(): void {
    this.app.post(
      STREAMABLE_HTTP_ENDPOINT,
      this.validateAccessToken,
      tagsExtractor,
      async (req: express.Request, res: express.Response) => {
        try {
          logger.info('[POST] streamable-http', { query: req.query, body: req.body, headers: req.headers });

          let transport: StreamableHTTPServerTransport;
          const sessionId = req.headers['mcp-session-id'] as string | undefined;
          if (!sessionId) {
            const id = randomUUID();
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => id,
            });

            // Use tags from middleware
            const tags = res.locals.tags;

            await this.serverManager.connectTransport(transport, id, {
              tags,
              enablePagination: req.query.pagination === 'true',
            });

            transport.onclose = () => {
              this.serverManager.disconnectTransport(id);
              logger.info('transport closed', transport.sessionId);
            };
          } else {
            const existingTransport = this.serverManager.getTransport(sessionId);
            if (existingTransport instanceof StreamableHTTPServerTransport) {
              transport = existingTransport;
            } else {
              res.status(400).json({
                error: {
                  code: ErrorCode.InvalidParams,
                  message: 'Session already exists but uses a different transport protocol',
                },
              });
              return;
            }
          }
          await transport.handleRequest(req, res, req.body);
        } catch (error) {
          logger.error('Streamable HTTP error:', error);
          res.status(500).end();
        }
      },
    );

    this.app.get(
      STREAMABLE_HTTP_ENDPOINT,
      this.validateAccessToken,
      async (req: express.Request, res: express.Response) => {
        try {
          logger.info('[GET] streamable-http', { query: req.query, headers: req.headers });
          const sessionId = req.headers['mcp-session-id'] as string | undefined;
          if (!sessionId) {
            res.status(400).json({
              error: {
                code: ErrorCode.InvalidParams,
                message: 'Invalid params: sessionId is required',
              },
            });
            return;
          }
          const transport = this.serverManager.getTransport(sessionId) as StreamableHTTPServerTransport;
          await transport.handleRequest(req, res, req.body);
        } catch (error) {
          logger.error('Streamable HTTP error:', error);
          res.status(500).end();
        }
      },
    );

    this.app.delete(
      STREAMABLE_HTTP_ENDPOINT,
      this.validateAccessToken,
      async (req: express.Request, res: express.Response) => {
        try {
          logger.info('[DELETE] streamable-http', { query: req.query, headers: req.headers });
          const sessionId = req.headers['mcp-session-id'] as string | undefined;
          if (!sessionId) {
            res.status(400).json({
              error: {
                code: ErrorCode.InvalidParams,
                message: 'Invalid params: sessionId is required',
              },
            });
            return;
          }
          const transport = this.serverManager.getTransport(sessionId) as StreamableHTTPServerTransport;
          await transport.handleRequest(req, res);
        } catch (error) {
          logger.error('Streamable HTTP error:', error);
          res.status(500).end();
        }
      },
    );
  }

  private setupSseRoutes(): void {
    this.app.get(
      SSE_ENDPOINT,
      this.validateAccessToken,
      tagsExtractor,
      async (req: express.Request, res: express.Response) => {
        try {
          logger.info('[GET] sse', { query: req.query, headers: req.headers });
          const transport = new SSEServerTransport(MESSAGES_ENDPOINT, res);

          // Use tags from middleware
          const tags = res.locals.tags;

          // Connect the transport using the server manager
          await this.serverManager.connectTransport(transport, transport.sessionId, {
            tags,
            enablePagination: req.query.pagination === 'true',
          });

          transport.onclose = () => {
            this.serverManager.disconnectTransport(transport.sessionId);
            logger.info('transport closed', transport.sessionId);
          };
        } catch (error) {
          logger.error('SSE connection error:', error);
          res.status(500).end();
        }
      },
    );

    this.app.post(MESSAGES_ENDPOINT, this.validateAccessToken, async (req: express.Request, res: express.Response) => {
      try {
        const sessionId = req.query.sessionId as string;
        if (!sessionId) {
          res.status(400).json({
            error: {
              code: ErrorCode.InvalidParams,
              message: 'Invalid params: sessionId is required',
            },
          });
          return;
        }

        logger.info('message', { body: req.body, sessionId });
        const transport = this.serverManager.getTransport(sessionId);
        if (transport instanceof SSEServerTransport) {
          await transport.handlePostMessage(req, res, req.body);
          return;
        }
        res.status(404).json({
          error: {
            code: ErrorCode.InvalidParams,
            message: 'Transport not found',
          },
        });
      } catch (error) {
        logger.error('Message handling error:', error);
        res.status(500).json({
          error: {
            code: ErrorCode.InternalError,
            message: 'Internal server error',
          },
        });
      }
    });
  }

  // --- OAuth 2.1 Authorization Server Endpoints ---
  private authCodes: Map<string, { clientId: string; redirectUri: string; resource: string; expires: number }> =
    new Map();
  private accessTokens: Map<string, { clientId: string; resource: string; expires: number }> = new Map();
  private OAUTH_CODE_TTL = 60 * 1000; // 1 minute
  private OAUTH_TOKEN_TTL = 24 * 60 * 60 * 1000; // 10 minutes
  private DEFAULT_REDIRECT_PATH = '/oauth/callback';

  private setupOAuthEndpoints(): void {
    // /authorize endpoint (auto-approve)
    this.app.get('/authorize', (req, res) => {
      logger.info('[OAuth] /authorize request', { query: req.query, headers: req.headers });
      const {
        response_type,
        client_id,
        redirect_uri,
        state,
        resource,
        code_challenge: _code_challenge,
        code_challenge_method: _code_challenge_method,
      } = req.query;
      if (response_type !== 'code' || !client_id) {
        logger.warn('[OAuth] /authorize invalid request', { response_type, client_id });
        res.status(400).json({ error: 'invalid_request' });
        return;
      }
      // Accept S256 or plain for code_challenge_method (not enforced for local dev)
      // Use default redirect URI if not provided
      const port = (req.socket.localPort || 80).toString();
      const defaultRedirect = `http://localhost:${port}${this.DEFAULT_REDIRECT_PATH}`;
      const redirect = typeof redirect_uri === 'string' ? redirect_uri : defaultRedirect;
      const code = randomUUID();
      this.authCodes.set(code, {
        clientId: client_id as string,
        redirectUri: redirect,
        resource: typeof resource === 'string' ? resource : '',
        expires: Date.now() + this.OAUTH_CODE_TTL,
      });
      // Build redirect URL
      const url = new URL(redirect);
      url.searchParams.set('code', code);
      if (state) url.searchParams.set('state', state as string);
      logger.info('[OAuth] /authorize success', { client_id, code, redirect: url.toString() });
      res.redirect(url.toString());
    });

    // /token endpoint
    this.app.post('/token', bodyParser.urlencoded({ extended: false }), (req, res) => {
      logger.info('[OAuth] /token request', { body: req.body, headers: req.headers });
      const { grant_type, code, client_id, redirect_uri, resource } = req.body;
      if (grant_type !== 'authorization_code' || !code || !client_id) {
        logger.warn('[OAuth] /token invalid request', { grant_type, code: !!code, client_id });
        res.status(400).json({ error: 'invalid_request' });
        return;
      }
      const codeData = this.authCodes.get(code);
      if (!codeData || codeData.clientId !== client_id || codeData.expires < Date.now()) {
        logger.warn('[OAuth] /token invalid grant', { code, client_id, hasCodeData: !!codeData });
        res.status(400).json({ error: 'invalid_grant' });
        return;
      }
      if (redirect_uri && codeData.redirectUri !== redirect_uri) {
        logger.warn('[OAuth] /token redirect_uri mismatch', { expected: codeData.redirectUri, provided: redirect_uri });
        res.status(400).json({ error: 'redirect_uri_mismatch' });
        return;
      }
      if (resource && codeData.resource && codeData.resource !== resource) {
        logger.warn('[OAuth] /token resource mismatch', { expected: codeData.resource, provided: resource });
        res.status(400).json({ error: 'invalid_resource' });
        return;
      }
      this.authCodes.delete(code);
      const accessToken = randomUUID();
      this.accessTokens.set(accessToken, {
        clientId: client_id,
        resource: codeData.resource,
        expires: Date.now() + this.OAUTH_TOKEN_TTL,
      });
      logger.info('[OAuth] /token success', { client_id, accessToken });
      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: this.OAUTH_TOKEN_TTL / 1000,
        scope: '',
      });
    });

    // OAuth 2.0 Authorization Server Metadata (RFC8414)
    this.app.get('/.well-known/oauth-authorization-server', (req, res) => {
      logger.info('[OAuth] metadata request', { url: req.url });
      const port = (req.socket.localPort || 80).toString();
      const issuer = `http://localhost:${port}`;
      res.json({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        registration_endpoint: `${issuer}/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256', 'plain'],
        token_endpoint_auth_methods_supported: ['none'],
      });
    });

    // MCP Resource Metadata (RFC9728)
    this.app.get('/mcp-resource-metadata', (req, res) => {
      logger.info('[OAuth] resource metadata request', { url: req.url });
      const port = (req.socket.localPort || 80).toString();
      const issuer = `http://localhost:${port}`;
      res.json({
        authorization_servers: [`${issuer}/.well-known/oauth-authorization-server`],
        resource: issuer,
      });
    });

    // OAuth 2.0 Protected Resource Metadata (RFC9728) well-known endpoint
    this.app.get('/.well-known/oauth-protected-resource', (req, res) => {
      logger.info('[OAuth] protected resource metadata request', { url: req.url });
      const port = (req.socket.localPort || 80).toString();
      const issuer = `http://localhost:${port}`;
      res.json({
        authorization_servers: [`${issuer}/.well-known/oauth-authorization-server`],
        resource: issuer,
      });
    });

    // OAuth 2.0 Dynamic Client Registration (RFC7591)
    this.app.post('/register', bodyParser.json(), (req, res) => {
      logger.info('[OAuth] client registration request', { body: req.body });
      // Accept any registration, auto-approve
      const clientId = randomUUID();
      // Optionally store client info in memory (not used for local dev)
      logger.info('[OAuth] client registration success', { clientId });
      res.status(201).json({
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        token_endpoint_auth_method: 'none',
        ...req.body,
      });
    });
  }

  public start(port: number, host: string): void {
    this.app.listen(port, host, () => {
      logger.info(`Server is running on port ${port} with HTTP/SSE and Streamable HTTP transport`);
    });
  }
}
