import express from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import logger from '../../logger/logger.js';
import { STREAMABLE_HTTP_ENDPOINT } from '../../constants.js';
import { ServerManager } from '../../serverManager.js';
import tagsExtractor from '../tagsExtractor.js';

export function setupStreamableHttpRoutes(
  app: express.Application,
  serverManager: ServerManager,
  authMiddleware: express.RequestHandler,
): void {
  app.post(
    STREAMABLE_HTTP_ENDPOINT,
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
            logger.info('transport closed', transport.sessionId);
          };
        } else {
          const existingTransport = serverManager.getTransport(sessionId);
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

  app.get(STREAMABLE_HTTP_ENDPOINT, authMiddleware, async (req: express.Request, res: express.Response) => {
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
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('Streamable HTTP error:', error);
      res.status(500).end();
    }
  });

  app.delete(STREAMABLE_HTTP_ENDPOINT, authMiddleware, async (req: express.Request, res: express.Response) => {
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
      await transport.handleRequest(req, res);
    } catch (error) {
      logger.error('Streamable HTTP error:', error);
      res.status(500).end();
    }
  });
}
