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
  /** Client is waiting for OAuth authorization */
  AwaitingOAuth = 'awaiting_oauth',
}

/**
 * Complete client information including transport, status and history
 */
export interface ClientInfo {
  readonly name: string;
  readonly transport: EnhancedTransport;
  client: Client;
  lastError?: Error;
  lastConnected?: Date;
  status: ClientStatus;
  capabilities?: ServerCapabilities;
  /** OAuth authorization URL for user to complete authentication */
  authorizationUrl?: string;
  /** When OAuth authorization was initiated */
  oauthStartTime?: Date;
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
