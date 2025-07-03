import { AUTH_CONFIG, HOST, PORT } from '../../constants.js';

/**
 * Configuration interface for server-specific settings.
 *
 * Defines the structure for authentication and session management configuration
 * that can be customized via CLI arguments or environment variables.
 */
export interface ServerConfig {
  host: string;
  port: number;
  auth: {
    enabled: boolean;
    sessionTtlMinutes: number;
    sessionStoragePath?: string;
    oauthCodeTtlMs: number;
    oauthTokenTtlMs: number;
  };
}

/**
 * ServerConfigManager manages server-specific configuration settings.
 *
 * This singleton class handles authentication and session configuration
 * that differs from the main MCP server configuration. It provides
 * centralized access to server settings with default values and
 * runtime configuration updates.
 *
 * @example
 * ```typescript
 * const configManager = ServerConfigManager.getInstance();
 * configManager.updateConfig({
 *   auth: { enabled: true, sessionTtlMinutes: 60 }
 * });
 * ```
 */
export class ServerConfigManager {
  private static instance: ServerConfigManager;
  private config: ServerConfig;

  /**
   * Private constructor to enforce singleton pattern.
   *
   * Initializes the configuration with default values from constants.
   * Should not be called directly - use getInstance() instead.
   */
  private constructor() {
    this.config = {
      host: HOST,
      port: PORT,
      auth: {
        enabled: AUTH_CONFIG.SERVER.DEFAULT_ENABLED,
        sessionTtlMinutes: AUTH_CONFIG.SERVER.SESSION.TTL_MINUTES,
        oauthCodeTtlMs: AUTH_CONFIG.SERVER.OAUTH.CODE_TTL_MS,
        oauthTokenTtlMs: AUTH_CONFIG.SERVER.OAUTH.TOKEN_TTL_MS,
      },
    };
  }

  /**
   * Gets the singleton instance of ServerConfigManager.
   *
   * Creates a new instance if one doesn't exist, otherwise returns
   * the existing instance to ensure configuration consistency.
   *
   * @returns The singleton ServerConfigManager instance
   */
  public static getInstance(): ServerConfigManager {
    if (!ServerConfigManager.instance) {
      ServerConfigManager.instance = new ServerConfigManager();
    }
    return ServerConfigManager.instance;
  }

  /**
   * Updates the server configuration with new values.
   *
   * Merges the provided updates with existing configuration, allowing
   * partial updates while preserving other settings.
   *
   * @param updates - Partial configuration object with new values
   */
  public updateConfig(updates: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.auth) {
      this.config.auth = { ...this.config.auth, ...updates.auth };
    }
  }

  /**
   * Gets a copy of the current server configuration.
   *
   * Returns a deep copy to prevent external modification of the
   * internal configuration state.
   *
   * @returns Current server configuration
   */
  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Checks if authentication is currently enabled.
   *
   * @returns True if OAuth 2.1 authentication is enabled, false otherwise
   */
  public isAuthEnabled(): boolean {
    return this.config.auth.enabled;
  }

  /**
   * Gets the session time-to-live in minutes.
   *
   * @returns Session TTL in minutes
   */
  public getSessionTtlMinutes(): number {
    return this.config.auth.sessionTtlMinutes;
  }

  /**
   * Gets the custom session storage path if configured.
   *
   * @returns Custom session storage path or undefined if using default
   */
  public getSessionStoragePath(): string | undefined {
    return this.config.auth.sessionStoragePath;
  }

  /**
   * Gets the OAuth authorization code time-to-live in milliseconds.
   *
   * @returns OAuth code TTL in milliseconds
   */
  public getOAuthCodeTtlMs(): number {
    return this.config.auth.oauthCodeTtlMs;
  }

  /**
   * Gets the OAuth access token time-to-live in milliseconds.
   *
   * @returns OAuth token TTL in milliseconds
   */
  public getOAuthTokenTtlMs(): number {
    return this.config.auth.oauthTokenTtlMs;
  }
}
