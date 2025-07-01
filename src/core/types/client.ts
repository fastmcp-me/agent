import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { EnhancedTransport } from './transport.js';

/**
 * Enum representing possible client connection states
 */
export enum ClientStatus {
  /** Client is successfully connected */
  Connected = 'connected',
  /** Client is disconnected */
  Disconnected = 'disconnected',
  /** Client encountered an error */
  Error = 'error',
}

/**
 * Complete client information including transport, status and history
 */
export interface ClientInfo {
  readonly name: string;
  readonly transport: EnhancedTransport;
  readonly client: Client;
  readonly lastError?: Error;
  readonly lastConnected?: Date;
  status: ClientStatus;
  capabilities?: ServerCapabilities;
}

/**
 * Map of client information indexed by client name
 */
export type Clients = Record<string, ClientInfo>;

/**
 * Options for client operations
 */
export interface OperationOptions {
  readonly retryCount?: number;
  readonly retryDelay?: number;
}
