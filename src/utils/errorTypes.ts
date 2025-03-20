import { ERROR_CODES } from '../constants.js';

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

export class ClientConnectionError extends MCPError {
  constructor(clientName: string, cause: Error) {
    super(`Failed to connect to client ${clientName}: ${cause.message}`, ERROR_CODES.TRANSPORT_NOT_FOUND, { cause });
    this.name = 'ClientConnectionError';
  }
}

export class ClientNotFoundError extends MCPError {
  constructor(clientName: string) {
    super(`Client not found: ${clientName}`, ERROR_CODES.TRANSPORT_NOT_FOUND);
    this.name = 'ClientNotFoundError';
  }
}

export class ClientOperationError extends MCPError {
  constructor(clientName: string, operation: string, cause: Error, context?: Record<string, unknown>) {
    super(
      `Operation ${operation} failed on client ${clientName}: ${cause.message}`,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      { cause, context },
    );
    this.name = 'ClientOperationError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, validationErrors: any) {
    super(message, ERROR_CODES.INVALID_PARAMS, { validationErrors });
    this.name = 'ValidationError';
  }
}

export class TransportError extends MCPError {
  constructor(transportName: string, cause: Error) {
    super(`Transport error for ${transportName}: ${cause.message}`, ERROR_CODES.CLIENT_CONNECTION_ERROR, { cause });
    this.name = 'TransportError';
  }
}

export class InvalidRequestError extends MCPError {
  constructor(message: string, data?: any) {
    super(message, ERROR_CODES.INVALID_PARAMS, data);
    this.name = 'InvalidRequestError';
  }
}

export type MCPErrorType =
  | ClientConnectionError
  | ClientNotFoundError
  | ClientOperationError
  | ValidationError
  | TransportError
  | InvalidRequestError;
