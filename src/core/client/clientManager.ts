import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import createClient from './clientFactory.js';
import logger from '../../logger/logger.js';
import { CONNECTION_RETRY, MCP_SERVER_NAME } from '../../constants.js';
import { ClientConnectionError, ClientNotFoundError, MCPError, CapabilityError } from '../../utils/errorTypes.js';
import {
  ClientStatus,
  ClientInfo,
  Clients,
  OperationOptions,
  ServerInfo,
  ServerCapability,
  AuthProviderTransport,
} from '../types/index.js';
import { ServerConfigManager } from '../server/serverConfig.js';

/**
 * Creates client instances for all transports with retry logic
 * @param transports Record of transport instances
 * @returns Record of client instances
 */
export async function createClients(transports: Record<string, AuthProviderTransport>): Promise<Clients> {
  const clients = new Map<string, ClientInfo>();

  for (const [name, transport] of Object.entries(transports)) {
    logger.info(`Creating client for ${name}`);
    try {
      const client = await createClient();

      // Connect with retry logic
      const connectedClient = await connectWithRetry(client, transport, name);

      clients.set(name, {
        name,
        transport,
        client: connectedClient,
        status: ClientStatus.Connected,
        lastConnected: new Date(),
      });
      logger.info(`Client created for ${name}`);

      connectedClient.onclose = () => {
        const clientInfo = clients.get(name);
        if (clientInfo) {
          clientInfo.status = ClientStatus.Disconnected;
        }
        logger.info(`Client ${name} disconnected`);
      };
    } catch (error) {
      if (error instanceof OAuthRequiredError) {
        // Handle OAuth required - set client to AwaitingOAuth status
        logger.info(`OAuth authorization required for ${name}`);

        // Try to get authorization URL from OAuth provider
        let authorizationUrl: string | undefined;
        try {
          // Extract OAuth provider from transport if available
          const oauthProvider = transport.oauthProvider;
          if (oauthProvider && typeof oauthProvider.getAuthorizationUrl === 'function') {
            authorizationUrl = oauthProvider.getAuthorizationUrl();
          }
        } catch (urlError) {
          logger.warn(`Could not extract authorization URL for ${name}:`, urlError);
        }

        clients.set(name, {
          name,
          transport,
          client: error.client,
          status: ClientStatus.AwaitingOAuth,
          authorizationUrl,
          oauthStartTime: new Date(),
        });
      } else {
        logger.error(`Failed to create client for ${name}: ${error}`);
        clients.set(name, {
          name,
          transport,
          client: await createClient(),
          status: ClientStatus.Error,
          lastError: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }

  return clients;
}

/**
 * Connects a client to its transport with retry logic and OAuth support
 * @param client The client to connect
 * @param transport The transport to connect to
 * @param name The name of the client for logging
 * @returns The connected client (may be a new instance after retries)
 */
async function connectWithRetry(client: Client, transport: Transport, name: string): Promise<Client> {
  let retryDelay = CONNECTION_RETRY.INITIAL_DELAY_MS;
  let currentClient = client;

  for (let i = 0; i < CONNECTION_RETRY.MAX_ATTEMPTS; i++) {
    try {
      await currentClient.connect(transport);

      const sv = await currentClient.getServerVersion();
      if (sv?.name === MCP_SERVER_NAME) {
        throw new ClientConnectionError(name, new Error('Aborted to prevent circular dependency'));
      }

      logger.info(`Successfully connected to ${name} with server ${sv?.name} version ${sv?.version}`);
      return currentClient;
    } catch (error) {
      // Handle OAuth authorization flow (managed by SDK)
      if (error instanceof UnauthorizedError) {
        const serverConfig = ServerConfigManager.getInstance().getConfig();
        logger.info(
          `OAuth authorization required for ${name}. Visit http://localhost:${serverConfig.port}/oauth to authorize`,
        );

        // Throw special error that includes OAuth info
        throw new OAuthRequiredError(name, currentClient);
      }
      // Handle other connection errors
      else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to connect to ${name}: ${errorMessage}`);

        if (i < CONNECTION_RETRY.MAX_ATTEMPTS - 1) {
          logger.info(`Retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff

          // Create a new client for retry to avoid "already started" errors
          currentClient = await createClient();
        } else {
          throw new ClientConnectionError(name, error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }

  // This should never be reached due to the throw in the else block above
  throw new ClientConnectionError(name, new Error('Max retries exceeded'));
}

// OAuth authorization flow is now handled by the SDK's built-in implementation

/**
 * Gets a client by name with error handling
 * @param clients Record of client instances
 * @param clientName The name of the client to get
 * @returns The client instance
 * @throws ClientNotFoundError if the client is not found
 */
export function getClient(clients: Clients, clientName: string): ClientInfo {
  const client = clients.get(clientName);
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

  const mcpError = new MCPError(`Error executing operation on ${contextName}`, ErrorCode.InternalError, {
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
 * @param requiredCapability The capability required for this operation
 */
export async function executeClientOperation<T>(
  clients: Clients,
  clientName: string,
  operation: (clientInfo: ClientInfo) => Promise<T>,
  options: OperationOptions = {},
  requiredCapability?: ServerCapability,
): Promise<T> {
  const clientInfo = getClient(clients, clientName);

  if (requiredCapability && !clientInfo.capabilities?.[requiredCapability]) {
    throw new CapabilityError(clientName, String(requiredCapability));
  }

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

/**
 * Custom error class for OAuth authorization required
 */
export class OAuthRequiredError extends Error {
  constructor(
    public serverName: string,
    public client: Client,
  ) {
    super(`OAuth authorization required for ${serverName}`);
    this.name = 'OAuthRequiredError';
  }
}
