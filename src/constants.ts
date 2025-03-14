/**
 * Application constants
 */

// Server configuration
export const PORT = 3050;

// API endpoints
export const SSE_ENDPOINT = '/sse';
export const MESSAGES_ENDPOINT = '/messages';

// Error codes
export const ERROR_CODES = {
    INTERNAL_SERVER_ERROR: -32000,
    TRANSPORT_NOT_FOUND: -32001,
    INVALID_PARAMS: -32602,
};

// MCP constants
export const MCP_CONFIG_FILE = 'mcp.json';
export const MCP_SERVER_NAME = '1mcp-agent';
export const MCP_SERVER_VERSION = '0.1.0';
export const MCP_URI_SEPARATOR = '_1mcp_';

// Connection retry settings
export const CONNECTION_RETRY = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 1000,
};
