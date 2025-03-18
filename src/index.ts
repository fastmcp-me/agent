#!/usr/bin/env node

import express from 'express';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { setupServer } from './server.js';
import logger, { setMCPTransportConnected } from './logger.js';
import { PORT, SSE_ENDPOINT, MESSAGES_ENDPOINT, ERROR_CODES } from './constants.js';
import configReloadService from './services/configReloadService.js';
import { ServerManager } from './serverManager.js';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .options({
    transport: {
      alias: 't',
      describe: 'Transport type to use (stdio or sse)',
      type: 'string',
      choices: ['stdio', 'sse'],
      default: 'sse',
    },
  })
  .help()
  .alias('help', 'h')
  .parseSync();

const app = express();
let serverManager: ServerManager;

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

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

    // Connect the transport using the server manager
    await serverManager.connectTransport(transport, transport.sessionId);

    // Update MCP transport connection status when a client connects
    if (serverManager.getActiveTransportsCount() === 1) {
      setMCPTransportConnected(true);
      logger.info('First client connected, enabling MCP logging transport');
    }

    transport.onclose = () => {
      serverManager.disconnectTransport(transport.sessionId);
      logger.info('transport closed', transport.sessionId);

      // Update MCP transport connection status when all clients disconnect
      if (serverManager.getActiveTransportsCount() === 0) {
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
    const transport = serverManager.getTransport(sessionId);
    if (transport instanceof SSEServerTransport) {
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
    for (const [sessionId, transport] of serverManager.getTransports().entries()) {
      try {
        transport?.close();
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
  try {
    // Set up graceful shutdown handling
    setupGracefulShutdown();

    // Initialize server and get server manager
    const manager = await setupServer();
    serverManager = manager;

    if (argv.transport === 'stdio') {
      // Use stdio transport
      const transport = new StdioServerTransport();
      await serverManager.connectTransport(transport, 'stdio');
      logger.info('Server started with stdio transport');
    } else {
      // Use HTTP/SSE transport
      app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT} with HTTP/SSE transport`);
      });
    }
  } catch (error) {
    logger.error('Server error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
