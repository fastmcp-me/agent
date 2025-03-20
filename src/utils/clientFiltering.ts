import { Clients } from '../types.js';
import logger from '../logger/logger.js';

/**
 * Filters clients by tags
 * @param clients Record of client instances
 * @param tags Array of tags to filter by
 * @returns Filtered record of client instances
 */
export function filterClientsByTags(clients: Clients, tags?: string[]): Clients {
  if (!tags || tags.length === 0) {
    return clients;
  }

  const filteredClients: Record<string, (typeof clients)[keyof typeof clients]> = {};
  let matchedClients = 0;

  for (const [name, clientInfo] of Object.entries(clients)) {
    const clientTags = clientInfo.transport.tags || [];
    const hasMatchingTags = tags.every((tag) => clientTags.includes(tag));

    if (hasMatchingTags) {
      filteredClients[name] = clientInfo;
      matchedClients++;
    }
  }

  if (matchedClients === 0) {
    logger.warn(`No clients found matching tags: ${tags.join(', ')}`);
  } else {
    logger.debug(`Found ${matchedClients} clients matching tags: ${tags.join(', ')}`);
  }

  return Object.freeze(filteredClients);
}
