import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { Resource, ResourceTemplate, Tool, Prompt } from '@modelcontextprotocol/sdk/types.js';
import { ClientInfo, Clients } from '../types.js';

interface PaginationParams {
  [x: string]: unknown;
  _meta?:
    | {
        [x: string]: unknown;
        progressToken?: string | number | undefined;
      }
    | undefined;
  cursor?: string | undefined;
}

interface PaginationResult<T> {
  items: T[];
  nextCursor?: string;
}

interface PaginationResponse {
  resources?: Resource[];
  resourceTemplates?: ResourceTemplate[];
  tools?: Tool[];
  prompts?: Prompt[];
  nextCursor?: string;
}

export function parseCursor(cursor?: string): { clientName: string; actualCursor?: string } {
  if (!cursor) {
    return { clientName: '' };
  }
  const [clientName, actualCursor] = Buffer.from(cursor, 'base64').toString('utf-8').split(':');
  return { clientName, actualCursor };
}

export function encodeCursor(clientName: string, nextCursor: string = ''): string | undefined {
  return Buffer.from(`${clientName}:${nextCursor}`).toString('base64');
}

export async function handlePagination<T>(
  clients: Clients,
  params: PaginationParams,
  callClientMethod: (client: Client, params: unknown, opts: RequestOptions) => Promise<PaginationResponse>,
  transformResult: (client: ClientInfo, result: PaginationResponse) => T[],
): Promise<PaginationResult<T>> {
  const { cursor, ...clientParams } = params;
  const { clientName, actualCursor } = parseCursor(cursor);

  const names = Object.keys(clients);
  const targetClientName = clientName || names[0];
  const clientInfo = clients[targetClientName];

  if (!clientInfo) {
    return { items: [] };
  }

  const result: PaginationResponse = await callClientMethod(
    clientInfo.client,
    {
      ...clientParams,
      cursor: actualCursor,
    },
    { timeout: clientInfo.transport.timeout },
  );

  const transformedItems = transformResult(clientInfo, result);
  let nextCursor;
  if (result.nextCursor) {
    nextCursor = encodeCursor(targetClientName, result.nextCursor);
  } else {
    // Find next client after the current one
    const currentIndex = names.indexOf(targetClientName);
    const nextClientName = currentIndex === names.length - 1 ? undefined : names[currentIndex + 1];
    if (nextClientName) {
      nextCursor = encodeCursor(nextClientName, undefined);
    }
  }

  return {
    items: transformedItems,
    nextCursor,
  };
}
