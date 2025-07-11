import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import path from 'path';
import fs from 'fs';
import { SDKOAuthServerProvider } from './sdkOAuthServerProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

describe('SDKOAuthProvider', () => {
  let provider: SDKOAuthServerProvider;
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = path.join(tmpdir(), `test-oauth-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    provider = new SDKOAuthServerProvider(tempDir);
  });

  afterEach(() => {
    // Clean up
    provider.shutdown();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('FileBasedClientsStore', () => {
    it('should register and retrieve OAuth clients', () => {
      const clientInfo: OAuthClientInformationFull = {
        client_id: 'test-client-123',
        client_id_issued_at: Math.floor(Date.now() / 1000),
        redirect_uris: ['http://localhost:3000/callback'],
        grant_types: ['authorization_code'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        client_name: 'Test Client',
      };

      // Register a client
      const registered = provider.clientsStore.registerClient?.(clientInfo);
      expect(registered).toEqual(clientInfo);

      // Retrieve the client
      const retrieved = provider.clientsStore.getClient('test-client-123');
      expect(retrieved).toEqual(clientInfo);
    });

    it('should return undefined for non-existent clients', () => {
      const retrieved = provider.clientsStore.getClient('non-existent-client');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('OAuth Server Provider', () => {
    it('should verify access tokens when auth is disabled', async () => {
      // Mock auth disabled
      const configManager = provider['configManager'];
      const originalIsAuthEnabled = configManager.isAuthEnabled;
      configManager.isAuthEnabled = () => false;

      try {
        const authInfo = await provider.verifyAccessToken('any-token');
        expect(authInfo.clientId).toBe('anonymous');
        // When auth is disabled, all available tags are returned as scopes
        expect(authInfo.scopes).toEqual(
          expect.arrayContaining(['tag:context7', 'tag:playwright', 'tag:server-sequential-thinking']),
        );
      } finally {
        // Restore original method
        configManager.isAuthEnabled = originalIsAuthEnabled;
      }
    });

    it('should throw error for invalid tokens when auth is enabled', async () => {
      // Mock auth enabled
      const configManager = provider['configManager'];
      const originalIsAuthEnabled = configManager.isAuthEnabled;
      configManager.isAuthEnabled = () => true;

      try {
        await expect(provider.verifyAccessToken('invalid-token')).rejects.toThrow('Invalid or expired access token');
      } finally {
        // Restore original method
        configManager.isAuthEnabled = originalIsAuthEnabled;
      }
    });
  });
});
