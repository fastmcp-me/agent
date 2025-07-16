import { AUTH_CONFIG, HOST, PORT, RATE_LIMIT_CONFIG } from '../../constants.js';

/**
 * Configuration interface for agent-specific settings.
 *
 * Defines the structure for authentication and session management configuration
 * that can be customized via CLI arguments or environment variables.
 */
export interface AgentConfig {
  host: string;
  port: number;
  auth: {
    enabled: boolean;
    sessionTtlMinutes: number;
    sessionStoragePath?: string;
    oauthCodeTtlMs: number;
    oauthTokenTtlMs: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  features: {
    auth: boolean;
    scopeValidation: boolean;
    enhancedSecurity: boolean;
  };
}

/**
 * AgentConfigManager manages agent-specific configuration settings.
 *
 * This singleton class handles authentication and session configuration
 * that differs from the main MCP server configuration. It provides
 * centralized access to agent settings with default values and
 * runtime configuration updates.
 *
 * @example
 * ```typescript
 * const configManager = AgentConfigManager.getInstance();
 * configManager.updateConfig({
 *   auth: { enabled: true, sessionTtlMinutes: 60 }
 * });
 * ```
 */
export class AgentConfigManager {
  private static instance: AgentConfigManager;
  private config: AgentConfig;

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
        oauthCodeTtlMs: AUTH_CONFIG.SERVER.AUTH_CODE.TTL_MS,
        oauthTokenTtlMs: AUTH_CONFIG.SERVER.TOKEN.TTL_MS,
      },
      rateLimit: {
        windowMs: RATE_LIMIT_CONFIG.OAUTH.WINDOW_MS,
        max: RATE_LIMIT_CONFIG.OAUTH.MAX,
      },
      features: {
        auth: AUTH_CONFIG.SERVER.DEFAULT_ENABLED,
        scopeValidation: AUTH_CONFIG.SERVER.DEFAULT_ENABLED,
        enhancedSecurity: false,
      },
    };
  }

  /**
   * Gets the singleton instance of AgentConfigManager.
   *
   * Creates a new instance if one doesn't exist, otherwise returns
   * the existing instance to ensure configuration consistency.
   *
   * @returns The singleton AgentConfigManager instance
   */
  public static getInstance(): AgentConfigManager {
    if (!AgentConfigManager.instance) {
      AgentConfigManager.instance = new AgentConfigManager();
    }
    return AgentConfigManager.instance;
  }

  /**
   * Updates the agent configuration with new values.
   *
   * Merges the provided updates with existing configuration, allowing
   * partial updates while preserving other settings.
   *
   * @param updates - Partial configuration object with new values
   */
  public updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.auth) {
      this.config.auth = { ...this.config.auth, ...updates.auth };
    }
    if (updates.rateLimit) {
      this.config.rateLimit = { ...this.config.rateLimit, ...updates.rateLimit };
    }
    if (updates.features) {
      this.config.features = { ...this.config.features, ...updates.features };
    }
  }

  /**
   * Gets a copy of the current agent configuration.
   *
   * Returns a deep copy to prevent external modification of the
   * internal configuration state.
   *
   * @returns Current agent configuration
   */
  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Checks if authentication is currently enabled.
   *
   * @returns True if OAuth 2.1 authentication is enabled, false otherwise
   */
  public isAuthEnabled(): boolean {
    return this.config.features.auth;
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

  /**
   * Gets the rate limit window in milliseconds.
   *
   * @returns Rate limit window in milliseconds
   */
  public getRateLimitWindowMs(): number {
    return this.config.rateLimit.windowMs;
  }

  /**
   * Gets the maximum number of requests per rate limit window.
   *
   * @returns Maximum requests per window
   */
  public getRateLimitMax(): number {
    return this.config.rateLimit.max;
  }

  /**
   * Checks if scope validation is enabled.
   *
   * @returns True if tag-based scope validation is enabled, false otherwise
   */
  public isScopeValidationEnabled(): boolean {
    return this.config.features.scopeValidation;
  }

  /**
   * Checks if enhanced security middleware is enabled.
   *
   * @returns True if enhanced security middleware is enabled, false otherwise
   */
  public isEnhancedSecurityEnabled(): boolean {
    return this.config.features.enhancedSecurity;
  }
}
