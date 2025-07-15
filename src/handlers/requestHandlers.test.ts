import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientStatus, type OutboundConnections, type OutboundConnection } from '../core/types/index.js';

// Create a focused test for the ping handler functionality
describe('Ping Handler', () => {
  let mockClients: OutboundConnections;
  let mockClient1: any;
  let mockClient2: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock clients
    mockClient1 = {
      ping: vi.fn(),
    };

    mockClient2 = {
      ping: vi.fn(),
    };

    // Create mock clients collection
    mockClients = new Map();
    mockClients.set('client1', {
      name: 'client1',
      status: ClientStatus.Connected,
      client: mockClient1,
      transport: {
        timeout: 5000,
        start: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      },
    } as OutboundConnection);
    mockClients.set('client2', {
      name: 'client2',
      status: ClientStatus.Connected,
      client: mockClient2,
      transport: {
        timeout: 5000,
        start: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      },
    } as OutboundConnection);
    mockClients.set('client3', {
      name: 'client3',
      status: ClientStatus.Disconnected,
      client: { ping: vi.fn() },
      transport: {
        timeout: 5000,
        start: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      },
    } as unknown as OutboundConnection);
  });

  // Test the core ping handler logic directly
  const createPingHandler = (clients: OutboundConnections) => {
    return async () => {
      // Health check all connected upstream clients (replicated from actual implementation)
      const healthCheckPromises = Array.from(clients.entries()).map(async ([clientName, clientInfo]) => {
        if (clientInfo.status === ClientStatus.Connected) {
          try {
            await clientInfo.client.ping();
            console.log(`Health check successful for client: ${clientName}`);
          } catch (error) {
            console.warn(`Health check failed for client ${clientName}: ${error}`);
          }
        }
      });

      // Wait for all health checks to complete (but don't fail if some fail)
      await Promise.allSettled(healthCheckPromises);

      // Always return successful pong response
      return {};
    };
  };

  it('should ping all connected clients during health check', async () => {
    mockClient1.ping.mockResolvedValue({});
    mockClient2.ping.mockResolvedValue({});

    const pingHandler = createPingHandler(mockClients);
    const result = await pingHandler();

    expect(mockClient1.ping).toHaveBeenCalledTimes(1);
    expect(mockClient2.ping).toHaveBeenCalledTimes(1);
    expect(result).toEqual({});
  });

  it('should skip disconnected clients', async () => {
    mockClient1.ping.mockResolvedValue({});
    mockClient2.ping.mockResolvedValue({});

    const pingHandler = createPingHandler(mockClients);
    await pingHandler();

    // Client3 is disconnected, so its ping should not be called
    expect(mockClients.get('client3')!.client.ping).not.toHaveBeenCalled();
  });

  it('should handle client ping failures gracefully', async () => {
    mockClient1.ping.mockResolvedValue({});
    mockClient2.ping.mockRejectedValue(new Error('Client 2 failed'));

    const pingHandler = createPingHandler(mockClients);
    const result = await pingHandler();

    expect(mockClient1.ping).toHaveBeenCalledTimes(1);
    expect(mockClient2.ping).toHaveBeenCalledTimes(1);
    expect(result).toEqual({});
  });

  it('should always return empty object even if all clients fail', async () => {
    mockClient1.ping.mockRejectedValue(new Error('Client 1 failed'));
    mockClient2.ping.mockRejectedValue(new Error('Client 2 failed'));

    const pingHandler = createPingHandler(mockClients);
    const result = await pingHandler();

    expect(result).toEqual({});
  });

  it('should handle empty clients object', async () => {
    const emptyClients: OutboundConnections = new Map();
    const pingHandler = createPingHandler(emptyClients);
    const result = await pingHandler();

    expect(result).toEqual({});
  });

  it('should handle clients with different statuses', async () => {
    const mixedClients: OutboundConnections = new Map();
    mixedClients.set('connected', {
      name: 'connected',
      status: ClientStatus.Connected,
      client: { ping: vi.fn().mockResolvedValue({}) },
      transport: {
        timeout: 5000,
        start: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      },
    } as unknown as OutboundConnection);
    mixedClients.set('disconnected', {
      name: 'disconnected',
      status: ClientStatus.Disconnected,
      client: { ping: vi.fn() },
      transport: {
        timeout: 5000,
        start: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      },
    } as unknown as OutboundConnection);
    mixedClients.set('error', {
      name: 'error',
      status: ClientStatus.Error,
      client: { ping: vi.fn() },
      transport: {
        timeout: 5000,
        start: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      },
    } as unknown as OutboundConnection);

    const pingHandler = createPingHandler(mixedClients);
    await pingHandler();

    expect(mixedClients.get('connected')!.client.ping).toHaveBeenCalledTimes(1);
    expect(mixedClients.get('disconnected')!.client.ping).not.toHaveBeenCalled();
    expect(mixedClients.get('error')!.client.ping).not.toHaveBeenCalled();
  });
});
