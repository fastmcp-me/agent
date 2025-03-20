import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';

/**
 * Zod schema for transport configuration
 */
export const transportConfigSchema = z.object({
  type: z.enum(['stdio', 'sse', 'http']).optional(),
  disabled: z.boolean().optional(),
  timeout: z.number().optional(),
  tags: z.array(z.string()).optional(),

  // SSEServerParameters fields
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),

  // StdioServerParameters fields
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  stderr: z.union([z.string(), z.number()]).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
});

/**
 * Type for transport configuration
 */
export type MCPServerParams = z.infer<typeof transportConfigSchema>;

export type ClientTransport = {
  name: string;
  transport: Transport;
  timeout?: number;
  tags?: string[];
};

export type ClientTransports = Record<string, ClientTransport>;

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
