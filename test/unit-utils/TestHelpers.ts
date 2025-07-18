import { vi, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { createMockLogger } from './MockFactories.js';

/**
 * Common test helper utilities
 */
export class TestHelpers {
  /**
   * Create a temporary directory for testing
   */
  static createTempDir(prefix: string = 'mcp-test'): string {
    const tempDir = path.join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up a temporary directory
   */
  static cleanupTempDir(tempDir: string): void {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Create a temporary file with content
   */
  static createTempFile(content: string, extension: string = '.json'): string {
    const tempDir = TestHelpers.createTempDir();
    const filePath = path.join(tempDir, `test-file${extension}`);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Setup common mocks for a test
   */
  static setupCommonMocks() {
    // Mock logger to avoid console output during tests
    vi.doMock('../../src/logger/logger.js', () => ({
      default: createMockLogger(),
    }));

    // Mock fs operations
    const mockFs = {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      rmSync: vi.fn(),
    };

    vi.doMock('fs', () => mockFs);

    return { mockFs };
  }

  /**
   * Reset all singleton instances (common pattern in tests)
   */
  static resetSingletons() {
    // Reset any singleton instances that might carry state between tests
    vi.clearAllMocks();
    vi.resetModules();
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create a promise that resolves after a delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Assert that a function throws an error with specific message
   */
  static expectError(fn: () => any, expectedMessage?: string | RegExp): void {
    let thrownError: Error | undefined;
    
    try {
      fn();
    } catch (error) {
      thrownError = error as Error;
    }
    
    expect(thrownError).toBeDefined();
    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        expect(thrownError!.message).toContain(expectedMessage);
      } else {
        expect(thrownError!.message).toMatch(expectedMessage);
      }
    }
  }

  /**
   * Assert that an async function throws an error with specific message
   */
  static async expectAsyncError(fn: () => Promise<any>, expectedMessage?: string | RegExp): Promise<void> {
    let thrownError: Error | undefined;
    
    try {
      await fn();
    } catch (error) {
      thrownError = error as Error;
    }
    
    expect(thrownError).toBeDefined();
    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        expect(thrownError!.message).toContain(expectedMessage);
      } else {
        expect(thrownError!.message).toMatch(expectedMessage);
      }
    }
  }

  /**
   * Mock a module with specific implementation
   */
  static mockModule(modulePath: string, mockImplementation: any): void {
    vi.doMock(modulePath, () => mockImplementation);
  }

  /**
   * Create a spy on an object method
   */
  static spyOn<T extends Record<string, any>>(
    object: T,
    method: keyof T
  ): ReturnType<typeof vi.spyOn> {
    return vi.spyOn(object, method);
  }

  /**
   * Capture console output for testing
   */
  static captureConsole(): {
    log: string[];
    error: string[];
    warn: string[];
    restore: () => void;
  } {
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
    };

    const captured = {
      log: [] as string[],
      error: [] as string[],
      warn: [] as string[],
    };

    console.log = vi.fn((...args: any[]) => {
      captured.log.push(args.join(' '));
    });

    console.error = vi.fn((...args: any[]) => {
      captured.error.push(args.join(' '));
    });

    console.warn = vi.fn((...args: any[]) => {
      captured.warn.push(args.join(' '));
    });

    return {
      ...captured,
      restore: () => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
      },
    };
  }

  /**
   * Create a mock implementation that can be resolved/rejected
   */
  static createControllablePromise<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
  } {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return {
      promise,
      resolve: resolve!,
      reject: reject!,
    };
  }

  /**
   * Validate that an object matches a schema
   */
  static validateSchema(obj: any, schema: any): boolean {
    try {
      // Simple schema validation - could be extended with a proper schema validator
      if (typeof schema === 'object' && schema !== null) {
        for (const key in schema) {
          if (Object.hasOwn(schema, key)) {
            if (!(key in obj)) {
              return false;
            }
            if (typeof schema[key] === 'object' && schema[key] !== null) {
              if (!TestHelpers.validateSchema(obj[key], schema[key])) {
                return false;
              }
            } else if (typeof obj[key] !== schema[key]) {
              return false;
            }
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a random string for testing
   */
  static randomString(length: number = 10): string {
    return Math.random().toString(36).substr(2, length);
  }

  /**
   * Generate a random number within a range
   */
  static randomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create a mock HTTP request/response cycle
   */
  static createHttpMockCycle() {
    const req = {
      params: {},
      query: {},
      body: {},
      headers: {},
      method: 'GET',
      url: '/',
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };

    const next = vi.fn();

    return { req, res, next };
  }

  /**
   * Assert that a mock was called with specific arguments
   */
  static expectCalledWith(mock: any, ...args: any[]): void {
    expect(mock).toHaveBeenCalledWith(...args);
  }

  /**
   * Assert that a mock was called a specific number of times
   */
  static expectCalledTimes(mock: any, times: number): void {
    expect(mock).toHaveBeenCalledTimes(times);
  }

  /**
   * Assert that a mock was called at least once
   */
  static expectCalled(mock: any): void {
    expect(mock).toHaveBeenCalled();
  }

  /**
   * Assert that a mock was never called
   */
  static expectNotCalled(mock: any): void {
    expect(mock).not.toHaveBeenCalled();
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /**
   * Create a repeating function call for testing
   */
  static repeat(fn: () => any, times: number): void {
    for (let i = 0; i < times; i++) {
      fn();
    }
  }

  /**
   * Create test data with incremental IDs
   */
  static createTestSeries<T>(
    factory: (index: number) => T,
    count: number
  ): T[] {
    return Array.from({ length: count }, (_, i) => factory(i));
  }
}