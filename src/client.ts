import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export default async function createClient(transport: Transport) {
    const client = new Client(
        {
            name: '1mcp-client',
            version: '1.0.0',
        },
        {
            capabilities: {
                experimental: {},
                roots: {},
                sampling: {},
                logging: {},
                prompts: {},
                resources: {},
                tools: {},
            },
        },
    );

    return client;
}
