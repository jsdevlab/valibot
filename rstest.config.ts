import { withRslibConfig } from '@rstest/adapter-rslib';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  extends: withRslibConfig(),
  include: ['src/**/*.test.ts'],
  testEnvironment: 'node',
  coverage: {
    provider: 'v8',
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/__tests__/**', 'src/**/*.test.*'],
    reporters: ['text'],
    thresholds: {
      statements: 85,
      lines: 85,
      functions: 90,
      branches: 75,
    },
  },
});
