import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
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

  const assignTransport = (name: string, transport: EnhancedTransport, validatedTransport: any) => {
    transport.timeout = validatedTransport.timeout;
    transport.tags = validatedTransport.tags;
    transports[name] = transport;
  };

  for (const [name, params] of Object.entries(config)) {
    if (params.disabled) {
      logger.debug(`Skipping disabled transport: ${name}`);
      continue;
    }

    // Infer type if missing
    let inferredParams = { ...params };
    if (!inferredParams.type) {
      logger.warn(`Transport type is missing for ${name}, inferring type...`);
      if (inferredParams.command) {
        inferredParams.type = 'stdio';
        logger.info(`Inferred transport type for ${name} as stdio`);
      } else if (inferredParams.url) {
        inferredParams.type = 'http';
        logger.info(`Inferred transport type for ${name} as http/streamableHttp`);
      }
    }

    try {
      const validatedTransport = transportConfigSchema.parse(inferredParams);
      let transport: EnhancedTransport;

      switch (validatedTransport.type) {
        case 'sse': {
          if (!validatedTransport.url) {
            throw new Error(`URL is required for ${validatedTransport.type} transport: ${name}`);
          }
          transport = new SSEClientTransport(new URL(validatedTransport.url), {
            requestInit: {
              headers: validatedTransport.headers,
            },
          }) as EnhancedTransport;
          assignTransport(name, transport, validatedTransport);
          break;
        }
        case 'http': // Since sse is deprecated, we can use http as a alias for streamableHttp
        case 'streamableHttp': {
          if (!validatedTransport.url) {
            throw new Error(`URL is required for streamableHttp transport: ${name}`);
          }
          transport = new StreamableHTTPClientTransport(new URL(validatedTransport.url), {
            requestInit: {
              headers: validatedTransport.headers,
            },
          }) as EnhancedTransport;
          assignTransport(name, transport, validatedTransport);
          break;
        }
        case 'stdio': {
          if (!validatedTransport.command) {
            throw new Error(`Command is required for stdio transport: ${name}`);
          }
          transport = new StdioClientTransport(validatedTransport as StdioServerParameters) as EnhancedTransport;
          assignTransport(name, transport, validatedTransport);
          break;
        }
        default:
          throw new Error(`Invalid transport type: ${validatedTransport.type}`);
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
