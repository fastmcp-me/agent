import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ZodError } from 'zod';
import logger from '../logger/logger.js';
import { transportConfigSchema } from '../types.js';
import { MCPServerParams, ClientTransports } from '../types.js';

/**
 * Creates transport instances from configuration
 * @returns Record of transport instances
 */
export function createTransports(mcpConfig: Record<string, MCPServerParams>): ClientTransports {
  const transports: ClientTransports = {};

  for (const [name, transport] of Object.entries(mcpConfig)) {
    if (transport.disabled) {
      logger.debug(`Skipping disabled transport: ${name}`);
      continue;
    }

    try {
      // Validate transport configuration
      const validatedTransport = transportConfigSchema.parse(transport);

      // Merge environment variables
      validatedTransport.env = {
        ...Object.fromEntries(
          Object.entries(process.env)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
        ...validatedTransport.env,
      };

      // Create transport based on type
      if (validatedTransport.type === 'sse' || validatedTransport.type === 'http') {
        if (!validatedTransport.url) {
          throw new Error(`URL is required for SSE transport: ${name}`);
        }
        transports[name] = {
          name,
          transport: new SSEClientTransport(new URL(validatedTransport.url), {
            requestInit: {
              headers: validatedTransport.headers,
            },
          }),
          timeout: validatedTransport.timeout,
          tags: validatedTransport.tags,
        };
      } else {
        // For stdio transport, ensure required fields are present
        if (!validatedTransport.command) {
          throw new Error(`Command is required for stdio transport: ${name}`);
        }
        transports[name] = {
          name,
          transport: new StdioClientTransport(validatedTransport as StdioServerParameters),
          timeout: validatedTransport.timeout,
          tags: validatedTransport.tags,
        };
      }

      logger.debug(`Created ${validatedTransport.type} transport for ${name}`);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error(`Invalid transport configuration for ${name}:`, error.errors);
      } else if (error instanceof Error) {
        logger.error(`Failed to create transport for ${name}: ${error.message}`);
      } else {
        logger.error(`Failed to create transport for ${name}: ${String(error)}`);
      }
    }
  }

  return transports;
}
