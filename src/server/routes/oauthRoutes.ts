import express from 'express';
import bodyParser from 'body-parser';
import { randomUUID } from 'node:crypto';
import logger from '../../logger/logger.js';
import { AuthManager } from '../auth/authManager.js';
import { ServerConfigManager } from '../config/serverConfig.js';

export function setupOAuthRoutes(app: express.Application, authManager: AuthManager): void {
  const configManager = ServerConfigManager.getInstance();
  const DEFAULT_REDIRECT_PATH = '/oauth/callback';

  // /authorize endpoint (auto-approve)
  app.get('/authorize', (req, res) => {
    logger.info('[OAuth] /authorize request', { query: req.query, headers: req.headers });

    const {
      response_type,
      client_id,
      redirect_uri,
      state,
      resource,
      code_challenge: _code_challenge,
      code_challenge_method: _code_challenge_method,
    } = req.query;

    if (response_type !== 'code' || !client_id) {
      logger.warn('[OAuth] /authorize invalid request', { response_type, client_id });
      res.status(400).json({ error: 'invalid_request' });
      return;
    }

    // Accept S256 or plain for code_challenge_method (not enforced for local dev)
    // Use default redirect URI if not provided
    const port = (req.socket.localPort || 80).toString();
    const defaultRedirect = `http://localhost:${port}${DEFAULT_REDIRECT_PATH}`;
    const redirect = typeof redirect_uri === 'string' ? redirect_uri : defaultRedirect;

    const code = authManager.createAuthCode(
      client_id as string,
      redirect,
      typeof resource === 'string' ? resource : '',
    );

    // Build redirect URL
    const url = new URL(redirect);
    url.searchParams.set('code', code);
    if (state) url.searchParams.set('state', state as string);

    logger.info('[OAuth] /authorize success', { client_id, code, redirect: url.toString() });
    res.redirect(url.toString());
  });

  // /token endpoint
  app.post('/token', bodyParser.urlencoded({ extended: false }), (req, res) => {
    logger.info('[OAuth] /token request', { body: req.body, headers: req.headers });

    const { grant_type, code, client_id, redirect_uri, resource } = req.body;

    if (grant_type !== 'authorization_code' || !code || !client_id) {
      logger.warn('[OAuth] /token invalid request', { grant_type, code: !!code, client_id });
      res.status(400).json({ error: 'invalid_request' });
      return;
    }

    const accessToken = authManager.exchangeCodeForToken(code, client_id, redirect_uri, resource);

    if (!accessToken) {
      logger.warn('[OAuth] /token invalid grant', { code, client_id });
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    const ttlMs = configManager.getOAuthTokenTtlMs();
    logger.info('[OAuth] /token success', { client_id, accessToken });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ttlMs / 1000,
      scope: '',
    });
  });

  // OAuth 2.0 Authorization Server Metadata (RFC8414)
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    logger.info('[OAuth] metadata request', { url: req.url });
    const port = (req.socket.localPort || 80).toString();
    const issuer = `http://localhost:${port}`;

    res.json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      registration_endpoint: `${issuer}/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: ['none'],
    });
  });

  // MCP Resource Metadata (RFC9728)
  app.get('/mcp-resource-metadata', (req, res) => {
    logger.info('[OAuth] resource metadata request', { url: req.url });
    const port = (req.socket.localPort || 80).toString();
    const issuer = `http://localhost:${port}`;

    res.json({
      authorization_servers: [`${issuer}/.well-known/oauth-authorization-server`],
      resource: issuer,
    });
  });

  // OAuth 2.0 Protected Resource Metadata (RFC9728) well-known endpoint
  app.get('/.well-known/oauth-protected-resource', (req, res) => {
    logger.info('[OAuth] protected resource metadata request', { url: req.url });
    const port = (req.socket.localPort || 80).toString();
    const issuer = `http://localhost:${port}`;

    res.json({
      authorization_servers: [`${issuer}/.well-known/oauth-authorization-server`],
      resource: issuer,
    });
  });

  // OAuth 2.0 Dynamic Client Registration (RFC7591)
  app.post('/register', bodyParser.json(), (req, res) => {
    logger.info('[OAuth] client registration request', { body: req.body });

    // Accept any registration, auto-approve
    const clientId = randomUUID();

    logger.info('[OAuth] client registration success', { clientId });
    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      token_endpoint_auth_method: 'none',
      ...req.body,
    });
  });
}
