import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

export interface InboundConnectionConfig {
  readonly tags?: string[];
  readonly enablePagination?: boolean;
}

/**
 * Inbound connection information including server instance and configuration
 */
export interface InboundConnection extends InboundConnectionConfig {
  readonly server: Server;
}

export type ServerCapability = keyof ServerCapabilities;
