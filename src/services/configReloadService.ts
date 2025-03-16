import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import logger from '../logger.js';
import configManager, { ConfigChangeEvent } from '../config/configManager.js';
import { createTransports } from '../config/transportConfig.js';
import { createClients } from '../clients/clientManager.js';
import { collectAndRegisterCapabilities } from '../capabilities/capabilityManager.js';

/**
 * Service to handle dynamic configuration reloading
 */
export class ConfigReloadService {
    private static instance: ConfigReloadService;
    private server: Server | null = null;
    private currentTransports: Record<string, Transport> = {};
    private isReloading = false;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {}

    /**
     * Get the singleton instance of the ConfigReloadService
     * @returns The ConfigReloadService instance
     */
    public static getInstance(): ConfigReloadService {
        if (!ConfigReloadService.instance) {
            ConfigReloadService.instance = new ConfigReloadService();
        }
        return ConfigReloadService.instance;
    }

    /**
     * Initialize the service with the server instance
     * @param server The MCP server instance
     * @param initialTransports The initial transports
     */
    public initialize(server: Server, initialTransports: Record<string, Transport>): void {
        this.server = server;
        this.currentTransports = initialTransports;

        // Set up configuration change listener
        configManager.on(ConfigChangeEvent.TRANSPORT_CONFIG_CHANGED, this.handleConfigChange.bind(this));

        // Start watching for configuration changes
        configManager.startWatching();

        logger.info('Config reload service initialized');
    }

    /**
     * Handle configuration changes
     * @param newConfig The new transport configuration
     */
    private async handleConfigChange(newConfig: Record<string, any>): Promise<void> {
        if (!this.server || this.isReloading) {
            return;
        }

        this.isReloading = true;
        logger.info('Handling configuration change...');

        try {
            // Create new transports from updated configuration
            const newTransports = createTransports();

            // Disconnect and clean up old transports that are no longer in the config
            // or have changed configuration
            const transportKeysToRemove = Object.keys(this.currentTransports).filter(
                (key) =>
                    !newTransports[key] ||
                    JSON.stringify(newConfig[key]) !== JSON.stringify(configManager.getTransportConfig()[key]),
            );

            for (const key of transportKeysToRemove) {
                try {
                    const transport = this.currentTransports[key];
                    // Attempt to close the transport if possible
                    // Note: Transport interface might not have a standard disconnect method,
                    // but we can safely try to close it if it's a closeable transport
                    if (transport && 'close' in transport && typeof (transport as any).close === 'function') {
                        await (transport as any).close();
                        logger.info(`Closed transport: ${key}`);
                    }
                } catch (error) {
                    logger.error(`Error closing transport ${key}: ${error}`);
                }
            }

            // Create clients for the new transports
            const newClients = await createClients(newTransports);

            // Recollect and register capabilities with the server
            await collectAndRegisterCapabilities(newClients, this.server);

            // Update current transports
            this.currentTransports = newTransports;

            logger.info('Configuration reload completed successfully');
        } catch (error) {
            logger.error(`Failed to reload configuration: ${error}`);
        } finally {
            this.isReloading = false;
        }
    }

    /**
     * Stop the service and clean up resources
     */
    public stop(): void {
        configManager.stopWatching();
        configManager.removeAllListeners(ConfigChangeEvent.TRANSPORT_CONFIG_CHANGED);
        logger.info('Config reload service stopped');
    }
}

export default ConfigReloadService.getInstance();
