import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
    globals: true,
  },
});
