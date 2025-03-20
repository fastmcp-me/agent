import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourceTemplatesRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  SetLevelRequestSchema,
  ServerCapabilities,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import logger from '../logger/logger.js';
import { setLogLevel } from '../logger/logger.js';
import { MCP_URI_SEPARATOR, MCP_SERVER_NAME } from '../constants.js';
import { Clients, executeClientOperation } from '../clients/clientManager.js';
import { ProxyError, parseUri, withErrorHandling } from '../utils/errorHandling.js';

/**
 * Sends a partial failure notification to inform clients about backend failures
 * @param server The MCP server instance
 * @param operation The operation that partially failed
 * @param failedClients Array of failed clients with error details
 */
function sendPartialFailureNotification(
  server: Server,
  operation: string,
  failedClients: Array<{ name: string; error: string }>,
): void {
  if (failedClients.length === 0) return;

  server.notification({
    method: 'notifications/message',
    params: {
      level: 'warning',
      message: `Partial failure during ${operation}`,
      logger: MCP_SERVER_NAME,
      data: {
        operation,
        failedClients,
        timestamp: new Date().toISOString(),
      },
    },
  });
}

/**
 * Registers all request handlers based on available capabilities
 * @param clients Record of client instances
 * @param server The MCP server instance
 * @param capabilities The server capabilities
 */
export function registerRequestHandlers(clients: Clients, server: Server, capabilities: ServerCapabilities): void {
  // Register logging level handler
  server.setRequestHandler(SetLevelRequestSchema, async (request) => {
    setLogLevel(request.params.level);
    return {};
  });

  // Register resource-related handlers if capability is available
  if (capabilities.resources) {
    registerResourceHandlers(clients, server);
  }

  // Register tool-related handlers if capability is available
  if (capabilities.tools) {
    registerToolHandlers(clients, server);
  }

  // Register prompt-related handlers if capability is available
  if (capabilities.prompts) {
    registerPromptHandlers(clients, server);
  }
}

/**
 * Registers resource-related request handlers
 * @param clients Record of client instances
 * @param server The MCP server instance
 */
function registerResourceHandlers(clients: Clients, server: Server): void {
  // List Resources handler
  server.setRequestHandler(
    ListResourcesRequestSchema,
    withErrorHandling(async (request) => {
      const resources = [];
      const failedClients = [];

      for (const [name, clientInfo] of Object.entries(clients)) {
        logger.info(`Listing resources for ${name}`);
        try {
          const result = await clientInfo.client.listResources(request.params, {
            timeout: clientInfo.transport.timeout,
          });
          resources.push(
            ...result.resources.map((resource) => ({
              uri: `${name}${MCP_URI_SEPARATOR}${resource.uri}`,
              name: resource.name,
              description: resource.description,
              mimeType: resource.mimeType,
            })),
          );
        } catch (error) {
          logger.error(`Error listing resources for ${name}: ${error}`);
          failedClients.push({ name, error: error instanceof Error ? error.message : String(error) });
        }
      }

      // If all clients failed, throw an error
      if (failedClients.length === Object.keys(clients).length && Object.keys(clients).length > 0) {
        throw new ProxyError('Failed to list resources from all clients', new Error(JSON.stringify(failedClients)));
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(server, 'listResources', failedClients);
      }

      return { resources };
    }, 'Error listing resources'),
  );

  // List Resource Templates handler
  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    withErrorHandling(async (request) => {
      const resourceTemplates = [];
      const failedClients = [];

      for (const [name, clientInfo] of Object.entries(clients)) {
        logger.info(`Listing resource templates for ${name}`);
        try {
          const result = await clientInfo.client.listResourceTemplates(request.params, {
            timeout: clientInfo.transport.timeout,
          });
          resourceTemplates.push(
            ...result.resourceTemplates.map((template) => ({
              uriTemplate: `${name}${MCP_URI_SEPARATOR}${template.uriTemplate}`,
              name: template.name,
              description: template.description,
              mimeType: template.mimeType,
            })),
          );
        } catch (error) {
          logger.error(`Error listing resource templates for ${name}: ${error}`);
          failedClients.push({ name, error: error instanceof Error ? error.message : String(error) });
        }
      }

      // If all clients failed, throw an error
      if (failedClients.length === Object.keys(clients).length && Object.keys(clients).length > 0) {
        throw new ProxyError(
          'Failed to list resource templates from all clients',
          new Error(JSON.stringify(failedClients)),
        );
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(server, 'listResourceTemplates', failedClients);
      }

      return { resourceTemplates };
    }, 'Error listing resource templates'),
  );

  // Subscribe Resource handler
  server.setRequestHandler(
    SubscribeRequestSchema,
    withErrorHandling(async (request) => {
      const { clientName, resourceName } = parseUri(request.params.uri, MCP_URI_SEPARATOR);
      return executeClientOperation(clients, clientName, (clientInfo) =>
        clientInfo.client.subscribeResource(
          { ...request.params, uri: resourceName },
          {
            timeout: clientInfo.transport.timeout,
          },
        ),
      );
    }, 'Error subscribing to resource'),
  );

  // Unsubscribe Resource handler
  server.setRequestHandler(
    UnsubscribeRequestSchema,
    withErrorHandling(async (request) => {
      const { clientName, resourceName } = parseUri(request.params.uri, MCP_URI_SEPARATOR);
      return executeClientOperation(clients, clientName, (clientInfo) =>
        clientInfo.client.unsubscribeResource(
          { ...request.params, uri: resourceName },
          {
            timeout: clientInfo.transport.timeout,
          },
        ),
      );
    }, 'Error unsubscribing from resource'),
  );

  // Read Resource handler
  server.setRequestHandler(
    ReadResourceRequestSchema,
    withErrorHandling(async (request) => {
      const { clientName, resourceName } = parseUri(request.params.uri, MCP_URI_SEPARATOR);
      return executeClientOperation(clients, clientName, (clientInfo) =>
        clientInfo.client.readResource(
          { ...request.params, uri: resourceName },
          {
            timeout: clientInfo.transport.timeout,
          },
        ),
      );
    }, 'Error reading resource'),
  );
}

