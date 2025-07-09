import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import logger from '../../../logger/logger.js';
import { STREAMABLE_HTTP_ENDPOINT, RATE_LIMIT_CONFIG } from '../../../constants.js';
import { ServerManager } from '../../../core/server/serverManager.js';
import { ServerConfigManager } from '../../../core/server/serverConfig.js';
import tagsExtractor from '../../../utils/tagsExtractor.js';

// Rate limiter for Streamable HTTP endpoints
const createStreamableHttpLimiter = () => {
  const serverConfig = ServerConfigManager.getInstance();
  return rateLimit({
    windowMs: serverConfig.getRateLimitWindowMs(),
    max: serverConfig.getRateLimitMax(),
    standardHeaders: true,
    legacyHeaders: false,
    message: RATE_LIMIT_CONFIG.OAUTH.MESSAGE,
  });
};

export function setupStreamableHttpRoutes(
  app: express.Application,
  serverManager: ServerManager,
  authMiddleware: express.RequestHandler,
): void {
  app.post(
    STREAMABLE_HTTP_ENDPOINT,
    createStreamableHttpLimiter(),
    authMiddleware,
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

          await serverManager.connectTransport(transport, id, {
            tags,
            enablePagination: req.query.pagination === 'true',
          });

          transport.onclose = () => {
            serverManager.disconnectTransport(id);
            // Note: ServerManager already logs the disconnection
          };
        } else {
          const existingTransport = serverManager.getTransport(sessionId);
          if (!existingTransport) {
            res.status(404).json({
              error: {
                code: ErrorCode.InvalidParams,
                message: 'No active streamable HTTP session found for the provided sessionId',
              },
            });
            return;
          }
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

  app.get(
    STREAMABLE_HTTP_ENDPOINT,
    createStreamableHttpLimiter(),
    authMiddleware,
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

        const transport = serverManager.getTransport(sessionId) as StreamableHTTPServerTransport;
        if (!transport) {
          res.status(404).json({
            error: {
              code: ErrorCode.InvalidParams,
              message: 'No active streamable HTTP session found for the provided sessionId',
            },
          });
          return;
        }
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error('Streamable HTTP error:', error);
        res.status(500).end();
      }
    },
  );

  app.delete(
    STREAMABLE_HTTP_ENDPOINT,
    createStreamableHttpLimiter(),
    authMiddleware,
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

        const transport = serverManager.getTransport(sessionId) as StreamableHTTPServerTransport;
        if (!transport) {
          res.status(404).json({
            error: {
              code: ErrorCode.InvalidParams,
              message: 'No active streamable HTTP session found for the provided sessionId',
            },
          });
          return;
        }
        await transport.handleRequest(req, res);
      } catch (error) {
        logger.error('Streamable HTTP error:', error);
        res.status(500).end();
      }
    },
  );
}
