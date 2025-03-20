import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ClientTransport } from './config/transportConfig.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export type ServerInfo = {
  server: Server;
  tags?: string[];
};

export enum ClientStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}

export type ClientInfo = {
  readonly name: string;
  readonly transport: ClientTransport;
  readonly client: Client;
  readonly status: ClientStatus;
  readonly lastError?: Error;
  readonly lastConnected?: Date;
};

export type Clients = Readonly<Record<string, ClientInfo>>;

export type ClientOperationOptions = {
  readonly retryCount?: number;
  readonly retryDelay?: number;
};
