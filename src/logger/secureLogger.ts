import logger from './logger.js';

/**
 * Patterns that indicate sensitive data that should be redacted
 */
const SENSITIVE_PATTERNS = [
  // OAuth related
  /client_secret/gi,
  /client_id/gi,
  /access_token/gi,
  /refresh_token/gi,
  /authorization_code/gi,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,

  // URLs that might contain tokens
  /https?:\/\/[^?\s]*\?[^&\s]*[tT]oken=[^&\s]*/gi,
  /https?:\/\/[^?\s]*\?[^&\s]*[cC]ode=[^&\s]*/gi,

  // Common secret patterns
  /api[_-]?key/gi,
  /secret/gi,
  /password/gi,
  /passwd/gi,
  /auth[_-]?token/gi,
];

/**
 * Keys that should be completely redacted
 */
const SENSITIVE_KEYS = [
  'client_secret',
  'clientSecret',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'authorization_code',
  'authorizationCode',
  'token',
  'secret',
  'password',
  'passwd',
  'apiKey',
  'api_key',
  'authToken',
  'auth_token',
  'bearer',
];

/**
 * Sanitize a string by redacting sensitive information
 */
function sanitizeString(value: string): string {
  let sanitized = value;

  // Apply pattern-based redaction
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

/**
 * Recursively sanitize an object by redacting sensitive keys and values
 */
function sanitizeObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if key should be completely redacted
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }

    return sanitized;
  }

  return obj;
}

/**
 * Sanitize data before logging - handles both strings and objects
 */
export function sanitizeForLogging(data: any): any {
  try {
    return sanitizeObject(data);
  } catch (_error) {
    return '[SANITIZATION_ERROR]';
  }
}

/**
 * Safe logger that automatically sanitizes sensitive data
 */
export const secureLogger = {
  debug: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeString(message);
    if (data) {
      logger.debug(sanitizedMessage, sanitizeForLogging(data));
    } else {
      logger.debug(sanitizedMessage);
    }
  },

  info: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeString(message);
    if (data) {
      logger.info(sanitizedMessage, sanitizeForLogging(data));
    } else {
      logger.info(sanitizedMessage);
    }
  },

  warn: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeString(message);
    if (data) {
      logger.warn(sanitizedMessage, sanitizeForLogging(data));
    } else {
      logger.warn(sanitizedMessage);
    }
  },

  error: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeString(message);
    if (data) {
      logger.error(sanitizedMessage, sanitizeForLogging(data));
    } else {
      logger.error(sanitizedMessage);
    }
  },
};

/**
 * Utility function to redact OAuth server details from lists
 */
export function sanitizeOAuthServerList(servers: string[]): string[] {
  return servers.map((server) => {
    // Only show server name without any sensitive configuration
    const serverName = server.split('|')[0] || server; // Extract just the name part
    return serverName.replace(/[?&](client_id|client_secret|token|code)=[^&]*/gi, '[OAUTH_REDACTED]');
  });
}

/**
 * Utility function to create safe error messages that don't expose sensitive data
 */
export function createSafeErrorMessage(error: string): string {
  return sanitizeString(error)
    .replace(/HTTP \d+.*$/gi, 'HTTP [STATUS_CODE]') // Remove potentially sensitive HTTP response details
    .replace(/server.*responding/gi, 'server connectivity issue'); // Generic server error
}
