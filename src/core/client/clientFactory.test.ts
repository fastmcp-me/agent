import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import createClient from './clientFactory.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION, MCP_CLIENT_CAPABILITIES } from '../../constants.js';

// Mock the MCP SDK Client
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

describe('clientFactory', () => {
  let mockClient: any;
  let ClientConstructor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockClient = {
      connect: vi.fn(),
      close: vi.fn(),
      request: vi.fn(),
      notification: vi.fn(),
      setRequestHandler: vi.fn(),
      setNotificationHandler: vi.fn(),
    };
    
    ClientConstructor = vi.mocked(Client);
    ClientConstructor.mockImplementation(() => mockClient);
  });

  describe('createClient', () => {
    it('should create a client with correct name and version', async () => {
      const client = await createClient();

      expect(ClientConstructor).toHaveBeenCalledWith(
        {
          name: MCP_SERVER_NAME,
          version: MCP_SERVER_VERSION,
        },
        {
          capabilities: MCP_CLIENT_CAPABILITIES,
        }
      );

      expect(client).toBe(mockClient);
    });

    it('should create a client with default capabilities', async () => {
      await createClient();

      expect(ClientConstructor).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          capabilities: MCP_CLIENT_CAPABILITIES,
        })
      );
    });

    it('should return the created client instance', async () => {
      const client = await createClient();

      expect(client).toBe(mockClient);
      expect(client).toBeInstanceOf(Object);
    });

    it('should create a new client instance on each call', async () => {
      const client1 = await createClient();
      const client2 = await createClient();

      expect(ClientConstructor).toHaveBeenCalledTimes(2);
      expect(client1).toBe(mockClient);
      expect(client2).toBe(mockClient);
    });

    it('should handle client creation errors', async () => {
      const error = new Error('Failed to create client');
      ClientConstructor.mockImplementation(() => {
        throw error;
      });

      await expect(createClient()).rejects.toThrow('Failed to create client');
    });

    it('should be an async function', () => {
      const result = createClient();
      expect(result).toBeInstanceOf(Promise);
    });
  });
});