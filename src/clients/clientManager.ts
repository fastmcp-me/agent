import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import createClient from '../client.js';
import logger from '../logger/logger.js';
import { CONNECTION_RETRY, MCP_SERVER_NAME } from '../constants.js';
import { withErrorHandling } from '../utils/errorHandling.js';
import { ClientConnectionError, ClientNotFoundError } from '../utils/errorTypes.js';
import { ClientStatus, ClientInfo, Clients, ClientOperationOptions, ClientTransports } from '../types.js';

/**
 * Creates client instances for all transports with retry logic
 * @param transports Record of transport instances
 * @returns Record of client instances
 */
export async function createClients(transports: ClientTransports): Promise<Clients> {
  const clients: Record<string, ClientInfo> = {};

  for (const [name, transport] of Object.entries(transports)) {
    logger.info(`Creating client for ${name}`);
    try {
      const client = await createClient();

      // Connect with retry logic
      await connectWithRetry(client, transport.transport, name);

      clients[name] = {
        name,
        transport,
        client,
        status: ClientStatus.Connected,
        lastConnected: new Date(),
      };
      logger.info(`Client created for ${name}`);
    } catch (error) {
      logger.error(`Failed to create client for ${name}: ${error}`);
      clients[name] = {
        name,
        transport,
        client: await createClient(),
        status: ClientStatus.Error,
        lastError: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  return Object.freeze(clients);
}

/**
 * Connects a client to its transport with retry logic
 * @param client The client to connect
 * @param transport The transport to connect to
 * @param name The name of the client for logging
 */
async function connectWithRetry(client: Client, transport: Transport, name: string): Promise<void> {
  let retryDelay = CONNECTION_RETRY.INITIAL_DELAY_MS;

  for (let i = 0; i < CONNECTION_RETRY.MAX_ATTEMPTS; i++) {
    try {
      await client.connect(transport);

      const sv = await client.getServerVersion();
      if (sv?.name === MCP_SERVER_NAME) {
        throw new ClientConnectionError(name, new Error('Aborted to prevent circular dependency'));
      }

      logger.info(`Successfully connected to ${name} with server ${sv?.name} version ${sv?.version}`);
      return;
    } catch (error) {
      logger.error(`Failed to connect to ${name}: ${error}`);

      if (i < CONNECTION_RETRY.MAX_ATTEMPTS - 1) {
        logger.info(`Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Exponential backoff
      } else {
        throw new ClientConnectionError(name, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

/**
 * Gets a client by name with error handling
 * @param clients Record of client instances
 * @param clientName The name of the client to get
 * @returns The client instance
 * @throws ClientNotFoundError if the client is not found
 */
export function getClient(clients: Clients, clientName: string): ClientInfo {
  const client = clients[clientName];
  if (!client) {
    throw new ClientNotFoundError(clientName);
  }
  return client;
}

/**
 * Executes a client operation with error handling and timeout
 * @param clients Record of client instances
 * @param clientName The name of the client to use
 * @param operation The operation to execute
 * @param options Operation options including timeout and retry settings
 * @returns The result of the operation
 */
export async function executeClientOperation<T>(
  clients: Clients,
  clientName: string,
  operation: (clientInfo: ClientInfo) => Promise<T>,
  options: ClientOperationOptions = {},
): Promise<T> {
  const clientInfo = getClient(clients, clientName);
  const { retryCount = 0, retryDelay = 1000 } = options;

  return withErrorHandling(async () => {
    let lastError: Error | undefined;
    for (let i = 0; i <= retryCount; i++) {
      try {
        return await operation(clientInfo);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < retryCount) {
          logger.info(`Retrying operation ${operation.name} on client ${clientName} after ${retryDelay}ms`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }
    throw lastError;
  }, `Error executing operation on client ${clientName}`)();
}
