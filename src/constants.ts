/**
 * Application constants
 */

import { ClientCapabilities, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

// Server configuration
export const PORT = 3050;
export const HOST = '127.0.0.1';

// API endpoints
export const SSE_ENDPOINT = '/sse';
export const MESSAGES_ENDPOINT = '/messages';
export const STREAMABLE_HTTP_ENDPOINT = '/mcp';

// MCP constants
export const MCP_CONFIG_FILE = 'mcp.json';
export const MCP_SERVER_NAME = '1mcp';
export const MCP_SERVER_VERSION = '0.12.0';

export const MCP_URI_SEPARATOR = '_1mcp_';

// Global config paths
export const CONFIG_DIR_NAME = '1mcp';
export const DEFAULT_CONFIG = {
  mcpServers: {},
};

/**
 * Get the global config directory path based on OS
 */
export function getGlobalConfigDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    throw new Error('Could not determine home directory');
  }

  const configDir =
    process.platform === 'darwin' || process.platform === 'linux'
      ? `${homeDir}/.config/${CONFIG_DIR_NAME}`
      : `${homeDir}/AppData/Roaming/${CONFIG_DIR_NAME}`;

  return configDir;
}

/**
 * Get the global config file path
 */
export function getGlobalConfigPath(): string {
  return `${getGlobalConfigDir()}/${MCP_CONFIG_FILE}`;
}

// Connection retry settings
export const CONNECTION_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
};

// Authentication and session settings
export const AUTH_CONFIG = {
  DEFAULT_ENABLED: false,
  DEFAULT_SESSION_TTL_MINUTES: 24 * 60, // 24 hours
  DEFAULT_OAUTH_CODE_TTL_MS: 60 * 1000, // 1 minute
  DEFAULT_OAUTH_TOKEN_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  SESSION_STORAGE_DIR: 'sessions',
  SESSION_FILE_PREFIX: 'session_',
  SESSION_FILE_EXTENSION: '.json',
  // Identifier prefixes for easy distinction
  PREFIXES: {
    SESSION_ID: 'sess-',
    ACCESS_TOKEN: 'tk-',
    AUTH_CODE: 'code-',
    CLIENT_ID: 'client-',
  },
};

// Rate limiting configuration for OAuth endpoints
export const RATE_LIMIT_CONFIG = {
  OAUTH: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX: 10, // max requests per window per IP
    MESSAGE: { error: 'Too many requests, please try again later.' },
  },
};

export const MCP_SERVER_CAPABILITIES: ServerCapabilities = {
  completions: {},
  resources: {
    listChanged: false,
  },
  tools: {
    listChanged: false,
  },
  prompts: {
    listChanged: false,
  },
  logging: {},
};

export const MCP_CLIENT_CAPABILITIES: ClientCapabilities = {
  roots: {
    listChanged: false,
  },
  sampling: {
    listChanged: false,
  },
  elicitation: {
    listChanged: false,
  },
};
