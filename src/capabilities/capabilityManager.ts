import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import logger from '../logger.js';
import {
  setupClientToServerNotifications,
  setupServerToClientNotifications,
} from '../handlers/notificationHandlers.js';
import { registerRequestHandlers } from '../handlers/requestHandlers.js';

/**
 * Collects capabilities from all clients and registers them with the server
 * @param clients Record of client instances
 * @param server The MCP server instance
 * @returns The combined server capabilities
 */
export async function collectAndRegisterCapabilities(
  clients: Record<string, Client>,
  server: Server,
): Promise<ServerCapabilities> {
  // Collect capabilities from all clients
  const capabilities = collectCapabilities(clients);

  // Set up notification handlers
  setupClientToServerNotifications(clients, server);
  setupServerToClientNotifications(clients, server);

  // Register capabilities with the server
  logger.info(`Registering capabilities: ${JSON.stringify(capabilities)}`);
  server.registerCapabilities(capabilities);

  // Register request handlers based on capabilities
  registerRequestHandlers(clients, server, capabilities);

  return capabilities;
}

/**
 * Collects capabilities from all clients
 * @param clients Record of client instances
 * @returns The combined server capabilities
 */
function collectCapabilities(clients: Record<string, Client>): ServerCapabilities {
  let capabilities: ServerCapabilities = {};

  for (const [name, client] of Object.entries(clients)) {
    try {
      const clientCapabilities = client.getServerCapabilities() || {};
      logger.debug(`Capabilities from ${name}: ${JSON.stringify(clientCapabilities)}`);
      capabilities = { ...capabilities, ...clientCapabilities };
    } catch (error) {
      logger.error(`Failed to get capabilities from ${name}: ${error}`);
    }
  }

  return capabilities;
}
