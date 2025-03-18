import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './constants.js';
import logger from './logger.js';
import { createTransports } from './config/transportConfig.js';
import { createClients } from './clients/clientManager.js';
import { ServerManager } from './serverManager.js';

/**
 * Main function to set up the MCP server
 */
async function setupServer(): Promise<ServerManager> {
  try {
    // Create transports from configuration
    const transports = createTransports();
    logger.info(`Created ${Object.keys(transports).length} transports`);

    // Create clients for each transport
    const clients = await createClients(transports);
    logger.info(`Created ${Object.keys(clients).length} clients`);

    const serverManager = ServerManager.getInstance(
      { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      { capabilities: { logging: {} } },
      clients,
      transports,
    );

    logger.info('Server setup completed successfully');
    return serverManager;
  } catch (error) {
    logger.error(`Failed to set up server: ${error}`);
    throw error;
  }
}

export { setupServer };
