import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import logger from '../logger/logger.js';

/**
 * Interface for MCP transport configuration
 */
export interface MCPServerParams extends Partial<StdioServerParameters> {
  type?: 'stdio' | 'sse';
  url?: string;
  headers?: Record<string, string>;
  disabled?: boolean;
}

/**
 * Creates transport instances from configuration
 * @returns Record of transport instances
 */
export function createTransports(mcpConfig: Record<string, MCPServerParams>): Record<string, Transport> {
  const transports: Record<string, Transport> = {};

  for (const [name, transport] of Object.entries(mcpConfig)) {
    if (transport.disabled) {
      logger.debug(`Skipping disabled transport: ${name}`);
      continue;
    }

    try {
      // Merge environment variables
      transport.env = {
        ...Object.fromEntries(
          Object.entries(process.env)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
        ...transport.env,
      };

      // Create transport based on type
      if (transport.type === 'sse') {
        if (!transport.url) {
          throw new Error(`URL is required for SSE transport: ${name}`);
        }
        transports[name] = new SSEClientTransport(new URL(transport.url), {
          requestInit: {
            headers: transport.headers,
          },
        });
      } else {
        transports[name] = new StdioClientTransport(transport as StdioServerParameters);
      }

      logger.debug(`Created ${transport.type} transport for ${name}`);
    } catch (error) {
      logger.error(`Failed to create transport for ${name}: ${error}`);
    }
  }

  return transports;
}
