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
import { Clients, ServerInfo, ClientStatus } from '../types.js';
/**
 * Sets up client-to-server notification handlers
 * @param clients Record of client instances
 * @param serverInfo The MCP server instance
 */
export function setupClientToServerNotifications(clients: Clients, serverInfo: ServerInfo): void {
  const clientNotificationSchemas = [
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
  ];

  for (const [name, clientInfo] of Object.entries(clients)) {
    clientNotificationSchemas.forEach((schema) => {
      clientInfo.client.setNotificationHandler(
        schema,
        withErrorHandling(async (notification) => {
          logger.info(`Received notification in client: ${name} ${JSON.stringify(notification)}`);
          serverInfo.server.notification({
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
 * @param serverInfo The MCP server instance
 */
export function setupServerToClientNotifications(clients: Clients, serverInfo: ServerInfo): void {
  const serverNotificationSchemas = [
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
  ];

  for (const [name, clientInfo] of Object.entries(clients)) {
    serverNotificationSchemas.forEach((schema) => {
      serverInfo.server.setNotificationHandler(
        schema,
        withErrorHandling(async (notification) => {
          logger.info(`Received notification in server: ${name} ${JSON.stringify(notification)}`);
          if (clientInfo.status !== ClientStatus.Connected) {
            logger.warn(`Client ${name} is not connected. Notification not sent.`);
            return;
          }

          clientInfo.client.notification({
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
