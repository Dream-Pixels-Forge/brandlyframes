/**
 * Flat ESLint config (ESLint 9) — @eslint/js + typescript-eslint, Prettier compat.
 * Repo-wide: run from the root with `pnpm lint`.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Governance notes and orchestration scripts are not lint targets. The
    // core Math.random() fixture (BF-400) contains the banned call on
    // purpose and is linted programmatically by its own unit test.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      'dev-notes/**',
      'packages/core/test/fixtures/**',
    ],
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
  {
    // BF-400: bare Math.random() breaks the "frame -> pixels" determinism
    // contract in composition source; use random(seed) from core instead.
    files: ['packages/*/src/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            "Math.random() is nondeterministic and breaks frame -> pixels; use random(seed) from 'brandlyframes' (BF-400).",
        },
      ],
    },
  },
  {
    // Cloud control-plane job ids are infrastructure, not composition output.
    files: ['packages/cloud/src/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
