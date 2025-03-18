import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import logger from './logger.js';
import configReloadService from './services/configReloadService.js';
import { collectAndRegisterCapabilities } from './capabilities/capabilityManager.js';

export class ServerManager {
  private static instance: ServerManager;
  private servers: Map<string, Server> = new Map();
  private serverConfig: { name: string; version: string };
  private serverCapabilities: { capabilities: Record<string, unknown> };

  private clients: Record<string, Client> = {};
  private clientTransports: Record<string, Transport> = {};

  private constructor(
    config: { name: string; version: string },
    capabilities: { capabilities: Record<string, unknown> },
    clients: Record<string, Client>,
    clientTransports: Record<string, Transport>,
  ) {
    this.serverConfig = config;
    this.serverCapabilities = capabilities;
    this.clients = clients;
    this.clientTransports = clientTransports;
  }

  public static getInstance(
    config: { name: string; version: string },
    capabilities: { capabilities: Record<string, unknown> },
    clients: Record<string, Client>,
    clientTransports: Record<string, Transport>,
  ): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager(config, capabilities, clients, clientTransports);
    }
    return ServerManager.instance;
  }

  public async connectTransport(transport: Transport, sessionId: string): Promise<void> {
    try {
      // Create a new server instance for this transport
      const server = new Server(this.serverConfig, this.serverCapabilities);

      // Collect capabilities and register handlers
      await collectAndRegisterCapabilities(this.clients, server);

      // Initialize the configuration reload service
      configReloadService.initialize(server, this.clientTransports);

      // Connect the transport to the new server instance
      await server.connect(transport);

      // Store the server instance
      this.servers.set(sessionId, server);

      logger.info(`Connected transport for session ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to connect transport for session ${sessionId}:`, error);
      throw error;
    }
  }

  public disconnectTransport(sessionId: string): void {
    const server = this.servers.get(sessionId);
    if (server) {
      this.servers.delete(sessionId);
      logger.info(`Disconnected transport for session ${sessionId}`);
    }
  }

  public getTransport(sessionId: string): Transport | undefined {
    return this.servers.get(sessionId)?.transport;
  }

  public getTransports(): Map<string, Transport> {
    const transports = new Map<string, Transport>();
    for (const [id, server] of this.servers.entries()) {
      if (server.transport) {
        transports.set(id, server.transport);
      }
    }
    return transports;
  }

  public getActiveTransportsCount(): number {
    return this.servers.size;
  }

  public getServer(sessionId: string): Server | undefined {
    return this.servers.get(sessionId);
  }
}
