/**
 * ESLint fixture for the BF-400 `Math.random()` ban (root eslint.config.mjs):
 * intentionally contains the banned call. Excluded from repo-wide lint via
 * the root config ignores; linted programmatically by
 * `test/utils/no-math-random-rule.test.ts`.
 */
export const bannedNondeterminism = Math.random();
