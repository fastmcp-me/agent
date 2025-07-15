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
import { OutboundConnections, InboundConnection, ClientStatus } from '../core/types/index.js';
/**
 * Sets up client-to-server notification handlers
 * @param clients Record of client instances
 * @param serverInfo The MCP server instance
 */
export function setupClientToServerNotifications(clients: OutboundConnections, serverInfo: InboundConnection): void {
  const clientNotificationSchemas = [
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
  ];

  for (const [name, clientInfo] of clients.entries()) {
    clientNotificationSchemas.forEach((schema) => {
      clientInfo.client.setNotificationHandler(
        schema,
        withErrorHandling(async (notification) => {
          logger.info(`Received notification in client: ${name} ${JSON.stringify(notification)}`);

          // Try to send notification, catch connection errors gracefully
          try {
            // Preserve original message structure and only modify params
            const forwardedNotification = {
              method: notification.method,
              params: {
                ...notification.params,
                server: name,
              },
            };
            serverInfo.server.notification(forwardedNotification);
          } catch (error) {
            if (error instanceof Error && error.message.includes('Not connected')) {
              logger.warn(`Server transport not connected. Dropping notification from ${name}`);
            } else {
              logger.error(`Failed to send notification from ${name}: ${error}`);
            }
          }
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
export function setupServerToClientNotifications(clients: OutboundConnections, serverInfo: InboundConnection): void {
  const serverNotificationSchemas = [
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
  ];

  for (const [name, clientInfo] of clients.entries()) {
    serverNotificationSchemas.forEach((schema) => {
      serverInfo.server.setNotificationHandler(
        schema,
        withErrorHandling(async (notification) => {
          logger.info(`Received notification in server: ${name} ${JSON.stringify(notification)}`);
          if (clientInfo.status !== ClientStatus.Connected) {
            logger.warn(`Client ${name} is not connected. Notification not sent.`);
            return;
          }

          // Try to send notification, catch connection errors gracefully
          try {
            // Preserve original message structure and only modify params
            const forwardedNotification = {
              method: notification.method,
              params: {
                ...notification.params,
                client: name,
              },
            };
            clientInfo.client.notification(forwardedNotification);
          } catch (error) {
            if (error instanceof Error && error.message.includes('Not connected')) {
              logger.warn(`Client ${name} transport not connected. Dropping notification.`);
            } else {
              logger.error(`Failed to send notification to ${name}: ${error}`);
            }
          }
        }, `Error handling server notification to ${name}`),
      );
    });
  }
}
