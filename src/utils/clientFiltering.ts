import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
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

/**
 * Filters clients by capabilities
 * @param clients Record of client instances
 * @param capabilities Object containing capabilities to filter by
 * @returns Filtered record of client instances
 */
export function filterClientsByCapabilities(clients: Clients, capabilities: ServerCapabilities): Clients {
  const filteredClients: Record<string, (typeof clients)[keyof typeof clients]> = {};
  let matchedClients = 0;

  for (const [name, clientInfo] of Object.entries(clients)) {
    const clientCapabilities = clientInfo.capabilities || {};
    const hasMatchingCapabilities = Object.keys(capabilities).every((capability) => {
      const clientCapability = clientCapabilities[capability as keyof ServerCapabilities];
      return clientCapability !== undefined;
    });

    if (hasMatchingCapabilities) {
      filteredClients[name] = clientInfo;
      matchedClients++;
    }
  }

  if (matchedClients === 0) {
    logger.warn(`No clients found matching capabilities: ${JSON.stringify(capabilities)}`);
  } else {
    logger.debug(`Found ${matchedClients} clients matching capabilities: ${JSON.stringify(capabilities)}`);
  }

  return Object.freeze(filteredClients);
}

type ClientFilter = (clients: Clients) => Clients;

/**
 * Filters clients by multiple criteria
 * @param filters Array of client filters
 * @returns Filtered record of client instances
 */
export function filterClients(...filters: ClientFilter[]): ClientFilter {
  return (clients: Clients) => {
    return filters.reduce((filteredClients, filter) => filter(filteredClients), clients);
  };
}

/**
 * Filters clients by capabilities
 * @param requiredCapabilities Object containing capabilities to filter by
 * @returns Filtered record of client instances
 */
export function byCapabilities(requiredCapabilities: ServerCapabilities): ClientFilter {
  return (clients: Clients) => {
    return Object.entries(clients).reduce((filtered, [name, clientInfo]) => {
      const hasCapabilities = Object.keys(requiredCapabilities).every(
        (cap) => clientInfo.capabilities && cap in clientInfo.capabilities,
      );
      if (hasCapabilities) {
        filtered[name] = clientInfo;
      }
      return filtered;
    }, {} as Clients);
  };
}

/**
 * Filters clients by tags
 * @param tags Array of tags to filter by
 * @returns Filtered record of client instances
 */
export function byTags(tags?: string[]): ClientFilter {
  return (clients: Clients) => {
    if (!tags || tags.length === 0) return clients;

    return Object.entries(clients).reduce((filtered, [name, clientInfo]) => {
      const hasMatchingTags = tags.every((tag) => clientInfo.transport.tags?.includes(tag));
      if (hasMatchingTags) {
        filtered[name] = clientInfo;
      }
      return filtered;
    }, {} as Clients);
  };
}
