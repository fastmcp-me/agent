import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { z, ZodError } from 'zod';
import logger from '../logger/logger.js';

/**
 * Zod schema for transport configuration
 */
export const transportConfigSchema = z.object({
  type: z.enum(['stdio', 'sse', 'http']).optional(),
  disabled: z.boolean().optional(),

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
        transports[name] = new SSEClientTransport(new URL(validatedTransport.url), {
          requestInit: {
            headers: validatedTransport.headers,
          },
        });
      } else {
        // For stdio transport, ensure required fields are present
        if (!validatedTransport.command) {
          throw new Error(`Command is required for stdio transport: ${name}`);
        }
        transports[name] = new StdioClientTransport(validatedTransport as StdioServerParameters);
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
