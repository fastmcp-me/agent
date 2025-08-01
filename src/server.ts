import { MCP_SERVER_CAPABILITIES, MCP_SERVER_NAME, MCP_SERVER_VERSION } from './constants.js';
import logger from './logger/logger.js';
import { createTransports } from './transport/transportFactory.js';
import { ClientManager } from './core/client/clientManager.js';
import { ServerManager } from './core/server/serverManager.js';
import { McpConfigManager } from './config/mcpConfigManager.js';
import configReloadService from './services/configReloadService.js';
import { McpLoadingManager } from './core/loading/mcpLoadingManager.js';

/**
 * Result of server setup including both sync and async components
 */
export interface ServerSetupResult {
  /** Server manager ready for HTTP transport */
  serverManager: ServerManager;
  /** Loading manager for async MCP server initialization */
  loadingManager: McpLoadingManager;
  /** Promise that resolves when all MCP servers finish loading */
  loadingPromise: Promise<void>;
}

/**
 * Main function to set up the MCP server with async loading
 * Returns immediately with HTTP server ready, MCP servers load in background
 */
async function setupServer(): Promise<ServerSetupResult> {
  try {
    const mcpConfig = McpConfigManager.getInstance().getTransportConfig();

    // Create transports from configuration
    const transports = createTransports(mcpConfig);
    logger.info(`Created ${Object.keys(transports).length} transports`);

    // Initialize client manager without connecting (for async loading)
    const clientManager = ClientManager.getOrCreateInstance();
    const clients = clientManager.initializeClientsAsync(transports);
    logger.info(`Initialized storage for ${Object.keys(transports).length} MCP servers`);

    // Create server manager with empty clients initially
    const serverManager = ServerManager.getOrCreateInstance(
      { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      { capabilities: MCP_SERVER_CAPABILITIES },
      clients,
      transports,
    );

    // Initialize config reload service
    configReloadService.initialize(transports);

    // Create loading manager for async MCP server initialization
    const loadingManager = new McpLoadingManager(clientManager);

    // Start async loading (non-blocking)
    const loadingPromise = loadingManager
      .startAsyncLoading(transports)
      .then(() => {
        logger.info('All MCP servers finished loading (successfully or failed)');
      })
      .catch((error) => {
        logger.error('MCP loading process encountered an error:', error);
      });

    logger.info('Server setup completed - HTTP server ready, MCP servers loading in background');

    return {
      serverManager,
      loadingManager,
      loadingPromise,
    };
  } catch (error) {
    logger.error(`Failed to set up server: ${error}`);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use setupServer() which returns ServerSetupResult
 */
async function setupServerLegacy(): Promise<ServerManager> {
  const result = await setupServer();
  // Wait for loading to complete for legacy behavior
  await result.loadingPromise;
  return result.serverManager;
}

export { setupServer, setupServerLegacy };
