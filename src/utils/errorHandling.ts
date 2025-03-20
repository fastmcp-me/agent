import { ERROR_CODES } from '../constants.js';
import logger from '../logger/logger.js';
import { MCPError, MCPErrorType, InvalidRequestError } from './errorTypes.js';

/**
 * Wraps a function with error handling
 * @param fn The function to wrap
 * @param errorMessage The error message to use if the function fails
 * @returns The wrapped function
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

      // Convert other errors to MCPError
      throw new MCPError(errorMessage, ERROR_CODES.INTERNAL_SERVER_ERROR, {
        originalError: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };
}

/**
 * Normalizes an error to an MCPError type
 * @param error The error to normalize
 * @param errorMessage The error message to use if the error is not an MCPError
 * @returns The normalized error
 */
export function normalizeError(error: unknown, errorMessage: string): MCPErrorType {
  if (error instanceof MCPError) {
    return error;
  }

  if (error instanceof Error) {
    return new MCPError(error.message || errorMessage, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  return new MCPError(errorMessage, ERROR_CODES.INTERNAL_SERVER_ERROR);
}

/**
 * Checks if an error is a specific MCPError type
 * @param error The error to check
 * @param errorType The error type to check against
 * @returns True if the error is of the specified type
 */
export function isMCPError<T extends MCPError>(error: unknown, errorType: new (...args: any[]) => T): error is T {
  return error instanceof errorType;
}

/**
 * Gets the error code from an error
 * @param error The error to get the code from
 * @returns The error code
 */
export function getErrorCode(error: unknown): number {
  if (error instanceof MCPError) {
    return error.code;
  }
  return ERROR_CODES.INTERNAL_SERVER_ERROR;
}

/**
 * Gets the error message from an error
 * @param error The error to get the message from
 * @returns The error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Gets the error cause from an error
 * @param error The error to get the cause from
 * @returns The error cause
 */
export function getErrorCause(error: unknown): Error | undefined {
  if (error instanceof Error && 'cause' in error) {
    return error.cause as Error;
  }
  return undefined;
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
