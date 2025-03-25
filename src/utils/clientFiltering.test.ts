import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { Clients } from '../types.js';
import {
  filterClients,
  byCapabilities,
  byTags,
  filterClientsByCapabilities,
  filterClientsByTags,
} from './clientFiltering.js';

describe('Client Filtering Utils', () => {
  const mockClients: Clients = {
    client1: {
      capabilities: {
        resources: {},
        tools: {},
      },
      transport: {
        tags: ['tag1', 'tag2'],
      },
    },
    client2: {
      capabilities: {
        resources: {},
      },
      transport: {
        tags: ['tag1'],
      },
    },
    client3: {
      capabilities: {
        tools: {},
      },
      transport: {
        tags: ['tag3'],
      },
    },
    clientNoCapabilities: {
      transport: {
        tags: ['tag1'],
      },
    },
    clientNoTags: {
      capabilities: {
        resources: {},
      },
      transport: {},
    },
  } as unknown as Clients;

  describe('filterClientsByCapabilities', () => {
    it('should filter clients by single capability', () => {
      const filtered = filterClientsByCapabilities(mockClients, { resources: {} });
      expect(Object.keys(filtered)).toEqual(['client1', 'client2', 'clientNoTags']);
    });

    it('should filter clients by multiple capabilities', () => {
      const filtered = filterClientsByCapabilities(mockClients, { resources: {}, tools: {} });
      expect(Object.keys(filtered)).toEqual(['client1']);
    });

    it('should handle clients with no capabilities', () => {
      const filtered = filterClientsByCapabilities(mockClients, { resources: {} });
      expect(filtered).not.toHaveProperty('clientNoCapabilities');
    });

    it('should return empty object when no matches found', () => {
      const filtered = filterClientsByCapabilities(mockClients, { nonexistent: {} } as ServerCapabilities);
      expect(Object.keys(filtered)).toHaveLength(0);
    });
  });

  describe('filterClientsByTags', () => {
    it('should return all clients when no tags provided', () => {
      const filtered = filterClientsByTags(mockClients, undefined);
      expect(Object.keys(filtered)).toEqual(Object.keys(mockClients));
    });

    it('should filter clients by single tag', () => {
      const filtered = filterClientsByTags(mockClients, ['tag1']);
      expect(Object.keys(filtered)).toEqual(['client1', 'client2', 'clientNoCapabilities']);
    });

    it('should filter clients by multiple tags', () => {
      const filtered = filterClientsByTags(mockClients, ['tag1', 'tag2']);
      expect(Object.keys(filtered)).toEqual(['client1']);
    });

    it('should handle clients with no tags', () => {
      const filtered = filterClientsByTags(mockClients, ['tag1']);
      expect(filtered).not.toHaveProperty('clientNoTags');
    });

    it('should return empty object when no matches found', () => {
      const filtered = filterClientsByTags(mockClients, ['nonexistent']);
      expect(Object.keys(filtered)).toHaveLength(0);
    });
  });

  describe('filterClients (composed filters)', () => {
    it('should chain multiple filters together', () => {
      const filtered = filterClients(byCapabilities({ resources: {} }), byTags(['tag1']))(mockClients);

      expect(Object.keys(filtered)).toEqual(['client1', 'client2']);
    });

    it('should handle empty filters array', () => {
      const filtered = filterClients()(mockClients);
      expect(Object.keys(filtered)).toEqual(Object.keys(mockClients));
    });

    it('should handle no matching results', () => {
      const filtered = filterClients(byCapabilities({ resources: {} }), byTags(['tag3']))(mockClients);

      expect(Object.keys(filtered)).toHaveLength(0);
    });
  });

  describe('byCapabilities', () => {
    it('should create a filter function for capabilities', () => {
      const filter = byCapabilities({ resources: {} });
      const filtered = filter(mockClients);
      expect(Object.keys(filtered)).toEqual(['client1', 'client2', 'clientNoTags']);
    });

    it('should handle undefined capabilities safely', () => {
      const filter = byCapabilities({ resources: {} });
      const filtered = filter({ ...mockClients, unsafeClient: { transport: {} } } as unknown as Clients);
      expect(filtered).not.toHaveProperty('unsafeClient');
    });
  });

  describe('byTags', () => {
    it('should create a filter function for tags', () => {
      const filter = byTags(['tag1']);
      const filtered = filter(mockClients);
      expect(Object.keys(filtered)).toEqual(['client1', 'client2', 'clientNoCapabilities']);
    });

    it('should handle undefined tags array', () => {
      const filter = byTags(undefined);
      const filtered = filter(mockClients);
      expect(Object.keys(filtered)).toEqual(Object.keys(mockClients));
    });

    it('should handle empty tags array', () => {
      const filter = byTags([]);
      const filtered = filter(mockClients);
      expect(Object.keys(filtered)).toEqual(Object.keys(mockClients));
    });
  });
});
