import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import logger from '../logger/logger.js';
import { SessionManager } from './sessionManager.js';
import { ServerConfigManager } from '../core/server/serverConfig.js';
import { AUTH_CONFIG } from '../constants.js';

/**
 * File-based OAuth clients store implementation using AUTH_CONFIG settings
 */
class FileBasedClientsStore implements OAuthRegisteredClientsStore {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  getClient(clientId: string): OAuthClientInformationFull | undefined {
    const clientKey = this.getClientKey(clientId);
    const clientSession = this.sessionManager.getSession(clientKey);

    if (!clientSession?.data) {
      return undefined;
    }

    try {
      return JSON.parse(clientSession.data) as OAuthClientInformationFull;
    } catch (error) {
      logger.error(`Failed to parse client data for ${clientId}:`, error);
      return undefined;
    }
  }

  registerClient(client: OAuthClientInformationFull): OAuthClientInformationFull {
    const clientKey = this.getClientKey(client.client_id);
    // Store client for 30 days (same as original implementation)
    const ttlMs = AUTH_CONFIG.CLIENT.OAUTH.TTL_MS;

    try {
      this.sessionManager.createSessionWithData(clientKey, JSON.stringify(client), ttlMs);
      logger.info(`Registered OAuth client: ${client.client_id}`);
      return client;
    } catch (error) {
      logger.error(`Failed to register client ${client.client_id}:`, error);
      throw error;
    }
  }

  private getClientKey(clientId: string): string {
    // Create a deterministic UUID-like key from the client ID for consistent retrieval
    // We need to ensure this passes the session ID validation which expects sess- + UUID format
    const hashInput = `${AUTH_CONFIG.CLIENT.PREFIXES.CLIENT}${clientId}`;
    // Generate a deterministic UUID-like string using a simple hash
    const hash = this.hashToUuid(hashInput);
    return `sess-${hash}`;
  }

  private hashToUuid(input: string): string {
    // Simple hash to UUID conversion (not cryptographically secure, but deterministic)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert hash to a UUID-like format
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    const uuid = `${hashStr.slice(0, 8)}-${hashStr.slice(0, 4)}-4${hashStr.slice(1, 4)}-8${hashStr.slice(4, 7)}-${hashStr.repeat(3).slice(0, 12)}`;
    return uuid;
  }
}

/**
 * Implementation of SDK's OAuthServerProvider interface using existing SessionManager.
 *
 * This provider implements OAuth 2.1 server functionality using the MCP SDK's interfaces
 * while maintaining compatibility with the existing session storage system.
 */
export class SDKOAuthServerProvider implements OAuthServerProvider {
  private sessionManager: SessionManager;
  private configManager: ServerConfigManager;
  private _clientsStore: OAuthRegisteredClientsStore;

  constructor(sessionStoragePath?: string) {
    this.sessionManager = new SessionManager(sessionStoragePath);
    this.configManager = ServerConfigManager.getInstance();
    this._clientsStore = new FileBasedClientsStore(this.sessionManager);
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  /**
   * Handles the authorization request by auto-approving and redirecting
   */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    try {
      // Create authorization code
      const metadata = {
        scopes: params.scopes || [],
        resource: params.resource?.toString() || '',
        codeChallenge: params.codeChallenge,
        redirectUri: params.redirectUri,
      };

      const ttlMs = this.configManager.getOAuthCodeTtlMs();
      const code = this.sessionManager.createAuthCode(
        client.client_id,
        params.redirectUri,
        JSON.stringify(metadata),
        ttlMs,
      );

      // Build redirect URL
      const redirectUrl = new URL(params.redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (params.state) {
        redirectUrl.searchParams.set('state', params.state);
      }

      logger.info(`OAuth authorization granted for client ${client.client_id}`, {
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        scopes: params.scopes,
      });

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
    }
  }

  /**
   * Retrieves the PKCE challenge for an authorization code
   */
  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const codeData = this.sessionManager.getAuthCode(authorizationCode);
    if (!codeData || codeData.clientId !== client.client_id) {
      throw new Error('Invalid authorization code');
    }

    try {
      const metadata = JSON.parse(codeData.resource);
      return metadata.codeChallenge || '';
    } catch (_e) {
      return '';
    }
  }

