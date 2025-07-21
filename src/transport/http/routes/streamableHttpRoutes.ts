import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import logger from '../../../logger/logger.js';
import { STREAMABLE_HTTP_ENDPOINT } from '../../../constants.js';
import { ServerManager } from '../../../core/server/serverManager.js';
import { ServerStatus } from '../../../core/types/index.js';
import tagsExtractor from '../middlewares/tagsExtractor.js';
import { createScopeAuthMiddleware, getValidatedTags } from '../middlewares/scopeAuthMiddleware.js';
import { sanitizeHeaders } from '../../../utils/sanitization.js';
import { SDKOAuthServerProvider } from '../../../auth/sdkOAuthServerProvider.js';

export function setupStreamableHttpRoutes(
  router: Router,
  serverManager: ServerManager,
  oauthProvider?: SDKOAuthServerProvider,
): void {
  const scopeAuthMiddleware = createScopeAuthMiddleware(oauthProvider);
  router.post(STREAMABLE_HTTP_ENDPOINT, tagsExtractor, scopeAuthMiddleware, async (req: Request, res: Response) => {
    try {
      logger.info('[POST] streamable-http', {
        query: req.query,
        body: req.body,
        headers: sanitizeHeaders(req.headers),
      });

      let transport: StreamableHTTPServerTransport;
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (!sessionId) {
        const id = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => id,
        });

        // Use validated tags from scope auth middleware
        const tags = getValidatedTags(res);

        await serverManager.connectTransport(transport, id, {
          tags,
          enablePagination: req.query.pagination === 'true',
        });

        transport.onclose = () => {
          serverManager.disconnectTransport(id);
          // Note: ServerManager already logs the disconnection
        };

        transport.onerror = (error) => {
          logger.error(`Streamable HTTP transport error for session ${id}:`, error);
          const server = serverManager.getServer(id);
          if (server) {
            server.status = ServerStatus.Error;
            server.lastError = error instanceof Error ? error : new Error(String(error));
          }
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
  });

  router.get(STREAMABLE_HTTP_ENDPOINT, async (req: Request, res: Response) => {
    try {
      logger.info('[GET] streamable-http', { query: req.query, headers: sanitizeHeaders(req.headers) });

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
  });

  router.delete(STREAMABLE_HTTP_ENDPOINT, async (req: Request, res: Response) => {
    try {
      logger.info('[DELETE] streamable-http', { query: req.query, headers: sanitizeHeaders(req.headers) });

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
  });
}
