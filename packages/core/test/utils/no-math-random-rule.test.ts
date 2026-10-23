/**
 * BF-400: the root ESLint config bans bare `Math.random()` in composition
 * source (the packages' `src` directories) — nondeterministic randomness
 * would break the "frame -> pixels" contract. The ban lives in `eslint.config.mjs` at the
 * repo root; this test proves it (a) fires on the checked-in fixture and
 * (b) is actually wired in that config.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url));

/** Must match the `no-restricted-syntax` entry in the root eslint.config.mjs. */
const BANNED_SELECTOR =
  "CallExpression[callee.object.name='Math'][callee.property.name='random']";
const BANNED_MESSAGE =
  "Math.random() is nondeterministic and breaks frame -> pixels; use random(seed) from 'brandlyframes' (BF-400).";

const lint = (code: string) =>
  new Linter().verify(
    code,
    {
      files: ['**/*.js', '**/*.ts'],
      rules: { 'no-restricted-syntax': ['error', { selector: BANNED_SELECTOR, message: BANNED_MESSAGE }] },
    },
    { filename: 'math-random.fixture.ts' },
  );

describe('ESLint ban on bare Math.random() (BF-400)', () => {
  it('fires on the fixture containing Math.random()', () => {
    const fixture = readFileSync(
      join(repoRoot, 'packages/core/test/fixtures/math-random.fixture.ts'),
      'utf8',
    );
    const messages = lint(fixture);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe('no-restricted-syntax');
    expect(messages[0].message).toContain('random(seed)');
  });

  it('does not fire on the deterministic random() helper', () => {
    const messages = lint(
      "import { random } from 'brandlyframes';\nexport const value = random('seed', 0, 1);\n",
    );
    expect(messages).toHaveLength(0);
  });

  it('is wired in the root eslint.config.mjs for composition source', () => {
    const config = readFileSync(join(repoRoot, 'eslint.config.mjs'), 'utf8');
    expect(config).toContain(BANNED_SELECTOR);
    expect(config).toContain("files: ['packages/*/src/**']");
    // The fixture contains the banned call, so it must stay excluded from
    // repo-wide lint — otherwise `pnpm lint` would fail on it.
    expect(config).toContain('packages/core/test/fixtures/**');
  });
});
