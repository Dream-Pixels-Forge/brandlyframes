// Dependency-free: root package.json intentionally has no vitest devDep
// (the defineConfig import from 'vitest/config' caused a 9-package startup
// failure — ISS-0091). Plain object export = same config, no import.
export default {
  test: {
    include: ['packages/*/test/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
    globals: true,
  },
};
