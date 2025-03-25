import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import createClient from '../client.js';
import logger from '../logger/logger.js';
import { CONNECTION_RETRY, MCP_SERVER_NAME, ERROR_CODES } from '../constants.js';
import { ClientConnectionError, ClientNotFoundError, MCPError } from '../utils/errorTypes.js';
import { ClientStatus, ClientInfo, Clients, OperationOptions, ServerInfo } from '../types.js';

/**
 * Creates client instances for all transports with retry logic
 * @param transports Record of transport instances
 * @returns Record of client instances
 */
export async function createClients(transports: Record<string, Transport>): Promise<Clients> {
  const clients: Record<string, ClientInfo> = {};

  for (const [name, transport] of Object.entries(transports)) {
    logger.info(`Creating client for ${name}`);
    try {
      const client = await createClient();

      // Connect with retry logic
      await connectWithRetry(client, transport, name);

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
 * Executes an operation with error handling and retry logic
 * @param operation The operation to execute
 * @param context The execution context (client info or server info)
 * @param options Operation options including timeout and retry settings
 * @returns The result of the operation
 */
export async function executeOperation<T>(
  operation: () => Promise<T>,
  contextName: string,
  options: OperationOptions = {},
): Promise<T> {
  const { retryCount = 0, retryDelay = 1000 } = options;

  let lastError: Error | undefined;
  for (let i = 0; i <= retryCount; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retryCount) {
        logger.info(`Retrying operation ${operation.name} on ${contextName} after ${retryDelay}ms`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // If we get here, we've exhausted all retries
  logger.error(`Operation failed on ${contextName} after ${retryCount + 1} attempts: ${lastError}`);

  if (lastError instanceof MCPError) {
    throw lastError;
  }

  const mcpError = new MCPError(`Error executing operation on ${contextName}`, ERROR_CODES.INTERNAL_SERVER_ERROR, {
    originalError: lastError,
  });
  throw mcpError;
}

/**
 * Executes a client operation with error handling and retry logic
 * @param clients Record of client instances
 * @param clientName The name of the client to use
 * @param operation The operation to execute
 * @param options Operation options including timeout and retry settings
 */
export async function executeClientOperation<T>(
  clients: Clients,
  clientName: string,
  operation: (clientInfo: ClientInfo) => Promise<T>,
  options: OperationOptions = {},
): Promise<T> {
  const clientInfo = getClient(clients, clientName);
  return executeOperation(() => operation(clientInfo), `client ${clientName}`, options);
}

/**
 * Executes a server operation with error handling and retry logic
 * @param server The server to execute the operation on
 * @param operation The operation to execute
 * @param options Operation options including timeout and retry settings
 */
export async function executeServerOperation<T>(
  server: ServerInfo,
  operation: (server: ServerInfo) => Promise<T>,
  options: OperationOptions = {},
): Promise<T> {
  return executeOperation(() => operation(server), 'server', options);
}
