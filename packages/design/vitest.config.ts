import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // SSR determinism tests use react-dom/server — no browser environment needed.
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
