import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import logger from './logger/logger.js';
import configReloadService from './services/configReloadService.js';
import { setupCapabilities } from './capabilities/capabilityManager.js';
import { enhanceServerWithLogging } from './middleware/loggingMiddleware.js';
import { Clients, ServerInfo, ServerInfoExtra } from './types.js';

export class ServerManager {
  private static instance: ServerManager;
  private servers: Map<string, ServerInfo> = new Map();
  private serverConfig: { name: string; version: string };
  private serverCapabilities: { capabilities: Record<string, unknown> };

  private clients: Clients = {};
  private transports: Record<string, Transport> = {};
  private connectionSemaphore: Map<string, Promise<void>> = new Map();
  private disconnectingIds: Set<string> = new Set();

  private constructor(
    config: { name: string; version: string },
    capabilities: { capabilities: Record<string, unknown> },
    clients: Clients,
    transports: Record<string, Transport>,
  ) {
    this.serverConfig = config;
    this.serverCapabilities = capabilities;
    this.clients = clients;
    this.transports = transports;
  }

  public static getOrCreateInstance(
    config: { name: string; version: string },
    capabilities: { capabilities: Record<string, unknown> },
    clients: Clients,
    transports: Record<string, Transport>,
  ): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager(config, capabilities, clients, transports);
    }
    return ServerManager.instance;
  }

  public static get current(): ServerManager {
    return ServerManager.instance;
  }

  // Test utility method to reset singleton state
  public static resetInstance(): void {
    if (ServerManager.instance) {
      // Clean up existing connections with forced close
      for (const [sessionId] of ServerManager.instance.servers) {
        ServerManager.instance.disconnectTransport(sessionId, true);
      }
      ServerManager.instance.servers.clear();
      ServerManager.instance.connectionSemaphore.clear();
      ServerManager.instance.disconnectingIds.clear();
    }
    ServerManager.instance = undefined as any;
  }

  public async connectTransport(transport: Transport, sessionId: string, opts: ServerInfoExtra): Promise<void> {
    // Check if a connection is already in progress for this session
    const existingConnection = this.connectionSemaphore.get(sessionId);
    if (existingConnection) {
      logger.warn(`Connection already in progress for session ${sessionId}, waiting...`);
      await existingConnection;
      return;
    }

    // Check if transport is already connected
    if (this.servers.has(sessionId)) {
      logger.warn(`Transport already connected for session ${sessionId}`);
      return;
    }

    // Create connection promise to prevent race conditions
    const connectionPromise = this.performConnection(transport, sessionId, opts);
    this.connectionSemaphore.set(sessionId, connectionPromise);

    try {
      await connectionPromise;
    } finally {
      // Clean up the semaphore entry
      this.connectionSemaphore.delete(sessionId);
    }
  }

  private async performConnection(transport: Transport, sessionId: string, opts: ServerInfoExtra): Promise<void> {
    // Set connection timeout
    const connectionTimeoutMs = 30000; // 30 seconds

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Connection timeout for session ${sessionId}`)), connectionTimeoutMs);
    });

    try {
      await Promise.race([this.doConnect(transport, sessionId, opts), timeoutPromise]);
    } catch (error) {
      // Clean up partial connection on failure
      if (this.servers.has(sessionId)) {
        this.servers.delete(sessionId);
      }
      logger.error(`Failed to connect transport for session ${sessionId}:`, error);
      throw error;
    }
  }

  private async doConnect(transport: Transport, sessionId: string, opts: ServerInfoExtra): Promise<void> {
    // Create a new server instance for this transport
    const server = new Server(this.serverConfig, this.serverCapabilities);

    // Create server info object first
    const serverInfo: ServerInfo = {
      server,
      ...opts,
    };

    // Enhance server with logging middleware
    enhanceServerWithLogging(server);

    // Set up capabilities for this server instance
    await setupCapabilities(this.clients, serverInfo);

    // Update the configuration reload service with server info
    configReloadService.updateServerInfo(sessionId, serverInfo);

    // Store the server instance
    this.servers.set(sessionId, serverInfo);

    // Connect the transport to the new server instance
    await server.connect(transport);

    logger.info(`Connected transport for session ${sessionId}`);
  }

  public disconnectTransport(sessionId: string, forceClose: boolean = false): void {
    // Prevent recursive disconnection calls
    if (this.disconnectingIds.has(sessionId)) {
      return;
    }

    const server = this.servers.get(sessionId);
    if (server) {
      this.disconnectingIds.add(sessionId);

      try {
        // Only close the transport if explicitly requested (e.g., during shutdown)
        // Don't close if this is called from an onclose handler to avoid recursion
        if (forceClose && server.server.transport) {
          try {
            server.server.transport.close();
          } catch (error) {
            logger.error(`Error closing transport for session ${sessionId}:`, error);
          }
        }

        this.servers.delete(sessionId);
        configReloadService.removeServerInfo(sessionId);
        logger.info(`Disconnected transport for session ${sessionId}`);
      } finally {
        this.disconnectingIds.delete(sessionId);
      }
    }
  }

  public getTransport(sessionId: string): Transport | undefined {
    return this.servers.get(sessionId)?.server.transport;
  }

  public getTransports(): Map<string, Transport> {
    const transports = new Map<string, Transport>();
    for (const [id, server] of this.servers.entries()) {
      if (server.server.transport) {
        transports.set(id, server.server.transport);
      }
    }
    return transports;
  }

  public getClientTransports(): Record<string, Transport> {
    return this.transports;
  }

  public getActiveTransportsCount(): number {
    return this.servers.size;
  }

  public getServer(sessionId: string): ServerInfo | undefined {
    return this.servers.get(sessionId);
  }

  public updateClientsAndTransports(newClients: Clients, newTransports: Record<string, Transport>): void {
    this.clients = newClients;
    this.transports = newTransports;
  }
}
