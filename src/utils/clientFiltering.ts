import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { OutboundConnections, OutboundConnection } from '../core/types/index.js';
import logger from '../logger/logger.js';

/**
 * Filters clients by tags
 * @param clients Record of client instances
 * @param tags Array of tags to filter by
 * @returns Filtered record of client instances
 */
export function filterClientsByTags(clients: OutboundConnections, tags?: string[]): OutboundConnections {
  if (!tags || tags.length === 0) {
    return clients;
  }

  const filteredClients = new Map<string, OutboundConnection>();
  let matchedClients = 0;

  for (const [name, clientInfo] of clients.entries()) {
    const clientTags = clientInfo.transport.tags || [];
    const hasMatchingTags = tags.every((tag) => clientTags.includes(tag));

    if (hasMatchingTags) {
      filteredClients.set(name, clientInfo);
      matchedClients++;
    }
  }

  if (matchedClients === 0) {
    logger.warn(`No clients found matching tags: ${tags.join(', ')}`);
  } else {
    logger.debug(`Found ${matchedClients} clients matching tags: ${tags.join(', ')}`);
  }

  return filteredClients;
}

/**
 * Filters clients by capabilities
 * @param clients Record of client instances
 * @param capabilities Object containing capabilities to filter by
 * @returns Filtered record of client instances
 */
export function filterClientsByCapabilities(
  clients: OutboundConnections,
  capabilities: ServerCapabilities,
): OutboundConnections {
  const filteredClients = new Map<string, OutboundConnection>();
  let matchedClients = 0;

  for (const [name, clientInfo] of clients.entries()) {
    const clientCapabilities = clientInfo.capabilities || {};
    const hasMatchingCapabilities = Object.keys(capabilities).every((capability) => {
      const clientCapability = clientCapabilities[capability as keyof ServerCapabilities];
      return clientCapability !== undefined;
    });

    if (hasMatchingCapabilities) {
      filteredClients.set(name, clientInfo);
      matchedClients++;
    }
  }

  if (matchedClients === 0) {
    logger.warn(`No clients found matching capabilities: ${JSON.stringify(capabilities)}`);
  } else {
    logger.debug(`Found ${matchedClients} clients matching capabilities: ${JSON.stringify(capabilities)}`);
  }

  return filteredClients;
}

type ClientFilter = (clients: OutboundConnections) => OutboundConnections;

/**
 * Filters clients by multiple criteria
 * @param filters Array of client filters
 * @returns Filtered record of client instances
 */
export function filterClients(...filters: ClientFilter[]): ClientFilter {
  return (clients: OutboundConnections) => {
    return filters.reduce((filteredClients, filter) => filter(filteredClients), clients);
  };
}

/**
 * Filters clients by capabilities
 * @param requiredCapabilities Object containing capabilities to filter by
 * @returns Filtered record of client instances
 */
export function byCapabilities(requiredCapabilities: ServerCapabilities): ClientFilter {
  return (clients: OutboundConnections) => {
    return Array.from(clients.entries()).reduce((filtered, [name, clientInfo]) => {
      const hasCapabilities = Object.keys(requiredCapabilities).every(
        (cap) => clientInfo.capabilities && cap in clientInfo.capabilities,
      );
      if (hasCapabilities) {
        filtered.set(name, clientInfo);
      }
      return filtered;
    }, new Map<string, OutboundConnection>());
  };
}

/**
 * Filters clients by tags
 * @param tags Array of tags to filter by
 * @returns Filtered record of client instances
 */
export function byTags(tags?: string[]): ClientFilter {
  return (clients: OutboundConnections) => {
    if (!tags || tags.length === 0) return clients;

    return Array.from(clients.entries()).reduce((filtered, [name, clientInfo]) => {
      const hasMatchingTags = tags.every((tag) => clientInfo.transport.tags?.includes(tag));
      if (hasMatchingTags) {
        filtered.set(name, clientInfo);
      }
      return filtered;
    }, new Map<string, OutboundConnection>());
  };
}
