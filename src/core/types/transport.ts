import { z } from 'zod';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

/**
 * Enhanced transport interface that includes MCP-specific properties
 */
export interface EnhancedTransport extends Transport {
  timeout?: number;
  tags?: string[];
}

/**
 * OAuth client configuration for connecting to downstream MCP servers
 */
export interface OAuthConfig {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly scopes?: string[];
  readonly autoRegister?: boolean;
  readonly redirectUrl?: string;
}

/**
 * Base interface for common transport properties
 */
export interface BaseTransportConfig {
  readonly timeout?: number;
  readonly disabled?: boolean;
  readonly tags?: string[];
  readonly oauth?: OAuthConfig;
}

/**
 * Common configuration for HTTP-based transports (HTTP and SSE)
 */
export interface HTTPBasedTransportConfig extends BaseTransportConfig {
  readonly type: 'http' | 'sse';
  readonly url: string;
  readonly headers?: Record<string, string>;
}

/**
 * Stdio transport specific configuration
 */
export interface StdioTransportConfig extends BaseTransportConfig {
  readonly type: 'stdio';
  readonly command: string;
  readonly args?: string[];
  readonly stderr?: string | number;
  readonly cwd?: string;
  readonly env?: Record<string, string>;
}

/**
 * Zod schema for OAuth configuration
 */
export const oAuthConfigSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  autoRegister: z.boolean().optional(),
});

/**
 * Zod schema for transport configuration
 */
export const transportConfigSchema = z.object({
  type: z.enum(['stdio', 'sse', 'http', 'streamableHttp']).optional(),
  disabled: z.boolean().optional(),
  timeout: z.number().optional(),
  tags: z.array(z.string()).optional(),
  oauth: oAuthConfigSchema.optional(),

  // HTTP/SSE Parameters
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
 * Union type for all transport configurations
 */
export type TransportConfig = HTTPBasedTransportConfig | StdioTransportConfig;

/**
 * Type for MCP server parameters derived from transport config schema
 */
export type MCPServerParams = z.infer<typeof transportConfigSchema>;
