/**
 * Global teardown for E2E tests
 * Runs after all E2E tests complete
 */
export async function teardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Clean up any remaining environment variables
  delete process.env.MCP_DISABLE_CONSOLE;
  delete process.env.TEST_CLEANUP_TIMEOUT;

  // Wait a bit for any async cleanup to complete
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('✅ E2E test cleanup complete');
}