/**
 * Registers tool-related request handlers
 * @param clients Record of client instances
 * @param server The MCP server instance
 */
function registerToolHandlers(clients: Clients, server: Server): void {
  // List Tools handler
  server.setRequestHandler(
    ListToolsRequestSchema,
    withErrorHandling(async (request) => {
      const tools = [];
      const failedClients = [];

      for (const [name, clientInfo] of Object.entries(clients)) {
        logger.info(`Listing tools for ${name}`);
        try {
          const result = await clientInfo.client.listTools(request.params, {
            timeout: clientInfo.transport.timeout,
          });
          tools.push(
            ...result.tools.map((tool) => ({
              name: `${name}${MCP_URI_SEPARATOR}${tool.name}`,
              description: tool.description,
              inputSchema: tool.inputSchema,
            })),
          );
        } catch (error) {
          logger.error(`Error listing tools for ${name}: ${error}`);
          failedClients.push({ name, error: error instanceof Error ? error.message : String(error) });
        }
      }

      // If all clients failed, throw an error
      if (failedClients.length === Object.keys(clients).length && Object.keys(clients).length > 0) {
        throw new ProxyError('Failed to list tools from all clients', new Error(JSON.stringify(failedClients)));
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(server, 'listTools', failedClients);
      }

      return { tools };
    }, 'Error listing tools'),
  );

  // Call Tool handler
  server.setRequestHandler(
    CallToolRequestSchema,
    withErrorHandling(async (request) => {
      const { clientName, resourceName: toolName } = parseUri(request.params.name, MCP_URI_SEPARATOR);
      return executeClientOperation(clients, clientName, (clientInfo) =>
        clientInfo.client.callTool({ ...request.params, name: toolName }, CallToolResultSchema, {
          timeout: clientInfo.transport.timeout,
        }),
      );
    }, 'Error calling tool'),
  );
}

/**
 * Registers prompt-related request handlers
 * @param clients Record of client instances
 * @param server The MCP server instance
 */
function registerPromptHandlers(clients: Clients, server: Server): void {
  // List Prompts handler
  server.setRequestHandler(
    ListPromptsRequestSchema,
    withErrorHandling(async (request) => {
      const prompts = [];
      const failedClients = [];

      for (const [name, clientInfo] of Object.entries(clients)) {
        logger.info(`Listing prompts for ${name}`);
        try {
          const result = await clientInfo.client.listPrompts(request.params);
          prompts.push(
            ...result.prompts.map((prompt) => ({
              name: `${name}${MCP_URI_SEPARATOR}${prompt.name}`,
              description: prompt.description,
              arguments: prompt.arguments,
            })),
          );
        } catch (error) {
          logger.error(`Error listing prompts for ${name}: ${error}`);
          failedClients.push({ name, error: error instanceof Error ? error.message : String(error) });
        }
      }

      // If all clients failed, throw an error
      if (failedClients.length === Object.keys(clients).length && Object.keys(clients).length > 0) {
        throw new ProxyError('Failed to list prompts from all clients', new Error(JSON.stringify(failedClients)));
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(server, 'listPrompts', failedClients);
      }

      return { prompts };
    }, 'Error listing prompts'),
  );

  // Get Prompt handler
  server.setRequestHandler(
    GetPromptRequestSchema,
    withErrorHandling(async (request) => {
      const { clientName, resourceName: promptName } = parseUri(request.params.name, MCP_URI_SEPARATOR);
      return executeClientOperation(clients, clientName, (clientInfo) =>
        clientInfo.client.getPrompt({ ...request.params, name: promptName }),
      );
    }, 'Error getting prompt'),
  );
}
