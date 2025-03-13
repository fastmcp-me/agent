import fs from 'fs';
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
    NotificationSchema,
    ProgressNotificationSchema,
    ServerCapabilities,
    CancelledNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioClientTransport, StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import createClient from './client.js';
import logger from './logger.js';

const transports: Record<string, Transport> = {};

interface MCPTransport extends StdioServerParameters {
    disabled?: boolean;
}

const mcp = JSON.parse(fs.readFileSync('mcp.json', 'utf8')).mcpServers as Record<string, MCPTransport>;

for (const [name, transport] of Object.entries(mcp)) {
    if (transport.disabled) {
        continue;
    }
    transport.env = {
        ...Object.fromEntries(
            Object.entries(process.env)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)]),
        ),
        ...transport.env,
    };
    transports[name] = new StdioClientTransport(transport as StdioServerParameters);
}

const server = new Server(
    {
        name: '1mcp-agent',
        version: '0.1.0',
    },
    {
        capabilities: {},
    },
);

async function createClients(transports: Record<string, Transport>) {
    const clients: Record<string, Client> = {};
    for (const [name, transport] of Object.entries(transports)) {
        logger.info(`Creating client for ${name}`);
        const client = await createClient(transport);

        // retry 3 times
        for (let i = 0; i < 3; i++) {
            try {
                await client.connect(transport);
                break;
            } catch (error) {
                logger.error(`Failed to connect to transport: ${error}`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        clients[name] = client;

        logger.info(`Client created for ${name}`);
    }
    return clients;
}

async function registerCapabilities(clients: Record<string, Client>) {
    let capabilities: ServerCapabilities = {};
    for (const [name, client] of Object.entries(clients)) {
        const clientCapabilities = client.getServerCapabilities() || {};
        capabilities = { ...capabilities, ...clientCapabilities };

        [
            CancelledNotificationSchema,
            ProgressNotificationSchema,
            InitializedNotificationSchema,
            RootsListChangedNotificationSchema,
        ].forEach((schema) => {
            client.setNotificationHandler(schema, async (notification) => {
                logger.info(`Received notification in client: ${name} ${JSON.stringify(notification)}`);
                server.notification(notification);
            });
        });

        [
            CancelledNotificationSchema,
            ProgressNotificationSchema,
            LoggingMessageNotificationSchema,
            ResourceUpdatedNotificationSchema,
            ResourceListChangedNotificationSchema,
            ToolListChangedNotificationSchema,
            PromptListChangedNotificationSchema,
        ].forEach((schema) => {
            server.setNotificationHandler(schema, async (notification) => {
                logger.info(`Received notification in server: ${name} ${JSON.stringify(notification)}`);
                client.notification(notification);
            });
        });
    }

    logger.info(`Registering capabilities: ${JSON.stringify(capabilities)}`);
    server.registerCapabilities(capabilities);

    if (capabilities.resources) {
        server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
            const resources = [];
            for (const [name, client] of Object.entries(clients)) {
                logger.info(`Listing resources for ${name}`);
                try {
                    const result = await client.listResources(request.params);
                    resources.push(
                        ...result.resources.map((resource) => ({
                            uri: `${name}+${resource.uri}`,
                            name: resource.name,
                            description: resource.description,
                            mimeType: resource.mimeType,
                        })),
                    );
                } catch (e) {
                    console.error(`Error listing resources for ${name}: ${e}`);
                }
            }
            return { resources };
        });

        server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) => {
            const resourceTemplates = [];
            for (const [name, client] of Object.entries(clients)) {
                logger.info(`Listing resource templates for ${name}`);
                try {
                    const result = await client.listResourceTemplates(request.params);
                    resourceTemplates.push(
                        ...result.resourceTemplates.map((template) => ({
                            uriTemplate: `${name}+${template.uriTemplate}`,
                            name: template.name,
                            description: template.description,
                            mimeType: template.mimeType,
                        })),
                    );
                } catch (e) {
                    console.error(`Error listing resource templates for ${name}: ${e}`);
                }
            }
            return { resourceTemplates };
        });

        server.setRequestHandler(SubscribeRequestSchema, async (request) => {
            const [name, resourceName] = request.params.uri.split('+');
            const client = clients[name];
            return client.subscribeResource({ ...request.params, uri: resourceName });
        });

        server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
            const [name, resourceName] = request.params.uri.split('+');
            const client = clients[name];
            return client.unsubscribeResource({ ...request.params, uri: resourceName });
        });

        server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const [name, resourceName] = request.params.uri.split('+');
            const client = clients[name];
            return client.readResource({ ...request.params, uri: resourceName });
        });
    }

    if (capabilities.tools) {
        server.setRequestHandler(ListToolsRequestSchema, async (request) => {
            const tools = [];
            for (const [name, client] of Object.entries(clients)) {
                logger.info(`Listing tools for ${name}`);
                try {
                    const result = await client.listTools(request.params);
                    tools.push(
                        ...result.tools.map((tool) => ({
                            name: `${name}/${tool.name}`,
                            description: tool.description,
                            inputSchema: tool.inputSchema,
                        })),
                    );
                } catch (e) {
                    console.error(`Error listing tools for ${name}: ${e}`);
                }
            }
            return { tools };
        });

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const [name, toolName] = request.params.name.split('/');
            const client = clients[name];
            return client.callTool({ ...request.params, name: toolName });
        });
    }

    if (capabilities.prompts) {
        server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
            const prompts = [];
            for (const [name, client] of Object.entries(clients)) {
                logger.info(`Listing prompts for ${name}`);
                try {
                    const result = await client.listPrompts(request.params);
                    prompts.push(
                        ...result.prompts.map((prompt) => ({
                            name: `${name}/${prompt.name}`,
                            description: prompt.description,
                            arguments: prompt.arguments,
                        })),
                    );
                } catch (e) {
                    console.error(`Error listing prompts for ${name}: ${e}`);
                }
            }
            return { prompts };
        });

        server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            const [name, promptName] = request.params.name.split('/');
            const client = clients[name];
            return client.getPrompt({ ...request.params, name: promptName });
        });
    }
}

const clients = await createClients(transports);
await registerCapabilities(clients);

export { server };
