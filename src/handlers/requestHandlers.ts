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
  CallToolResultSchema,
  ListResourcesRequest,
  ListToolsRequest,
  ListPromptsRequest,
  ListResourceTemplatesRequest,
} from '@modelcontextprotocol/sdk/types.js';
import logger, { setLogLevel } from '../logger/logger.js';
import { MCP_URI_SEPARATOR, MCP_SERVER_NAME, ERROR_CODES } from '../constants.js';
import { executeClientOperation } from '../clients/clientManager.js';
import { parseUri, withErrorHandling } from '../utils/errorHandling.js';
import { MCPError } from '../utils/errorTypes.js';
import { filterClients, byCapabilities, byTags } from '../utils/clientFiltering.js';
import { Clients, ServerInfo } from '../types.js';

/**
 * Sends a partial failure notification to inform clients about backend failures
 * @param server The MCP server instance
 * @param operation The operation that partially failed
 * @param failedClients Array of failed clients with error details
 */
function sendPartialFailureNotification(
  serverInfo: ServerInfo,
  operation: string,
  failedClients: Array<{ name: string; error: string }>,
): void {
  if (failedClients.length === 0) return;

  serverInfo.server.notification({
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
 * @param tags Array of tags to filter clients by
 */
export function registerRequestHandlers(clients: Clients, serverInfo: ServerInfo): void {
  // Register logging level handler
  serverInfo.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
    setLogLevel(request.params.level);
    return {};
  });

  // Register resource-related handlers
  registerResourceHandlers(clients, serverInfo);

  // Register tool-related handlers
  registerToolHandlers(clients, serverInfo);

  // Register prompt-related handlers
  registerPromptHandlers(clients, serverInfo);
}

/**
 * Registers resource-related request handlers
 * @param clients Record of client instances
 * @param serverInfo The MCP server instance
 */
function registerResourceHandlers(clients: Clients, serverInfo: ServerInfo): void {
  // List Resources handler
  serverInfo.server.setRequestHandler(
    ListResourcesRequestSchema,
    withErrorHandling(async (request: ListResourcesRequest) => {
      const resources = [];
      const failedClients = [];

      const filteredClients = filterClients(byCapabilities({ resources: {} }), byTags(serverInfo.tags))(clients);

      for (const [name, clientInfo] of Object.entries(filteredClients)) {
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

      // If all capable clients failed, throw an error
      if (failedClients.length === Object.keys(filteredClients).length && Object.keys(filteredClients).length > 0) {
        throw new MCPError('Failed to list resources from all capable clients', ERROR_CODES.INTERNAL_SERVER_ERROR, {
          failedClients,
        });
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(serverInfo, 'listResources', failedClients);
      }

      return { resources };
    }, 'Error listing resources'),
  );

  // List Resource Templates handler
  serverInfo.server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    withErrorHandling(async (request: ListResourceTemplatesRequest) => {
      const resourceTemplates = [];
      const failedClients = [];
      const capableClients = filterClients(byCapabilities({ resources: {} }), byTags(serverInfo.tags))(clients);

      for (const [name, clientInfo] of Object.entries(capableClients)) {
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
      if (failedClients.length === Object.keys(capableClients).length && Object.keys(capableClients).length > 0) {
        throw new MCPError('Failed to list resource templates from all clients', ERROR_CODES.INTERNAL_SERVER_ERROR, {
          failedClients,
        });
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(serverInfo, 'listResourceTemplates', failedClients);
      }

      return { resourceTemplates };
    }, 'Error listing resource templates'),
  );

  // Subscribe Resource handler
  serverInfo.server.setRequestHandler(
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
  serverInfo.server.setRequestHandler(
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
  serverInfo.server.setRequestHandler(
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
 * @param serverInfo The MCP server instance
 */
function registerToolHandlers(clients: Clients, serverInfo: ServerInfo): void {
  // List Tools handler
  serverInfo.server.setRequestHandler(
    ListToolsRequestSchema,
    withErrorHandling(async (request: ListToolsRequest) => {
      const tools = [];
      const failedClients = [];
      const capableClients = filterClients(byCapabilities({ tools: {} }), byTags(serverInfo.tags))(clients);

      for (const [name, clientInfo] of Object.entries(capableClients)) {
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
      if (failedClients.length === Object.keys(capableClients).length && Object.keys(capableClients).length > 0) {
        throw new MCPError('Failed to list tools from all clients', ERROR_CODES.INTERNAL_SERVER_ERROR, {
          failedClients,
        });
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(serverInfo, 'listTools', failedClients);
      }

      return { tools };
    }, 'Error listing tools'),
  );

  // Call Tool handler
  serverInfo.server.setRequestHandler(
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
 * @param serverInfo The MCP server instance
 */
function registerPromptHandlers(clients: Clients, serverInfo: ServerInfo): void {
  // List Prompts handler
  serverInfo.server.setRequestHandler(
    ListPromptsRequestSchema,
    withErrorHandling(async (request: ListPromptsRequest) => {
      const prompts = [];
      const failedClients = [];
      const capableClients = filterClients(byCapabilities({ prompts: {} }), byTags(serverInfo.tags))(clients);

      for (const [name, clientInfo] of Object.entries(capableClients)) {
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
      if (failedClients.length === Object.keys(capableClients).length && Object.keys(capableClients).length > 0) {
        throw new MCPError('Failed to list prompts from all clients', ERROR_CODES.INTERNAL_SERVER_ERROR, {
          failedClients,
        });
      }

      // Send notification about partial failures
      if (failedClients.length > 0) {
        sendPartialFailureNotification(serverInfo, 'listPrompts', failedClients);
      }

      return { prompts };
    }, 'Error listing prompts'),
  );

  // Get Prompt handler
  serverInfo.server.setRequestHandler(
    GetPromptRequestSchema,
    withErrorHandling(async (request) => {
      const { clientName, resourceName: promptName } = parseUri(request.params.name, MCP_URI_SEPARATOR);
      return executeClientOperation(clients, clientName, (clientInfo) =>
        clientInfo.client.getPrompt({ ...request.params, name: promptName }),
      );
    }, 'Error getting prompt'),
  );
}
