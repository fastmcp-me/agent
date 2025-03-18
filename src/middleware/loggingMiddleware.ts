import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger/logger.js';

interface LogContext {
  requestId: string;
  method: string;
  startTime: number;
}

const activeRequests = new Map<string, LogContext>();

/**
 * Logs MCP request details
 */
function logRequest(requestId: string, method: string, params: any): void {
  logger.info('MCP Request', {
    requestId,
    method,
    params: JSON.stringify(params),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Logs MCP response details
 */
function logResponse(requestId: string, result: any, duration: number): void {
  logger.info('MCP Response', {
    requestId,
    duration,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Logs MCP error details
 */
function logError(requestId: string, error: any, duration: number): void {
  logger.error('MCP Error', {
    requestId,
    error: error instanceof Error ? error.message : JSON.stringify(error),
    stack: error instanceof Error ? error.stack : undefined,
    duration,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Logs MCP notification details
 */
function logNotification(method: string, params: any): void {
  logger.info('MCP Notification', {
    method,
    params: JSON.stringify(params),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Wraps the original request handler with logging
 */
function wrapRequestHandler(
  originalHandler: (request: any) => Promise<any>,
  method: string,
): (request: any) => Promise<any> {
  return async (request: any) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Store request context
    activeRequests.set(requestId, {
      requestId,
      method,
      startTime,
    });

    // Log request
    logRequest(requestId, method, request.params);

    try {
      // Execute original handler
      const result = await originalHandler(request);

      // Log response
      const duration = Date.now() - startTime;
      logResponse(requestId, result, duration);

      return result;
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      logError(requestId, error, duration);
      throw error;
    } finally {
      // Clean up request context
      activeRequests.delete(requestId);
    }
  };
}

/**
 * Wraps the original notification handler with logging
 */
function wrapNotificationHandler(
  originalHandler: (notification: any) => Promise<void>,
  method: string,
): (notification: any) => Promise<void> {
  return async (notification: any) => {
    // Log notification
    logNotification(method, notification.params);

    // Execute original handler
    await originalHandler(notification);
  };
}

/**
 * Enhances an MCP server with request/response logging
 */
export function enhanceServerWithLogging(server: Server): void {
  // Store original methods
  const originalSetRequestHandler = server.setRequestHandler.bind(server);
  const originalSetNotificationHandler = server.setNotificationHandler.bind(server);
  const originalNotification = server.notification.bind(server);

  // Override request handler registration
  server.setRequestHandler = (schema: any, handler: any) => {
    return originalSetRequestHandler(schema, wrapRequestHandler(handler, schema.method));
  };

  // Override notification handler registration
  server.setNotificationHandler = (schema: any, handler: any) => {
    return originalSetNotificationHandler(schema, wrapNotificationHandler(handler, schema.method));
  };

  // Override notification sending
  server.notification = (notification: any) => {
    logNotification(notification.method, notification.params);
    return originalNotification(notification);
  };
}
