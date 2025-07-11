import { Request, Response, NextFunction } from 'express';
import logger from '../../../logger/logger.js';
import { ServerConfigManager } from '../../../core/server/serverConfig.js';
import { SDKOAuthServerProvider } from '../../../auth/sdkOAuthServerProvider.js';
import { hasRequiredScopes, scopesToTags, auditScopeOperation } from '../../../utils/scopeValidation.js';

/**
 * Authentication information structure
 */
export interface AuthInfo {
  token: string;
  clientId: string;
  grantedScopes: string[];
  grantedTags: string[];
}

/**
 * Middleware to validate OAuth scopes against requested tags
 *
 * This middleware:
 * 1. Extracts OAuth token from Authorization header
 * 2. Verifies the token and retrieves granted scopes
 * 3. Validates that requested tags are covered by granted scopes
 * 4. Provides authentication context to downstream handlers
 *
 * When auth is disabled, all tags are allowed.
 * When auth is enabled, only tags covered by granted scopes are allowed.
 */
export default function scopeAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const serverConfig = ServerConfigManager.getInstance();

  // If auth is disabled, allow all tags
  if (!serverConfig.isAuthEnabled()) {
    // Convert any requested tags to validated tags for backward compatibility
    const requestedTags = res.locals.tags || [];
    res.locals.validatedTags = requestedTags;
    next();
    return;
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      auditScopeOperation('missing_authorization', {
        success: false,
        error: 'Missing or invalid Authorization header',
      });

      res.status(401).json({
        error: 'unauthorized',
        error_description: 'Bearer token required',
      });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify token and get granted scopes
    const oauthProvider = new SDKOAuthServerProvider();

    oauthProvider
      .verifyAccessToken(token)
      .then((authInfo) => {
        // Extract granted scopes and convert to tags
        const grantedScopes = authInfo.scopes || [];
        const grantedTags = scopesToTags(grantedScopes);

        // Get requested tags from previous middleware (tagsExtractor)
        const requestedTags = res.locals.tags || [];

        // Validate that all requested tags are covered by granted scopes
        if (!hasRequiredScopes(grantedScopes, requestedTags)) {
          auditScopeOperation('insufficient_scopes', {
            clientId: authInfo.clientId,
            requestedScopes: requestedTags.map((tag: string) => `tag:${tag}`),
            grantedScopes,
            success: false,
            error: 'Insufficient scopes for requested tags',
          });

          res.status(403).json({
            error: 'insufficient_scope',
            error_description: `Insufficient scopes. Required: ${requestedTags.join(', ')}, Granted: ${grantedTags.join(', ')}`,
          });
          return;
        }

        // Provide authentication context to downstream handlers via res.locals
        res.locals.auth = {
          token,
          clientId: authInfo.clientId,
          grantedScopes,
          grantedTags,
        };

        // Provide validated tags to downstream handlers
        // If no specific tags requested, use all granted tags
        res.locals.validatedTags = requestedTags.length > 0 ? requestedTags : grantedTags;

        auditScopeOperation('scope_validation_success', {
          clientId: authInfo.clientId,
          requestedScopes: requestedTags.map((tag: string) => `tag:${tag}`),
          grantedScopes,
          success: true,
        });

        next();
      })
      .catch((error) => {
        auditScopeOperation('token_verification_failed', {
          success: false,
          error: error.message,
        });

        logger.warn('Token verification failed:', error);
        res.status(401).json({
          error: 'invalid_token',
          error_description: 'Invalid or expired access token',
        });
      });
  } catch (error) {
    logger.error('Scope auth middleware error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error',
    });
  }
}

/**
 * Utility function to get validated tags from response locals
 *
 * This should be used by downstream handlers instead of directly accessing res.locals.tags
 * to ensure they get scope-validated tags.
 */
export function getValidatedTags(res: Response): string[] {
  if (!res?.locals?.validatedTags) {
    return [];
  }

  // Ensure it's an array
  if (!Array.isArray(res.locals.validatedTags)) {
    return [];
  }

  return res.locals.validatedTags;
}

/**
 * Utility function to get authentication information from response locals
 */
export function getAuthInfo(res: Response): AuthInfo | undefined {
  if (!res?.locals?.auth) {
    return undefined;
  }

  return res.locals.auth;
}
