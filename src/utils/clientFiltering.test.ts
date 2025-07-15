import { describe, it, expect, vi } from 'vitest';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { Clients, AuthProviderTransport } from '../core/types/index.js';
import {
  filterClients,
  byCapabilities,
  byTags,
  filterClientsByCapabilities,
  filterClientsByTags,
} from './clientFiltering.js';

describe('Client Filtering Utils', () => {
  const createMockTransport = (tags?: string[]): AuthProviderTransport => ({
    start: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    tags,
  });

  const mockClients: Clients = new Map();
  mockClients.set('client1', {
    name: 'client1',
    capabilities: {
      resources: {},
      tools: {},
    },
    transport: createMockTransport(['tag1', 'tag2']),
    client: {} as any,
    status: 'connected' as any,
  });
  mockClients.set('client2', {
    name: 'client2',
    capabilities: {
      resources: {},
    },
    transport: createMockTransport(['tag1']),
    client: {} as any,
    status: 'connected' as any,
  });
  mockClients.set('client3', {
    name: 'client3',
    capabilities: {
      tools: {},
    },
    transport: createMockTransport(['tag3']),
    client: {} as any,
    status: 'connected' as any,
  });
  mockClients.set('clientNoCapabilities', {
    name: 'clientNoCapabilities',
    transport: createMockTransport(['tag1']),
    client: {} as any,
    status: 'connected' as any,
  });
  mockClients.set('clientNoTags', {
    name: 'clientNoTags',
    capabilities: {
      resources: {},
    },
    transport: createMockTransport(),
    client: {} as any,
    status: 'connected' as any,
  });

  describe('filterClientsByCapabilities', () => {
    it('should filter clients by single capability', () => {
      const filtered = filterClientsByCapabilities(mockClients, { resources: {} });
      expect(Array.from(filtered.keys())).toEqual(['client1', 'client2', 'clientNoTags']);
    });

    it('should filter clients by multiple capabilities', () => {
      const filtered = filterClientsByCapabilities(mockClients, { resources: {}, tools: {} });
      expect(Array.from(filtered.keys())).toEqual(['client1']);
    });

    it('should handle clients with no capabilities', () => {
      const filtered = filterClientsByCapabilities(mockClients, { resources: {} });
      expect(filtered.has('clientNoCapabilities')).toBe(false);
    });

    it('should return empty object when no matches found', () => {
      const filtered = filterClientsByCapabilities(mockClients, { nonexistent: {} } as ServerCapabilities);
      expect(Array.from(filtered.keys())).toHaveLength(0);
    });
  });

  describe('filterClientsByTags', () => {
    it('should return all clients when no tags provided', () => {
      const filtered = filterClientsByTags(mockClients, undefined);
      expect(Array.from(filtered.keys())).toEqual(Array.from(mockClients.keys()));
    });

    it('should filter clients by single tag', () => {
      const filtered = filterClientsByTags(mockClients, ['tag1']);
      expect(Array.from(filtered.keys())).toEqual(['client1', 'client2', 'clientNoCapabilities']);
    });

    it('should filter clients by multiple tags', () => {
      const filtered = filterClientsByTags(mockClients, ['tag1', 'tag2']);
      expect(Array.from(filtered.keys())).toEqual(['client1']);
    });

    it('should handle clients with no tags', () => {
      const filtered = filterClientsByTags(mockClients, ['tag1']);
      expect(filtered.has('clientNoTags')).toBe(false);
    });

    it('should return empty object when no matches found', () => {
      const filtered = filterClientsByTags(mockClients, ['nonexistent']);
      expect(Array.from(filtered.keys())).toHaveLength(0);
    });
  });

  describe('filterClients (composed filters)', () => {
    it('should chain multiple filters together', () => {
      const filtered = filterClients(byCapabilities({ resources: {} }), byTags(['tag1']))(mockClients);

      expect(Array.from(filtered.keys())).toEqual(['client1', 'client2']);
    });

    it('should handle empty filters array', () => {
      const filtered = filterClients()(mockClients);
      expect(Array.from(filtered.keys())).toEqual(Array.from(mockClients.keys()));
    });

    it('should handle no matching results', () => {
      const filtered = filterClients(byCapabilities({ resources: {} }), byTags(['tag3']))(mockClients);

      expect(Array.from(filtered.keys())).toHaveLength(0);
    });
  });

  describe('byCapabilities', () => {
    it('should create a filter function for capabilities', () => {
      const filter = byCapabilities({ resources: {} });
      const filtered = filter(mockClients);
      expect(Array.from(filtered.keys())).toEqual(['client1', 'client2', 'clientNoTags']);
    });

    it('should handle undefined capabilities safely', () => {
      const filter = byCapabilities({ resources: {} });
      const testClients = new Map(mockClients);
      testClients.set('unsafeClient', {
        name: 'unsafeClient',
        transport: createMockTransport(),
        client: {} as any,
        status: 'connected' as any,
      });
      const filtered = filter(testClients);
      expect(filtered.has('unsafeClient')).toBe(false);
    });
  });

  describe('byTags', () => {
    it('should create a filter function for tags', () => {
      const filter = byTags(['tag1']);
      const filtered = filter(mockClients);
      expect(Array.from(filtered.keys())).toEqual(['client1', 'client2', 'clientNoCapabilities']);
    });

    it('should handle undefined tags array', () => {
      const filter = byTags(undefined);
      const filtered = filter(mockClients);
      expect(Array.from(filtered.keys())).toEqual(Array.from(mockClients.keys()));
    });

    it('should handle empty tags array', () => {
      const filter = byTags([]);
      const filtered = filter(mockClients);
      expect(Array.from(filtered.keys())).toEqual(Array.from(mockClients.keys()));
    });
  });
});
