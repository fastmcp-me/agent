import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import logger from '../logger/logger.js';
import { withErrorHandling } from '../utils/errorHandling.js';

/**
 * Sets up client-to-server notification handlers
 * @param clients Record of client instances
 * @param server The MCP server instance
 */
export function setupClientToServerNotifications(clients: Record<string, Client>, server: Server): void {
  const clientNotificationSchemas = [
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
  ];

  for (const [name, client] of Object.entries(clients)) {
    clientNotificationSchemas.forEach((schema) => {
      client.setNotificationHandler(
        schema,
        withErrorHandling(async (notification) => {
          logger.info(`Received notification in client: ${name} ${JSON.stringify(notification)}`);
          server.notification({
            ...notification,
            params: {
              ...notification.params,
              server: name,
            },
          });
        }, `Error handling client notification from ${name}`),
      );
    });
  }
}

/**
 * Sets up server-to-client notification handlers
 * @param clients Record of client instances
 * @param server The MCP server instance
 */
export function setupServerToClientNotifications(clients: Record<string, Client>, server: Server): void {
  const serverNotificationSchemas = [
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
  ];

  for (const [name, client] of Object.entries(clients)) {
    serverNotificationSchemas.forEach((schema) => {
      server.setNotificationHandler(
        schema,
        withErrorHandling(async (notification) => {
          logger.info(`Received notification in server: ${name} ${JSON.stringify(notification)}`);
          client.notification({
            ...notification,
            params: {
              ...notification.params,
              client: name,
            },
          });
        }, `Error handling server notification to ${name}`),
      );
    });
  }
}
