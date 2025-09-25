import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    include: ['tests/unit/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    isolate: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/unit',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        'tests',
        'examples',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        'src/tronWeb/migration-example.ts'
      ]
    }
  }
});