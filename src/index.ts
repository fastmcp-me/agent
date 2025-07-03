#!/usr/bin/env node

import 'source-map-support/register.js';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { setupServer } from './server.js';
import logger, { enableConsoleTransport } from './logger/logger.js';
import configReloadService from './services/configReloadService.js';
import { ServerManager } from './core/server/serverManager.js';
import { ConfigManager } from './config/configManager.js';
import { ExpressServer } from './transport/http/server.js';
import { ServerConfigManager } from './core/server/serverConfig.js';
import { PORT, HOST } from './constants.js';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .env('ONE_MCP') // Enable environment variable parsing with ONE_MCP prefix
  .options({
    transport: {
      alias: 't',
      describe: 'Transport type to use (stdio or http)',
      type: 'string',
      choices: ['stdio', 'http', 'sse'],
      default: 'http',
    },
    port: {
      alias: 'P',
      describe: 'HTTP port to listen on, applicable when transport is http',
      type: 'number',
      default: PORT,
    },
    host: {
      alias: 'H',
      describe: 'HTTP host to listen on, applicable when transport is http',
      type: 'string',
      default: HOST,
    },
    config: {
      alias: 'c',
      describe: 'Path to the config file',
      type: 'string',
      default: undefined,
    },
    tags: {
      alias: 'g',
      describe: 'Tags to filter clients (comma-separated)',
      type: 'string',
      default: undefined,
    },
    pagination: {
      alias: 'p',
      describe: 'Enable pagination',
      type: 'boolean',
      default: false,
    },
    auth: {
      describe: 'Enable authentication (OAuth 2.1)',
      type: 'boolean',
      default: false,
    },
    'session-ttl': {
      describe: 'Session expiry time in minutes',
      type: 'number',
      default: 24 * 60, // 24 hours
    },
    'session-storage-path': {
      describe: 'Custom session storage directory path',
      type: 'string',
      default: undefined,
    },
  })
  .help()
  .alias('help', 'h')
  .parseSync();

/**
 * Set up graceful shutdown handling
 */
function setupGracefulShutdown(serverManager: ServerManager, expressServer?: ExpressServer): void {
  const shutdown = async () => {
    logger.info('Shutting down server...');

    // Stop the configuration reload service
    configReloadService.stop();

    // Shutdown ExpressServer if it exists
    if (expressServer) {
      try {
        expressServer.shutdown();
        logger.info('ExpressServer shutdown complete');
      } catch (error) {
        logger.error(`Error shutting down ExpressServer: ${error}`);
      }
    }

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
    if (argv.transport !== 'stdio') {
      enableConsoleTransport();
    }

    ConfigManager.getInstance(argv.config);

    // Configure server settings from CLI arguments
    const serverConfigManager = ServerConfigManager.getInstance();
    serverConfigManager.updateConfig({
      host: argv.host,
      port: argv.port,
      auth: {
        enabled: argv['auth'],
        sessionTtlMinutes: argv['session-ttl'],
        sessionStoragePath: argv['session-storage-path'],
        oauthCodeTtlMs: 60 * 1000, // 1 minute
        oauthTokenTtlMs: argv['session-ttl'] * 60 * 1000, // Convert minutes to milliseconds
      },
    });

    // Initialize server and get server manager with custom config path if provided
    const serverManager = await setupServer();

    let expressServer: ExpressServer | undefined;

    switch (argv.transport) {
      case 'stdio': {
        // Use stdio transport
        const transport = new StdioServerTransport();
        // Parse and validate tags from CLI if provided
        let tags: string[] | undefined;
        if (argv.tags) {
          tags = argv.tags.split(',').filter((tag) => tag.trim().length > 0);
          if (tags.length === 0) {
            logger.warn('No valid tags provided, ignoring tags parameter');
            tags = undefined;
          }
        }
        await serverManager.connectTransport(transport, 'stdio', { tags, enablePagination: argv.pagination });
        logger.info('Server started with stdio transport');
        break;
      }
      case 'sse': {
        logger.warning('sse option is deprecated, use http instead');
      }
      // eslint-disable-next-line no-fallthrough
      case 'http': {
        // Use HTTP/SSE transport
        expressServer = new ExpressServer(serverManager);
        expressServer.start();
        break;
      }
      default:
        logger.error(`Invalid transport: ${argv.transport}`);
        process.exit(1);
    }

    // Set up graceful shutdown handling
    setupGracefulShutdown(serverManager, expressServer);
  } catch (error) {
    logger.error('Server error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
