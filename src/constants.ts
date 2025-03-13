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
