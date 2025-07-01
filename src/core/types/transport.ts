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
 * Base interface for common transport properties
 */
export interface BaseTransportConfig {
  readonly timeout?: number;
  readonly disabled?: boolean;
  readonly tags?: string[];
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
 * Zod schema for transport configuration
 */
export const transportConfigSchema = z.object({
  type: z.enum(['stdio', 'sse', 'http', 'streamableHttp']).optional(),
  disabled: z.boolean().optional(),
  timeout: z.number().optional(),
  tags: z.array(z.string()).optional(),

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