  /**
   * Exchanges authorization code for access token
   */
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    // Note: code verifier is checked in SDK's token.ts by default
    // it's unused here for that reason.
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const codeData = this.sessionManager.getAuthCode(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid or expired authorization code');
    }

    // Validate client ID
    if (codeData.clientId !== client.client_id) {
      throw new Error('Client ID mismatch');
    }

    // Validate redirect URI if provided
    if (redirectUri && codeData.redirectUri !== redirectUri) {
      throw new Error('Redirect URI mismatch');
    }

    // Parse metadata to check PKCE and other parameters
    let metadata: any = {};
    try {
      metadata = JSON.parse(codeData.resource);
    } catch (_e) {
      // Legacy format, treat as plain resource string
      metadata = { resource: codeData.resource };
    }

    // Validate resource if provided
    if (resource && metadata.resource && metadata.resource !== resource.toString()) {
      throw new Error('Resource mismatch');
    }

    // Delete the authorization code (one-time use)
    this.sessionManager.deleteAuthCode(authorizationCode);

    // Create access token
    const tokenId = randomUUID();
    const accessToken = AUTH_CONFIG.SERVER.PREFIXES.ACCESS_TOKEN + tokenId;
    const ttlMs = this.configManager.getOAuthTokenTtlMs();

    // Store session for token validation
    this.sessionManager.createSessionWithId(tokenId, client.client_id, metadata.resource || '', ttlMs);

    const tokens: OAuthTokens = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor(ttlMs / 1000),
      scope: metadata.scopes ? metadata.scopes.join(' ') : '',
    };

    logger.info(`Exchanged authorization code for access token`, {
      clientId: client.client_id,
      tokenId: tokenId.substring(0, 8) + '...',
      expiresIn: tokens.expires_in,
    });

    return tokens;
  }

  /**
   * Exchanges refresh token for new access token (not implemented)
   */
  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    _refreshToken: string,
    _scopes?: string[],
    _resource?: URL,
  ): Promise<OAuthTokens> {
    throw new Error('Refresh tokens not supported');
  }

  /**
   * Verifies access token and returns auth info
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (!this.configManager.isAuthEnabled()) {
      // Auth disabled, return minimal auth info
      return {
        token,
        clientId: 'anonymous',
        scopes: [],
      };
    }

    // Strip prefix if present
    const tokenId = token.startsWith(AUTH_CONFIG.SERVER.PREFIXES.ACCESS_TOKEN)
      ? token.slice(AUTH_CONFIG.SERVER.PREFIXES.ACCESS_TOKEN.length)
      : token;

    // Get session data
    const sessionId = AUTH_CONFIG.SERVER.PREFIXES.SESSION_ID + tokenId;
    const sessionData = this.sessionManager.getSession(sessionId);

    if (!sessionData) {
      throw new Error('Invalid or expired access token');
    }

    return {
      token,
      clientId: sessionData.clientId,
      scopes: [], // Could be extracted from session data if stored
      expiresAt: sessionData.expires,
      resource: sessionData.resource ? new URL(sessionData.resource) : undefined,
    };
  }

  /**
   * Revokes a token
   */
  async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    const token = request.token;

    // Strip prefix if present
    const tokenId = token.startsWith(AUTH_CONFIG.SERVER.PREFIXES.ACCESS_TOKEN)
      ? token.slice(AUTH_CONFIG.SERVER.PREFIXES.ACCESS_TOKEN.length)
      : token;

    const sessionId = AUTH_CONFIG.SERVER.PREFIXES.SESSION_ID + tokenId;
    const success = this.sessionManager.deleteSession(sessionId);

    if (success) {
      logger.info(`Revoked access token for client ${client.client_id}`, {
        tokenId: tokenId.substring(0, 8) + '...',
      });
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    this.sessionManager.shutdown();
  }
}
