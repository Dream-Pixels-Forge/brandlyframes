/**
 * Flat ESLint config (ESLint 9) — @eslint/js + typescript-eslint, Prettier compat.
 * Repo-wide: run from the root with `pnpm lint`.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Governance notes and orchestration scripts are not lint targets.
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.turbo/**', 'dev-notes/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
