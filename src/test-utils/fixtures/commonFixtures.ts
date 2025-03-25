import { Clients } from '../../types.js';
import { createMockTransport } from '../mocks/commonMocks.js';

// Common test clients fixture
export const createTestClients = (): Clients =>
  ({
    client1: {
      capabilities: {
        resources: {},
        tools: {},
      },
      transport: createMockTransport(),
    },
    client2: {
      capabilities: {
        resources: {},
      },
      transport: createMockTransport(),
    },
    client3: {
      capabilities: {
        tools: {},
      },
      transport: createMockTransport(),
    },
    clientNoCapabilities: {
      transport: createMockTransport(),
    },
    clientNoTags: {
      capabilities: {
        resources: {},
      },
      transport: createMockTransport(),
    },
  }) as unknown as Clients;

// Common test config fixture
export const testConfig = {
  mcpServers: {
    test: { url: 'test-url' },
  },
};

// Common test capabilities fixture
export const testCapabilities = {
  resources: {},
  tools: {},
  test: true,
};
