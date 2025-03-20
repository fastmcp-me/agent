import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ZodError } from 'zod';
import logger from '../logger/logger.js';
import { transportConfigSchema } from '../types.js';
import { MCPServerParams, EnhancedTransport } from '../types.js';

/**
 * Creates transport instances from configuration
 * @returns Record of transport instances
 */
export function createTransports(config: Record<string, MCPServerParams>): Record<string, EnhancedTransport> {
  const transports: Record<string, EnhancedTransport> = {};

  for (const [name, params] of Object.entries(config)) {
    if (params.disabled) {
      logger.debug(`Skipping disabled transport: ${name}`);
      continue;
    }

    try {
      const validatedTransport = transportConfigSchema.parse(params);

      if (validatedTransport.type === 'sse' || validatedTransport.type === 'http') {
        if (!validatedTransport.url) {
          throw new Error(`URL is required for SSE transport: ${name}`);
        }
        const transport = new SSEClientTransport(new URL(validatedTransport.url), {
          requestInit: {
            headers: validatedTransport.headers,
          },
        }) as EnhancedTransport;
        transport.timeout = validatedTransport.timeout;
        transport.tags = validatedTransport.tags;
        transports[name] = transport;
      } else {
        if (!validatedTransport.command) {
          throw new Error(`Command is required for stdio transport: ${name}`);
        }
        const transport = new StdioClientTransport(validatedTransport as StdioServerParameters) as EnhancedTransport;
        transport.timeout = validatedTransport.timeout;
        transport.tags = validatedTransport.tags;
        transports[name] = transport;
      }

      logger.debug(`Created transport: ${name}`);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error(`Invalid transport configuration for ${name}:`, error.errors);
      } else {
        logger.error(`Error creating transport ${name}:`, error);
      }
      throw error;
    }
  }

  return transports;
}
