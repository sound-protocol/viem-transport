import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['tests/e2e/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    isolate: false,
    pool: 'threads',
    maxConcurrency: 1,
    bail: 1, // Stop on first failure
    retry: 2, // Retry failed tests up to 2 times
    setupFiles: ['./tests/e2e/setup.ts'],
    env: {
      DOTENV_CONFIG_PATH: '.env'
    }
  }
});