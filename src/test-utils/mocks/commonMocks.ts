import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Mock Logger
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  level: 'info',
  transports: [],
};

// Mock Transport
export const createMockTransport = (): Transport => ({
  start: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
});

// Mock Server
export const createMockServer = (overrides = {}): Server =>
  ({
    connect: jest.fn().mockResolvedValue(undefined),
    transport: createMockTransport(),
    ...overrides,
  }) as unknown as Server;

// Mock Client
export const createMockClient = (overrides = {}): Partial<Client> => ({
  connect: jest.fn(),
  getServerVersion: jest.fn(),
  ...overrides,
});

// Mock File System
export const createMockFs = () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  watch: jest.fn(() => ({ close: jest.fn() })),
});

// Mock Config
export const createMockConfig = (overrides = {}) => ({
  name: 'test-server',
  version: '1.0.0',
  ...overrides,
});

// Mock Capabilities
export const createMockCapabilities = (overrides = {}) => ({
  capabilities: {
    resources: {},
    tools: {},
    ...overrides,
  },
});

// Jest module mocks setup helper
export const setupCommonJestMocks = () => {
  jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: jest.fn(),
  }));

  jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn(),
  }));

  jest.mock('@modelcontextprotocol/sdk/shared/transport.js', () => ({
    Transport: jest.fn(),
  }));

  jest.mock('../../logger/logger.js', () => ({
    __esModule: true,
    default: mockLogger,
  }));
};
