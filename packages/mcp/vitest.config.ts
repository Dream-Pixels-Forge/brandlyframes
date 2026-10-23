import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The core (`brandlyframes`) and zod-types dists are bundle-consumed
// (extensionless ESM imports); tests alias them to source.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      brandlyframes: fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@brandlyframes/zod-types': fileURLToPath(new URL('../zod-types/src/index.ts', import.meta.url)),
    },
  },
});
