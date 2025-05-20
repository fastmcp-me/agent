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
  CreateMessageRequestSchema,
  ListRootsRequestSchema,
  CreateMessageRequest,
  ListRootsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { setLogLevel } from '../logger/logger.js';
import { MCP_URI_SEPARATOR } from '../constants.js';
import { executeClientOperation, executeServerOperation } from '../clients/clientManager.js';
import { parseUri, withErrorHandling } from '../utils/errorHandling.js';
import { filterClients, byCapabilities, byTags } from '../utils/clientFiltering.js';
import { Clients, ServerInfo } from '../types.js';
import { handlePagination } from '../utils/pagination.js';

/**
 * Registers server-specific request handlers
 * @param clients Record of client instances
 * @param serverInfo The MCP server instance
 */
function registerServerRequestHandlers(clients: Clients, serverInfo: ServerInfo): void {
  Object.entries(clients).forEach(([_, clientInfo]) => {
    clientInfo.client.setRequestHandler(
      CreateMessageRequestSchema,
      withErrorHandling(async (request: CreateMessageRequest) => {
        return executeServerOperation(serverInfo, (_server: ServerInfo) =>
          _server.server.createMessage(request.params, {
            timeout: clientInfo.transport.timeout,
          }),
        );
      }, 'Error creating message'),
    );

    clientInfo.client.setRequestHandler(
      ListRootsRequestSchema,
      withErrorHandling(async (request: ListRootsRequest) => {
        return executeServerOperation(serverInfo, (_server: ServerInfo) =>
          _server.server.listRoots(request.params, {
            timeout: clientInfo.transport.timeout,
          }),
        );
      }, 'Error listing roots'),
    );
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

  // Register server-specific request handlers
  registerServerRequestHandlers(clients, serverInfo);
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
      const filteredClients = filterClients(byCapabilities({ resources: {} }), byTags(serverInfo.tags))(clients);

      const result = await handlePagination(
        filteredClients,
        request.params || {},
        (client, params, opts) => client.listResources(params as ListResourcesRequest['params'], opts),
        (clientInfo, result) =>
          result.resources?.map((resource) => ({
            uri: `${clientInfo.name}${MCP_URI_SEPARATOR}${resource.uri}`,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          })) ?? [],
      );

      return {
        resources: result.items,
        nextCursor: result.nextCursor,
      };
    }, 'Error listing resources'),
  );

  // List Resource Templates handler
  serverInfo.server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    withErrorHandling(async (request: ListResourceTemplatesRequest) => {
      const filteredClients = filterClients(byCapabilities({ resources: {} }), byTags(serverInfo.tags))(clients);

      const result = await handlePagination(
        filteredClients,
        request.params || {},
        (client, params, opts) => client.listResourceTemplates(params as ListResourceTemplatesRequest['params'], opts),
        (clientInfo, result) =>
          result.resourceTemplates?.map((template) => ({
            uriTemplate: `${clientInfo.name}${MCP_URI_SEPARATOR}${template.uriTemplate}`,
            name: template.name,
            description: template.description,
            mimeType: template.mimeType,
          })) ?? [],
      );

      return {
        resourceTemplates: result.items,
        nextCursor: result.nextCursor,
      };
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
      const filteredClients = filterClients(byCapabilities({ tools: {} }), byTags(serverInfo.tags))(clients);

      const result = await handlePagination(
        filteredClients,
        request.params || {},
        (client, params, opts) => client.listTools(params as ListToolsRequest['params'], opts),
        (clientInfo, result) =>
          result.tools?.map((tool) => ({
            name: `${clientInfo.name}${MCP_URI_SEPARATOR}${tool.name}`,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })) ?? [],
      );

      return {
        tools: result.items,
        nextCursor: result.nextCursor,
      };
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
      const filteredClients = filterClients(byCapabilities({ prompts: {} }), byTags(serverInfo.tags))(clients);

      const result = await handlePagination(
        filteredClients,
        request.params || {},
        (client, params, opts) => client.listPrompts(params as ListPromptsRequest['params'], opts),
        (clientInfo, result) =>
          result.prompts?.map((prompt) => ({
            name: `${clientInfo.name}${MCP_URI_SEPARATOR}${prompt.name}`,
            description: prompt.description,
            arguments: prompt.arguments,
          })) ?? [],
      );

      return {
        prompts: result.items,
        nextCursor: result.nextCursor,
      };
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
