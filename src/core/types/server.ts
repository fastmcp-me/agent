import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

export interface ServerInfoExtra {
  readonly tags?: string[];
  readonly enablePagination?: boolean;
}

/**
 * Server information including tags
 */
export interface ServerInfo extends ServerInfoExtra {
  readonly server: Server;
}

export type ServerCapability = keyof ServerCapabilities;
