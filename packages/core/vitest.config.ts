import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // Goal P1 gate: animation utils (BF-005) measured at >= 90% line coverage.
      include: ['src/animation/**'],
      reporter: ['text', 'json'],
    },
  },
});
