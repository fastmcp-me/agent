import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './constants.js';

export default async function createClient() {
  const client = new Client(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
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
