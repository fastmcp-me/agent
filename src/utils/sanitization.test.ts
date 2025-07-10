import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeServerName,
  sanitizeServerNameForDisplay,
  sanitizeUrlParam,
  sanitizeErrorMessage,
  sanitizeServerNameForContext,
} from './sanitization.js';

describe('escapeHtml', () => {
  it('should escape HTML entities', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml('Hello & "World"')).toBe('Hello &amp; &quot;World&quot;');
    expect(escapeHtml("It's a 'test'")).toBe('It&#039;s a &#039;test&#039;');
  });

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as any)).toBe('');
    expect(escapeHtml(undefined as any)).toBe('');
  });

  it('should handle normal text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('12345')).toBe('12345');
  });
});

describe('sanitizeServerName', () => {
  it('should sanitize server names for filenames', () => {
    expect(sanitizeServerName('my-server')).toBe('my-server');
    expect(sanitizeServerName('my_server')).toBe('my_server');
    expect(sanitizeServerName('my.server')).toBe('my_server');
    expect(sanitizeServerName('my/server')).toBe('my_server');
    expect(sanitizeServerName('my\\server')).toBe('my_server');
  });

  it('should handle consecutive underscores', () => {
    expect(sanitizeServerName('my___server')).toBe('my_server');
    expect(sanitizeServerName('___my-server___')).toBe('my-server');
  });

  it('should handle empty or invalid names', () => {
    expect(sanitizeServerName('')).toBe('default');
    expect(sanitizeServerName('___')).toBe('default');
    expect(sanitizeServerName(null as any)).toBe('default');
    expect(sanitizeServerName(undefined as any)).toBe('default');
  });

  it('should limit length', () => {
    const longName = 'a'.repeat(200);
    expect(sanitizeServerName(longName)).toBe('a'.repeat(100));
  });
});

describe('sanitizeServerNameForDisplay', () => {
  it('should preserve more characters for display', () => {
    expect(sanitizeServerNameForDisplay('my-server.com')).toBe('my-server.com');
    expect(sanitizeServerNameForDisplay('my server (test)')).toBe('my server (test)');
  });

  it('should still escape dangerous characters', () => {
    expect(sanitizeServerNameForDisplay('my<script>server')).toBe('my_script_server');
    expect(sanitizeServerNameForDisplay('my"server')).toBe('my_server');
  });

  it('should have longer length limit', () => {
    const longName = 'a'.repeat(300);
    expect(sanitizeServerNameForDisplay(longName)).toBe('a'.repeat(200));
  });
});

describe('sanitizeUrlParam', () => {
  it('should URL encode parameters', () => {
    expect(sanitizeUrlParam('hello world')).toBe('hello%20world');
    expect(sanitizeUrlParam('hello+world')).toBe('hello%2Bworld');
    expect(sanitizeUrlParam('hello&world')).toBe('hello%26world');
  });

  it('should handle empty strings', () => {
    expect(sanitizeUrlParam('')).toBe('');
    expect(sanitizeUrlParam(null as any)).toBe('');
    expect(sanitizeUrlParam(undefined as any)).toBe('');
  });

  it('should limit length', () => {
    const longParam = 'a'.repeat(600);
    expect(sanitizeUrlParam(longParam).length).toBeLessThanOrEqual(500);
  });
});

describe('sanitizeErrorMessage', () => {
  it('should redact sensitive information', () => {
    expect(sanitizeErrorMessage('Error: password: secret123')).toBe('Error: password: [REDACTED]');
    expect(sanitizeErrorMessage('Token: abc123 failed')).toBe('Token: [REDACTED] failed');
    expect(sanitizeErrorMessage('Invalid key: xyz789')).toBe('Invalid key: [REDACTED]');
    expect(sanitizeErrorMessage('Auth=bearer token123')).toBe('auth=[REDACTED] token123');
  });

  it('should escape HTML in error messages', () => {
    expect(sanitizeErrorMessage('Error: <script>alert("xss")</script>')).toBe(
      'Error: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('should handle case insensitive redaction', () => {
    expect(sanitizeErrorMessage('PASSWORD: secret123')).toBe('PASSWORD: [REDACTED]');
    expect(sanitizeErrorMessage('Secret: abc123')).toBe('Secret: [REDACTED]');
  });

  it('should limit length', () => {
    const longError = 'Error: ' + 'a'.repeat(2000);
    expect(sanitizeErrorMessage(longError).length).toBeLessThanOrEqual(1000);
  });
});

describe('sanitizeServerNameForContext', () => {
  const testName = 'my-server.test';

  it('should apply filename sanitization', () => {
    expect(sanitizeServerNameForContext(testName, 'filename')).toBe('my-server_test');
  });

  it('should apply display sanitization', () => {
    expect(sanitizeServerNameForContext(testName, 'display')).toBe('my-server.test');
  });

  it('should apply URL sanitization', () => {
    expect(sanitizeServerNameForContext(testName, 'url')).toBe('my-server.test');
  });

  it('should apply HTML sanitization', () => {
    const htmlName = 'my-server<script>';
    expect(sanitizeServerNameForContext(htmlName, 'html')).toBe('my-server_script');
  });

  it('should default to filename sanitization', () => {
    expect(sanitizeServerNameForContext(testName, 'unknown' as any)).toBe('my-server_test');
  });
});
