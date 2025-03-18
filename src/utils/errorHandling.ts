import { ERROR_CODES } from '../constants.js';
import logger from '../logger/logger.js';

/**
 * Custom error types for the MCP agent
 */
export class MCPError extends Error {
  code: number;
  data?: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;
  }
}

export class ClientNotFoundError extends MCPError {
  constructor(clientName: string) {
    super(`Client not found: ${clientName}`, ERROR_CODES.TRANSPORT_NOT_FOUND);
    this.name = 'ClientNotFoundError';
  }
}

export class ClientConnectionError extends MCPError {
  constructor(clientName: string, originalError?: Error) {
    super(
      `Failed to connect to client: ${clientName}${originalError ? ` - ${originalError.message}` : ''}`,
      ERROR_CODES.TRANSPORT_NOT_FOUND,
      { originalError },
    );
    this.name = 'ClientConnectionError';
  }
}

export class InvalidRequestError extends MCPError {
  constructor(message: string, data?: any) {
    super(message, ERROR_CODES.INVALID_PARAMS, data);
    this.name = 'InvalidRequestError';
  }
}

export class ProxyError extends MCPError {
  constructor(message: string, originalError?: Error) {
    super(
      message,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      originalError ? { originalError: originalError.message } : undefined,
    );
    this.name = 'ProxyError';
  }
}

/**
 * Handles errors in async functions by wrapping them in a try/catch block
 * @param fn The async function to wrap
 * @param errorMessage The error message to log
 * @returns A wrapped function that handles errors
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  errorMessage: string,
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`${errorMessage}: ${error}`);

      // Rethrow MCPErrors as is
      if (error instanceof MCPError) {
        throw error;
      }

      // Convert other errors to ProxyError
      throw new ProxyError(errorMessage, error instanceof Error ? error : new Error(String(error)));
    }
  };
}

/**
 * Formats an error for JSON-RPC response
 * @param error The error to format
 * @returns A formatted error object
 */
export function formatErrorResponse(error: any): { code: number; message: string; data?: any } {
  if (error instanceof MCPError) {
    return {
      code: error.code,
      message: error.message,
      data: error.data,
    };
  }

  return {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Extracts client name and resource name from a URI
 * @param uri The URI to parse
 * @param separator The separator used in the URI
 * @returns An object with clientName and resourceName
 * @throws InvalidRequestError if the URI is invalid
 */
export function parseUri(uri: string, separator: string): { clientName: string; resourceName: string } {
  const parts = uri.split(separator);

  if (parts.length !== 2) {
    throw new InvalidRequestError(`Invalid URI format: ${uri}`);
  }

  return {
    clientName: parts[0],
    resourceName: parts[1],
  };
}
