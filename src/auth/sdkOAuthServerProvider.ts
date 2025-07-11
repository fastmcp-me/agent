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
import { ServerSessionManager } from './serverSessionManager.js';
import { ServerConfigManager } from '../core/server/serverConfig.js';
import { AUTH_CONFIG } from '../constants.js';
import {
  validateScopesAgainstAvailableTags,
  tagsToScopes,
  scopesToTags,
  auditScopeOperation,
} from '../utils/scopeValidation.js';
import { ConfigManager } from '../config/configManager.js';

/**
 * File-based OAuth clients store implementation using AUTH_CONFIG settings
 */
class FileBasedClientsStore implements OAuthRegisteredClientsStore {
  private sessionManager: ServerSessionManager;

  constructor(sessionManager: ServerSessionManager) {
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
  private sessionManager: ServerSessionManager;
  private configManager: ServerConfigManager;
  private _clientsStore: OAuthRegisteredClientsStore;

  constructor(sessionStoragePath?: string) {
    this.sessionManager = new ServerSessionManager(sessionStoragePath);
    this.configManager = ServerConfigManager.getInstance();
    this._clientsStore = new FileBasedClientsStore(this.sessionManager);
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  /**
   * Handles the authorization request with scope validation and user consent
   */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    try {
      // Get requested scopes (default to all available tags if none specified)
      const requestedScopes = params.scopes || [];
      const configManager = ConfigManager.getInstance();
      const availableTags = configManager.getAvailableTags();

      // If no scopes requested, default to all available tags
      const finalScopes = requestedScopes.length > 0 ? requestedScopes : tagsToScopes(availableTags);

      // Validate requested scopes against available tags
      const validation = validateScopesAgainstAvailableTags(finalScopes, availableTags);

      if (!validation.isValid) {
        auditScopeOperation('scope_validation_failed', {
          clientId: client.client_id,
          requestedScopes: finalScopes,
          success: false,
          error: validation.errors.join(', '),
        });

        logger.warn(`Invalid scopes requested by client ${client.client_id}`, {
          requestedScopes: finalScopes,
          errors: validation.errors,
        });

        res.status(400).json({
          error: 'invalid_scope',
          error_description: `Invalid scopes: ${validation.errors.join(', ')}`,
        });
        return;
      }

      // Check if this is a direct authorization (auto-approve) or requires user consent
      const requiresUserConsent = this.requiresUserConsent(client, finalScopes);

      if (requiresUserConsent) {
        // Show consent page
        await this.renderConsentPage(client, params, finalScopes, availableTags, res);
      } else {
        // Auto-approve with validated scopes
        await this.approveAuthorization(client, params, validation.validScopes, res);
      }
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
    }
  }

  /**
   * Determines if user consent is required for the authorization
   */
  private requiresUserConsent(_client: OAuthClientInformationFull, _scopes: string[]): boolean {
    // For now, always require user consent for security
    // In the future, this could be configurable based on client trust level
    return true;
  }

  /**
   * Renders the consent page for scope selection
   */
  private async renderConsentPage(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    requestedScopes: string[],
    availableTags: string[],
    res: Response,
  ): Promise<void> {
    const scopeTags = scopesToTags(requestedScopes);
    const consentPageHtml = this.generateConsentPageHtml(client, params, scopeTags, availableTags);

    // Remove any CSP that might interfere with form submission
    res.removeHeader('Content-Security-Policy');
    res.set('Content-Type', 'text/html');
    res.send(consentPageHtml);
  }

  /**
   * Approves the authorization and redirects back to client
   */
  public async approveAuthorization(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    grantedScopes: string[],
    res: Response,
  ): Promise<void> {
    // Create authorization code with granted scopes
    const metadata = {
      scopes: grantedScopes,
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

    auditScopeOperation('authorization_granted', {
      clientId: client.client_id,
      requestedScopes: params.scopes || [],
      grantedScopes,
      success: true,
    });

    logger.info(`OAuth authorization granted for client ${client.client_id}`, {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      grantedScopes,
    });

    res.redirect(redirectUrl.toString());
  }

  /**
   * Generates the HTML for the consent page
   */
  private generateConsentPageHtml(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    requestedTags: string[],
    availableTags: string[],
  ): string {
    const clientName = client.client_name || client.client_id;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Authorize ${clientName}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 20px; }
        .app-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .scopes-section { margin-bottom: 25px; }
        .scope-item { display: flex; align-items: center; margin-bottom: 10px; }
        .scope-item input { margin-right: 10px; }
        .scope-item label { flex: 1; }
        .tag-description { font-size: 0.9em; color: #666; margin-left: 25px; }
        .buttons { display: flex; gap: 10px; justify-content: flex-end; }
        .btn { padding: 10px 20px; border-radius: 4px; font-size: 14px; cursor: pointer; }
        .btn-primary { background: #007bff; color: white; border: none; }
        .btn-secondary { background: #6c757d; color: white; border: none; }
        .btn:hover { opacity: 0.9; }
        .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Authorize Application</h1>
        
        <div class="app-info">
            <strong>${clientName}</strong> is requesting access to your MCP servers.
        </div>
        
        <div class="security-notice">
            <strong>Security Notice:</strong> Only grant access to server groups that this application needs.
        </div>
        
        <form method="POST" action="/oauth/consent">
            <input type="hidden" name="client_id" value="${client.client_id}">
            <input type="hidden" name="redirect_uri" value="${params.redirectUri}">
            <input type="hidden" name="code_challenge" value="${params.codeChallenge || ''}">
            <input type="hidden" name="code_challenge_method" value="S256">
            <input type="hidden" name="state" value="${params.state || ''}">
            <input type="hidden" name="resource" value="${params.resource?.toString() || ''}">
            
            <div class="scopes-section">
                <h3>Server Access Permissions</h3>
                <p>Select which server groups this application can access:</p>
                
                ${availableTags
                  .map(
                    (tag) => `
                    <div class="scope-item">
                        <input type="checkbox" 
                               id="scope_${tag}" 
                               name="scopes" 
                               value="tag:${tag}"
                               ${requestedTags.includes(tag) ? 'checked' : ''}>
                        <label for="scope_${tag}">
                            <strong>${tag}</strong> servers
                        </label>
                    </div>
                    <div class="tag-description">
                        Access servers tagged with "${tag}"
                    </div>
                `,
                  )
                  .join('')}
            </div>
            
            <div class="buttons">
                <button type="submit" name="action" value="deny" class="btn btn-secondary">Deny</button>
                <button type="submit" name="action" value="approve" class="btn btn-primary">Approve</button>
            </div>
        </form>
    </div>
</body>
</html>
    `;
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
   * Verifies access token and returns auth info with granted scopes
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (!this.configManager.isAuthEnabled()) {
      // Auth disabled, return minimal auth info with all available tags as scopes
      const configManager = ConfigManager.getInstance();
      const availableTags = configManager.getAvailableTags();
      return {
        token,
        clientId: 'anonymous',
        scopes: tagsToScopes(availableTags),
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

    // Extract scopes from session resource (stored during authorization)
    let scopes: string[] = [];
    if (sessionData.resource) {
      try {
        const metadata = JSON.parse(sessionData.resource);
        scopes = metadata.scopes || [];
      } catch (error) {
        logger.warn(`Failed to parse session metadata for token ${tokenId}:`, error);
      }
    }

    return {
      token,
      clientId: sessionData.clientId,
      scopes,
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
