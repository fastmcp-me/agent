import logger from '../../logger/logger.js';
import { SessionManager, SessionData } from './sessionManager.js';
import { ServerConfigManager } from '../config/serverConfig.js';

export class AuthManager {
  private sessionManager: SessionManager;
  private configManager: ServerConfigManager;

  constructor(sessionStoragePath?: string) {
    this.sessionManager = new SessionManager(sessionStoragePath);
    this.configManager = ServerConfigManager.getInstance();
  }

  public isAuthEnabled(): boolean {
    return this.configManager.isAuthEnabled();
  }

  public validateAccessToken(token: string): SessionData | null {
    if (!this.isAuthEnabled()) {
      return null; // Auth disabled, always valid
    }

    if (!token) {
      return null;
    }

    return this.sessionManager.getSession(token);
  }

  public createAuthCode(clientId: string, redirectUri: string, resource: string): string {
    const ttlMs = this.configManager.getOAuthCodeTtlMs();
    return this.sessionManager.createAuthCode(clientId, redirectUri, resource, ttlMs);
  }

  public exchangeCodeForToken(code: string, clientId: string, redirectUri?: string, resource?: string): string | null {
    const codeData = this.sessionManager.getAuthCode(code);
    if (!codeData) {
      logger.warn(`Invalid or expired auth code: ${code}`);
      return null;
    }

    if (codeData.clientId !== clientId) {
      logger.warn(`Client ID mismatch for code ${code}: expected ${codeData.clientId}, got ${clientId}`);
      return null;
    }

    if (redirectUri && codeData.redirectUri !== redirectUri) {
      logger.warn(`Redirect URI mismatch for code ${code}: expected ${codeData.redirectUri}, got ${redirectUri}`);
      return null;
    }

    if (resource && codeData.resource && codeData.resource !== resource) {
      logger.warn(`Resource mismatch for code ${code}: expected ${codeData.resource}, got ${resource}`);
      return null;
    }

    // Delete the auth code after successful exchange
    this.sessionManager.deleteAuthCode(code);

    // Create access token
    const ttlMs = this.configManager.getOAuthTokenTtlMs();
    const accessToken = this.sessionManager.createSession(clientId, codeData.resource, ttlMs);

    logger.info(`Exchanged code ${code} for token ${accessToken} for client ${clientId}`);
    return accessToken;
  }

  public getTokenInfo(token: string): { clientId: string; resource: string; expiresIn: number } | null {
    const session = this.sessionManager.getSession(token);
    if (!session) {
      return null;
    }

    return {
      clientId: session.clientId,
      resource: session.resource,
      expiresIn: Math.max(0, Math.floor((session.expires - Date.now()) / 1000)),
    };
  }

  public revokeToken(token: string): boolean {
    return this.sessionManager.deleteSession(token);
  }

  public shutdown(): void {
    this.sessionManager.shutdown();
  }
}
