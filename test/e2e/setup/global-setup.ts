/**
 * Global setup for E2E tests
 * Runs before any E2E tests begin
 */
export async function setup() {
  console.log('🔧 Setting up E2E test environment...');

  // Ensure required environment variables are set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }

  // Set up test-specific logging
  process.env.LOG_LEVEL = 'warn';

  // Disable console logging for MCP servers during tests
  process.env.MCP_DISABLE_CONSOLE = 'true';

  // Set up timeout for cleanup
  process.env.TEST_CLEANUP_TIMEOUT = '15000';

  console.log('✅ E2E test environment ready');
}
