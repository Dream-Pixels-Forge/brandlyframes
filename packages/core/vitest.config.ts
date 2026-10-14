import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // Goal P1 gate: >= 90% line coverage for the pure timing engine (BF-003/
      // BF-004) and the animation utils (BF-005).
      include: ['src/timing/**', 'src/animation/**'],
      reporter: ['text', 'json'],
      thresholds: {
        lines: 90,
        'src/timing/**': { lines: 90 },
        'src/animation/**': { lines: 90 },
      },
    },
  },
});
