#!/usr/bin/env node

import express from 'express';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { server } from './server.js';
import logger, { setMCPTransportConnected } from './logger.js';
import { PORT, SSE_ENDPOINT, MESSAGES_ENDPOINT, ERROR_CODES } from './constants.js';
import configReloadService from './services/configReloadService.js';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .options({
    transport: {
      alias: 't',
      describe: 'Transport type to use (stdio or http)',
      type: 'string',
      choices: ['stdio', 'http'],
      default: 'http',
    },
  })
  .help()
  .alias('help', 'h')
  .parseSync();

const app = express();

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

const transportMap = new Map<string, SSEServerTransport>();

// Add error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error:', err);
  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    },
  });
});

app.get(SSE_ENDPOINT, async (req: express.Request, res: express.Response) => {
  try {
    logger.info('sse', { query: req.query, headers: req.headers });
    const transport = new SSEServerTransport(MESSAGES_ENDPOINT, res);
    await server.connect(transport);
    transportMap.set(transport.sessionId, transport);

    // Update MCP transport connection status when a client connects
    if (transportMap.size === 1) {
      setMCPTransportConnected(true);
      logger.info('First client connected, enabling MCP logging transport');
    }

    transport.onclose = () => {
      transportMap.delete(transport.sessionId);
      logger.info('transport closed', transport.sessionId);

      // Update MCP transport connection status when all clients disconnect
      if (transportMap.size === 0) {
        setMCPTransportConnected(false);
        logger.info('All clients disconnected, disabling MCP logging transport');
      }
    };
  } catch (error) {
    logger.error('SSE connection error:', error);
    res.status(500).end();
  }
});

app.post(MESSAGES_ENDPOINT, async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({
        error: {
          code: ERROR_CODES.INVALID_PARAMS,
          message: 'Invalid params: sessionId is required',
        },
      });
      return;
    }

    logger.info('message', { body: req.body, sessionId });
    const transport = transportMap.get(sessionId);
    if (transport) {
      await transport.handlePostMessage(req, res);
      return;
    }
    res.status(404).json({
      error: {
        code: ERROR_CODES.TRANSPORT_NOT_FOUND,
        message: 'Transport not found',
      },
    });
  } catch (error) {
    logger.error('Message handling error:', error);
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Set up graceful shutdown handling
 */
function setupGracefulShutdown(): void {
  const shutdown = async () => {
    logger.info('Shutting down server...');

    // Stop the configuration reload service
    configReloadService.stop();

    // Close all transports
    for (const [sessionId, transport] of transportMap.entries()) {
      try {
        transport.close();
        logger.info(`Closed transport: ${sessionId}`);
      } catch (error) {
        logger.error(`Error closing transport ${sessionId}: ${error}`);
      }
    }

    logger.info('Server shutdown complete');
    process.exit(0);
  };

  // Handle various signals for graceful shutdown
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);
}

/**
 * Start the server using the specified transport.
 */
async function main() {
  // Set up graceful shutdown handling
  setupGracefulShutdown();

  if (argv.transport === 'stdio') {
    // Use stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Server started with stdio transport');
  } else {
    // Use HTTP/SSE transport
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} with HTTP/SSE transport`);
    });
  }
}

main().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
