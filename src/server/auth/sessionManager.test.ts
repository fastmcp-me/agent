import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionManager } from './sessionManager.js';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  const mockStoragePath = '/tmp/test-sessions';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fs.existsSync to return false initially
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Mock fs.mkdirSync
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

    // Mock fs.writeFileSync
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    // Mock fs.readFileSync with future expiration time
    const futureTime = Date.now() + 60000; // 1 minute in the future
    vi.mocked(fs.readFileSync).mockImplementation(() =>
      JSON.stringify({
        clientId: 'test',
        resource: '',
        expires: futureTime,
        createdAt: Date.now(),
      }),
    );

    // Mock fs.unlinkSync
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

    // Mock fs.readdirSync
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    // Mock path.join
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

    sessionManager = new SessionManager(mockStoragePath);
  });

  afterEach(() => {
    sessionManager.shutdown();
  });

  it('should create session directory if it does not exist', () => {
    expect(fs.mkdirSync).toHaveBeenCalledWith(mockStoragePath, { recursive: true });
  });

  it('should create a session successfully', () => {
    const clientId = 'test-client';
    const resource = 'test-resource';
    const ttlMs = 60000; // 1 minute

    const sessionId = sessionManager.createSession(clientId, resource, ttlMs);

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should get a valid session', () => {
    // Mock fs.existsSync to return true for existing session
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const sessionId = 'test-session-id';
    const session = sessionManager.getSession(sessionId);

    expect(session).toBeDefined();
    expect(session?.clientId).toBe('test');
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('should return null for non-existent session', () => {
    // Mock fs.existsSync to return false for non-existent session
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const sessionId = 'non-existent-session';
    const session = sessionManager.getSession(sessionId);

    expect(session).toBeNull();
  });

  it('should delete a session successfully', () => {
    // Mock fs.existsSync to return true for existing session
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const sessionId = 'test-session-id';
    const result = sessionManager.deleteSession(sessionId);

    expect(result).toBe(true);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('should create auth code successfully', () => {
    const clientId = 'test-client';
    const redirectUri = 'http://localhost:3000/callback';
    const resource = 'test-resource';
    const ttlMs = 60000; // 1 minute

    const code = sessionManager.createAuthCode(clientId, redirectUri, resource, ttlMs);

    expect(code).toBeDefined();
    expect(typeof code).toBe('string');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should get a valid auth code', () => {
    // Mock fs.existsSync to return true for existing auth code
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const code = 'test-auth-code';
    const authCode = sessionManager.getAuthCode(code);

    expect(authCode).toBeDefined();
    expect(authCode?.clientId).toBe('test');
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('should delete auth code successfully', () => {
    // Mock fs.existsSync to return true for existing auth code
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const code = 'test-auth-code';
    const result = sessionManager.deleteAuthCode(code);

    expect(result).toBe(true);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});
