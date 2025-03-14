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
} from '@modelcontextprotocol/sdk/types.js';
import logger from '../logger.js';
import { setLogLevel } from '../logger.js';
import { MCP_URI_SEPARATOR } from '../constants.js';

/**
 * Registers all request handlers based on available capabilities
 * @param clients Record of client instances
 * @param server The MCP server instance
 * @param capabilities The server capabilities
 */
export function registerRequestHandlers(
    clients: Record<string, Client>,
    server: Server,
    capabilities: ServerCapabilities
): void {
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
function registerResourceHandlers(clients: Record<string, Client>, server: Server): void {
    // List Resources handler
    server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
        const resources = [];
        for (const [name, client] of Object.entries(clients)) {
            logger.info(`Listing resources for ${name}`);
            try {
                const result = await client.listResources(request.params);
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
            }
        }
        return { resources };
    });

    // List Resource Templates handler
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) => {
        const resourceTemplates = [];
        for (const [name, client] of Object.entries(clients)) {
            logger.info(`Listing resource templates for ${name}`);
            try {
                const result = await client.listResourceTemplates(request.params);
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
            }
        }
        return { resourceTemplates };
    });

    // Subscribe Resource handler
    server.setRequestHandler(SubscribeRequestSchema, async (request) => {
        const [name, resourceName] = request.params.uri.split(MCP_URI_SEPARATOR);
        const client = clients[name];
        if (!client) {
            throw new Error(`Client not found for ${name}`);
        }
        return client.subscribeResource({ ...request.params, uri: resourceName });
    });

    // Unsubscribe Resource handler
    server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
        const [name, resourceName] = request.params.uri.split(MCP_URI_SEPARATOR);
        const client = clients[name];
        if (!client) {
            throw new Error(`Client not found for ${name}`);
        }
        return client.unsubscribeResource({ ...request.params, uri: resourceName });
    });

    // Read Resource handler
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const [name, resourceName] = request.params.uri.split(MCP_URI_SEPARATOR);
        const client = clients[name];
        if (!client) {
            throw new Error(`Client not found for ${name}`);
        }
        return client.readResource({ ...request.params, uri: resourceName });
    });
}

/**
 * Registers tool-related request handlers
 * @param clients Record of client instances
 * @param server The MCP server instance
 */
function registerToolHandlers(clients: Record<string, Client>, server: Server): void {
    // List Tools handler
    server.setRequestHandler(ListToolsRequestSchema, async (request) => {
        const tools = [];
        for (const [name, client] of Object.entries(clients)) {
            logger.info(`Listing tools for ${name}`);
            try {
                const result = await client.listTools(request.params);
                tools.push(
                    ...result.tools.map((tool) => ({
                        name: `${name}${MCP_URI_SEPARATOR}${tool.name}`,
                        description: tool.description,
                        inputSchema: tool.inputSchema,
                    })),
                );
            } catch (error) {
                logger.error(`Error listing tools for ${name}: ${error}`);
            }
        }
        return { tools };
    });

    // Call Tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const [name, toolName] = request.params.name.split(MCP_URI_SEPARATOR);
        const client = clients[name];
        if (!client) {
            throw new Error(`Client not found for ${name}`);
        }
        return client.callTool({ ...request.params, name: toolName });
    });
}

/**
 * Registers prompt-related request handlers
 * @param clients Record of client instances
 * @param server The MCP server instance
 */
function registerPromptHandlers(clients: Record<string, Client>, server: Server): void {
    // List Prompts handler
    server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
        const prompts = [];
        for (const [name, client] of Object.entries(clients)) {
            logger.info(`Listing prompts for ${name}`);
            try {
                const result = await client.listPrompts(request.params);
                prompts.push(
                    ...result.prompts.map((prompt) => ({
                        name: `${name}${MCP_URI_SEPARATOR}${prompt.name}`,
                        description: prompt.description,
                        arguments: prompt.arguments,
                    })),
                );
            } catch (error) {
                logger.error(`Error listing prompts for ${name}: ${error}`);
            }
        }
        return { prompts };
    });

    // Get Prompt handler
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const [name, promptName] = request.params.name.split(MCP_URI_SEPARATOR);
        const client = clients[name];
        if (!client) {
            throw new Error(`Client not found for ${name}`);
        }
        return client.getPrompt({ ...request.params, name: promptName });
    });
}
