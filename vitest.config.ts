import { defineConfig } from 'vitest/config';

// Default configuration for all tests
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    isolate: true,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        'tests',
        'examples',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        'src/tronWeb/migration-example.ts'
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    }
  }
});