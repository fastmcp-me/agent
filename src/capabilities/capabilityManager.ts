import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import logger from '../logger/logger.js';
import {
  setupClientToServerNotifications,
  setupServerToClientNotifications,
} from '../handlers/notificationHandlers.js';
import { registerRequestHandlers } from '../handlers/requestHandlers.js';
import { Clients, ServerInfo } from '../types.js';

/**
 * Collects capabilities from all clients and registers them with the server
 * @param clients Record of client instances
 * @param server The MCP server instance
 * @param tags Array of tags to filter clients by
 * @returns The combined server capabilities
 */
export async function setupCapabilities(clients: Clients, serverInfo: ServerInfo): Promise<ServerCapabilities> {
  // Collect capabilities from all clients
  const capabilities = collectCapabilities(clients);

  // Set up notification handlers
  setupClientToServerNotifications(clients, serverInfo);
  setupServerToClientNotifications(clients, serverInfo);

  // Register request handlers based on capabilities
  registerRequestHandlers(clients, serverInfo, capabilities);

  return capabilities;
}

/**
 * Collects capabilities from all clients
 * @param clients Record of client instances
 * @returns The combined server capabilities
 */
function collectCapabilities(clients: Clients): ServerCapabilities {
  let capabilities: ServerCapabilities = {};

  for (const [name, clientInfo] of Object.entries(clients)) {
    try {
      const clientCapabilities = clientInfo.client.getServerCapabilities() || {};
      logger.debug(`Capabilities from ${name}: ${JSON.stringify(clientCapabilities)}`);
      capabilities = { ...capabilities, ...clientCapabilities };
    } catch (error) {
      logger.error(`Failed to get capabilities from ${name}: ${error}`);
    }
  }

  return capabilities;
}
