import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import createClient from '../client.js';
import logger from '../logger.js';
import { CONNECTION_RETRY } from '../constants.js';
import { ClientConnectionError, ClientNotFoundError, withErrorHandling } from '../utils/errorHandling.js';

/**
 * Creates client instances for all transports with retry logic
 * @param transports Record of transport instances
 * @returns Record of client instances
 */
export async function createClients(transports: Record<string, Transport>): Promise<Record<string, Client>> {
    const clients: Record<string, Client> = {};

    for (const [name, transport] of Object.entries(transports)) {
        logger.info(`Creating client for ${name}`);
        try {
            const client = await createClient(transport);

            // Connect with retry logic
            await connectWithRetry(client, transport, name);

            clients[name] = client;
            logger.info(`Client created for ${name}`);
        } catch (error) {
            logger.error(`Failed to create client for ${name}: ${error}`);
            // We continue with other clients even if one fails
        }
    }

    return clients;
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
            logger.info(`Successfully connected to ${name}`);
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
export function getClient(clients: Record<string, Client>, clientName: string): Client {
    const client = clients[clientName];
    if (!client) {
        throw new ClientNotFoundError(clientName);
    }
    return client;
}

/**
 * Executes a client operation with error handling
 * @param clients Record of client instances
 * @param clientName The name of the client to use
 * @param operation The operation to execute
 * @returns The result of the operation
 */
export async function executeClientOperation<T>(
    clients: Record<string, Client>,
    clientName: string,
    operation: (client: Client) => Promise<T>
): Promise<T> {
    const client = getClient(clients, clientName);
    return withErrorHandling(
        async () => operation(client),
        `Error executing operation on client ${clientName}`
    )();
}
