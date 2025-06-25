import express from 'express';
import logger from '../../logger/logger.js';
import { AuthManager } from './authManager.js';

export function createAuthMiddleware(authManager: AuthManager) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip auth if disabled
    if (!authManager.isAuthEnabled()) {
      return next();
    }

    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      logger.warn('Missing Bearer token in request', {
        url: req.url,
        method: req.method,
        headers: req.headers,
      });
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing Bearer token',
      });
      return;
    }

    const token = auth.slice('Bearer '.length);
    const sessionData = authManager.validateAccessToken(token);

    if (!sessionData) {
      logger.warn('Invalid or expired token', {
        url: req.url,
        method: req.method,
        token: token.substring(0, 8) + '...',
      });
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired token',
      });
      return;
    }

    // Add session data to request for downstream use
    req.sessionData = sessionData;
    logger.debug('Valid token for request', {
      url: req.url,
      method: req.method,
      clientId: sessionData.clientId,
    });

    next();
  };
}

// Extend Express Request interface to include session data
declare global {
  namespace Express {
    interface Request {
      sessionData?: {
        clientId: string;
        resource: string;
        expires: number;
        createdAt: number;
      };
    }
  }
}
