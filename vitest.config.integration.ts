import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['tests/integration/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: false,
    pool: 'threads',
    maxConcurrency: 1,
    setupFiles: ['./tests/integration/setup.ts'],
    env: {
      // Load from .env for integration tests
      DOTENV_CONFIG_PATH: '.env.test'
    }
  }
});