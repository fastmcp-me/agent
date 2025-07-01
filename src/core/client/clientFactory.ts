import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION, MCP_CLIENT_CAPABILITIES } from '../../constants.js';

export default async function createClient() {
  const client = new Client(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: MCP_CLIENT_CAPABILITIES,
    },
  );

  return client;
}
