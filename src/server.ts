import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './constants.js';
import logger, { addMCPTransport } from './logger.js';
import { createTransports } from './config/transportConfig.js';
import { createClients } from './clients/clientManager.js';
import { collectAndRegisterCapabilities } from './capabilities/capabilityManager.js';
import configReloadService from './services/configReloadService.js';

/**
 * Initialize and configure the MCP server
 * @returns The configured MCP server instance
 */
async function initializeServer(): Promise<Server> {
    try {
        // Create the server instance
        const server = new Server(
            {
                name: MCP_SERVER_NAME,
                version: MCP_SERVER_VERSION,
            },
            {
                capabilities: {
                    logging: {},
                },
            },
        );

        // Initialize the MCP transport for logging
        addMCPTransport(server, MCP_SERVER_NAME);
        logger.info('Server created and MCP transport initialized for logging');

        return server;
    } catch (error) {
        logger.error(`Failed to initialize server: ${error}`);
        throw error;
    }
}

/**
 * Main function to set up the MCP server
 */
async function setupServer(): Promise<Server> {
    try {
        // Initialize the server
        const server = await initializeServer();

        // Create transports from configuration
        const transports = createTransports();
        logger.info(`Created ${Object.keys(transports).length} transports`);

        // Create clients for each transport
        const clients = await createClients(transports);
        logger.info(`Created ${Object.keys(clients).length} clients`);

        // Collect capabilities and register handlers
        await collectAndRegisterCapabilities(clients, server);

        // Initialize the configuration reload service
        configReloadService.initialize(server, transports);
        logger.info('Configuration reload service initialized');

        logger.info('Server setup completed successfully');
        return server;
    } catch (error) {
        logger.error(`Failed to set up server: ${error}`);
        throw error;
    }
}

// Set up the server and export it
const server = await setupServer();

export { server };
