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

    // Mock path.resolve
    vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));

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
    expect(sessionId).toMatch(/^sess-/);
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
    expect(code).toMatch(/^code-/);
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

  it('should reject session IDs with path traversal attempts', () => {
    const invalidIds = [
      '../evil',
      'sess-../../etc/passwd',
      'sess-..\\windows',
      'sess-..//etc/shadow',
      'sess-..%2Fetc%2Fpasswd',
    ];
    for (const id of invalidIds) {
      expect(sessionManager.getSession(id)).toBeNull();
      expect(sessionManager.deleteSession(id)).toBe(false);
    }
  });

  it('should reject auth codes with path traversal attempts', () => {
    const invalidCodes = [
      '../evil',
      'code-../../etc/passwd',
      'code-..\\windows',
      'code-..//etc/shadow',
      'code-..%2Fetc%2Fpasswd',
    ];
    for (const code of invalidCodes) {
      expect(sessionManager.getAuthCode(code)).toBeNull();
      expect(sessionManager.deleteAuthCode(code)).toBe(false);
    }
  });
});
