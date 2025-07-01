import logger from '../logger/logger.js';
import { SessionManager, SessionData } from './sessionManager.js';
import { ServerConfigManager } from '../core/server/serverConfig.js';
import { AUTH_CONFIG } from '../constants.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AuthManager handles OAuth 2.1 authentication flow and token validation.
 *
 * This class orchestrates the OAuth 2.1 authorization code grant flow,
 * manages access token validation, and provides session information.
 * It integrates with SessionManager for persistent storage and
 * ServerConfigManager for configuration settings.
 *
 * Features:
 * - OAuth 2.1 authorization code grant flow
 * - Access token validation with prefix support
 * - Session information retrieval
 * - Configurable authentication settings
 *
 * @example
 * ```typescript
 * const authManager = new AuthManager('/custom/sessions');
 * const token = authManager.exchangeCodeForToken('code-123', 'client-456');
 * const session = authManager.validateAccessToken('tk-sess-789');
 * ```
 */
export class AuthManager {
  private sessionManager: SessionManager;
  private configManager: ServerConfigManager;

  /**
   * Creates a new AuthManager instance.
   *
   * Initializes the session manager with optional custom storage path
   * and retrieves the server configuration manager instance.
   *
   * @param sessionStoragePath - Optional custom path for session storage
   */
  constructor(sessionStoragePath?: string) {
    this.sessionManager = new SessionManager(sessionStoragePath);
    this.configManager = ServerConfigManager.getInstance();
  }

  /**
   * Checks if authentication is currently enabled.
   *
   * @returns True if OAuth 2.1 authentication is enabled, false otherwise
   */
  public isAuthEnabled(): boolean {
    return this.configManager.isAuthEnabled();
  }

  /**
   * Validates an access token and returns session data.
   *
   * If authentication is disabled, returns null (always valid).
   * For enabled authentication, strips the token prefix if present
   * and validates the underlying session.
   *
   * @param token - The access token to validate (with or without prefix)
   * @returns Session data if token is valid, null otherwise
   */
  public validateAccessToken(token: string): SessionData | null {
    if (!this.isAuthEnabled()) {
      return null; // Auth disabled, always valid
    }

    if (!token) {
      return null;
    }

    // Strip token prefix if present
    const tokenId = token.startsWith(AUTH_CONFIG.PREFIXES.ACCESS_TOKEN)
      ? token.slice(AUTH_CONFIG.PREFIXES.ACCESS_TOKEN.length)
      : token;

    // Session is stored with 'sess-' + tokenId
    const sessionId = AUTH_CONFIG.PREFIXES.SESSION_ID + tokenId;
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Creates an authorization code for OAuth 2.1 flow.
   *
   * Delegates to the session manager to create a prefixed authorization
   * code with the configured time-to-live.
   *
   * @param clientId - The client identifier
   * @param redirectUri - The redirect URI for this code
   * @param resource - The resource this code grants access to
   * @returns The generated authorization code with prefix
   */
  public createAuthCode(clientId: string, redirectUri: string, resource: string): string {
    const ttlMs = this.configManager.getOAuthCodeTtlMs();
    return this.sessionManager.createAuthCode(clientId, redirectUri, resource, ttlMs);
  }

  /**
   * Exchanges an authorization code for an access token.
   *
   * Validates the authorization code, checks client ID and redirect URI
   * matches, then creates a new access token with the configured TTL.
   * The authorization code is deleted after successful exchange.
   *
   * @param code - The authorization code to exchange
   * @param clientId - The client identifier
   * @param redirectUri - Optional redirect URI for validation
   * @param resource - Optional resource for validation
   * @returns Access token with prefix if exchange successful, null otherwise
   */
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

    // Create access token with prefix and a new UUID
    const rawTokenId = uuidv4();
    const accessToken = AUTH_CONFIG.PREFIXES.ACCESS_TOKEN + rawTokenId;
    const ttlMs = this.configManager.getOAuthTokenTtlMs();
    // Store the session using the rawTokenId (not prefixed)
    this.sessionManager.createSessionWithId(rawTokenId, clientId, codeData.resource, ttlMs);

    logger.info(`Exchanged code ${code} for token ${accessToken} for client ${clientId}`);
    return accessToken;
  }

  /**
   * Gets information about an access token.
   *
   * Retrieves session data for the token and returns formatted
   * information including client ID, resource, and time until expiration.
   *
   * @param token - The access token to get information for
   * @returns Token information if valid, null otherwise
   */
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

  /**
   * Revokes an access token.
   *
   * Removes the session associated with the token from storage.
   *
   * @param token - The access token to revoke
   * @returns True if token was revoked, false if it didn't exist
   */
  public revokeToken(token: string): boolean {
    return this.sessionManager.deleteSession(token);
  }

  /**
   * Performs graceful shutdown of the AuthManager.
   *
   * Delegates shutdown to the session manager to ensure proper
   * cleanup of resources and timers.
   */
  public shutdown(): void {
    this.sessionManager.shutdown();
  }
}
