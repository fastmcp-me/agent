import { AUTH_CONFIG } from '../../constants.js';

export interface ServerConfig {
  auth: {
    enabled: boolean;
    sessionTtlMinutes: number;
    sessionStoragePath?: string;
    oauthCodeTtlMs: number;
    oauthTokenTtlMs: number;
  };
}

export class ServerConfigManager {
  private static instance: ServerConfigManager;
  private config: ServerConfig;

  private constructor() {
    this.config = {
      auth: {
        enabled: AUTH_CONFIG.DEFAULT_ENABLED,
        sessionTtlMinutes: AUTH_CONFIG.DEFAULT_SESSION_TTL_MINUTES,
        oauthCodeTtlMs: AUTH_CONFIG.DEFAULT_OAUTH_CODE_TTL_MS,
        oauthTokenTtlMs: AUTH_CONFIG.DEFAULT_OAUTH_TOKEN_TTL_MS,
      },
    };
  }

  public static getInstance(): ServerConfigManager {
    if (!ServerConfigManager.instance) {
      ServerConfigManager.instance = new ServerConfigManager();
    }
    return ServerConfigManager.instance;
  }

  public updateConfig(updates: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.auth) {
      this.config.auth = { ...this.config.auth, ...updates.auth };
    }
  }

  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  public isAuthEnabled(): boolean {
    return this.config.auth.enabled;
  }

  public getSessionTtlMinutes(): number {
    return this.config.auth.sessionTtlMinutes;
  }

  public getSessionStoragePath(): string | undefined {
    return this.config.auth.sessionStoragePath;
  }

  public getOAuthCodeTtlMs(): number {
    return this.config.auth.oauthCodeTtlMs;
  }

  public getOAuthTokenTtlMs(): number {
    return this.config.auth.oauthTokenTtlMs;
  }
}
