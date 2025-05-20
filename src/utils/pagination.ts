import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { Resource, ResourceTemplate, Tool, Prompt } from '@modelcontextprotocol/sdk/types.js';
import { ClientInfo, Clients } from '../types.js';
import logger from '../logger/logger.js';

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

async function fetchAllItemsForClient<T>(
  clientInfo: ClientInfo,
  params: PaginationParams,
  callClientMethod: (client: Client, params: unknown, opts: RequestOptions) => Promise<PaginationResponse>,
  transformResult: (client: ClientInfo, result: PaginationResponse) => T[],
): Promise<T[]> {
  logger.info(`Fetching all items for client ${clientInfo.name}`);

  const items: T[] = [];
  let result = await callClientMethod(clientInfo.client, params, { timeout: clientInfo.transport.timeout });
  items.push(...transformResult(clientInfo, result));

  while (result.nextCursor) {
    logger.info(`Fetching next page for client ${clientInfo.name} with cursor ${result.nextCursor}`);
    result = await callClientMethod(
      clientInfo.client,
      { ...params, cursor: result.nextCursor },
      { timeout: clientInfo.transport.timeout },
    );
    items.push(...transformResult(clientInfo, result));
  }

  return items;
}

function getNextClientCursor(currentClientName: string, clientNames: string[]): string | undefined {
  const currentIndex = clientNames.indexOf(currentClientName);
  const nextClientName = currentIndex === clientNames.length - 1 ? undefined : clientNames[currentIndex + 1];
  return nextClientName ? encodeCursor(nextClientName, undefined) : undefined;
}

export async function handlePagination<T>(
  clients: Clients,
  params: PaginationParams,
  callClientMethod: (client: Client, params: unknown, opts: RequestOptions) => Promise<PaginationResponse>,
  transformResult: (client: ClientInfo, result: PaginationResponse) => T[],
  enablePagination: boolean,
): Promise<PaginationResult<T>> {
  const { cursor, ...clientParams } = params;
  const clientNames = Object.keys(clients);

  if (!enablePagination) {
    const allItems = await Promise.all(
      clientNames.map((clientName) =>
        fetchAllItemsForClient(clients[clientName], clientParams, callClientMethod, transformResult),
      ),
    );
    return { items: allItems.flat() };
  }

  const { clientName, actualCursor } = parseCursor(cursor);
  const targetClientName = clientName || clientNames[0];
  const clientInfo = clients[targetClientName];

  if (!clientInfo) {
    return { items: [] };
  }

  const result = await callClientMethod(
    clientInfo.client,
    { ...clientParams, cursor: actualCursor },
    { timeout: clientInfo.transport.timeout },
  );

  const transformedItems = transformResult(clientInfo, result);
  const nextCursor = result.nextCursor
    ? encodeCursor(targetClientName, result.nextCursor)
    : getNextClientCursor(targetClientName, clientNames);

  return { items: transformedItems, nextCursor };
}
