import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport, SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  StreamableHTTPClientTransport,
  StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ZodError } from 'zod';
import logger from '../logger/logger.js';
import { AuthProviderTransport, transportConfigSchema } from '../core/types/index.js';
import { MCPServerParams } from '../core/types/index.js';
import { SDKOAuthClientProvider } from '../auth/sdkOAuthClientProvider.js';

/**
 * Creates transport instances from configuration
 * @returns Record of transport instances
 */
export function createTransports(config: Record<string, MCPServerParams>): Record<string, AuthProviderTransport> {
  const transports: Record<string, AuthProviderTransport> = {};

  const assignTransport = (
    name: string,
    transport: AuthProviderTransport,
    validatedTransport: typeof transportConfigSchema._type,
  ) => {
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
        if (inferredParams.url.endsWith('mcp')) {
          inferredParams.type = 'http';
          logger.info(`Inferred transport type for ${name} as http/streamableHttp`);
        } else {
          inferredParams.type = 'sse';
          logger.info(`Inferred transport type for ${name} as sse`);
        }
      }
    }

    try {
      const validatedTransport = transportConfigSchema.parse(inferredParams);
      let transport: AuthProviderTransport;

      switch (validatedTransport.type) {
        case 'sse': {
          if (!validatedTransport.url) {
            throw new Error(`URL is required for ${validatedTransport.type} transport: ${name}`);
          }

          // Create transport with OAuth provider if configured
          const sseOptions: SSEClientTransportOptions = {
            requestInit: {
              headers: validatedTransport.headers,
            },
          };

          // Always create OAuth provider with defaults if needed
          const oauthConfig = validatedTransport.oauth || { autoRegister: true };
          logger.info(`Creating OAuth client provider for SSE transport: ${name}`);
          const oauthProvider = new SDKOAuthClientProvider(name, oauthConfig);
          sseOptions.authProvider = oauthProvider;

          transport = new SSEClientTransport(new URL(validatedTransport.url), sseOptions) as AuthProviderTransport;
          transport.oauthProvider = oauthProvider;

          assignTransport(name, transport, validatedTransport);
          break;
        }
        case 'http': // Since sse is deprecated, we can use http as a alias for streamableHttp
        case 'streamableHttp': {
          if (!validatedTransport.url) {
            throw new Error(`URL is required for streamableHttp transport: ${name}`);
          }

          // Create transport with OAuth provider if configured
          const httpOptions: StreamableHTTPClientTransportOptions = {
            requestInit: {
              headers: validatedTransport.headers,
            },
          };

          // Always create OAuth provider with defaults if needed
          const oauthConfig = validatedTransport.oauth || { autoRegister: true };
          logger.info(`Creating OAuth client provider for HTTP transport: ${name}`);
          const oauthProvider = new SDKOAuthClientProvider(name, oauthConfig);
          httpOptions.authProvider = oauthProvider;

          transport = new StreamableHTTPClientTransport(
            new URL(validatedTransport.url),
            httpOptions,
          ) as AuthProviderTransport;
          transport.oauthProvider = oauthProvider;
          assignTransport(name, transport, validatedTransport);
          break;
        }
        case 'stdio': {
          if (!validatedTransport.command) {
            throw new Error(`Command is required for stdio transport: ${name}`);
          }
          transport = new StdioClientTransport(validatedTransport as StdioServerParameters) as AuthProviderTransport;
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
