/**
 * Token three-form sync tests (BF-013).
 *
 * The Cinema Black palette ships in three synced forms — `src/tokens.css`
 * (CSS variables, dark default + `[data-theme='paper']` light inverse),
 * `src/tokens.ts` (typed const map) and `tokens.json` (flat map). The exact
 * values come from dev-notes/DESIGN.md §2. These tests read the CSS and JSON
 * files from disk (not through a bundler) so the shipped bytes are verified.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/contrast';
import { cssVar, designTokens } from '../src/tokens';

/** Exact palette from dev-notes/DESIGN.md §2 (dark theme is the default). */
const EXPECTED_TOKENS: Record<string, string> = {
  'bf-black': '#0A0A0A',
  'bf-surface-1': '#111111',
  'bf-surface-2': '#1A1A1A',
  'bf-border': '#2A2A2A',
  'bf-text-muted': '#8A8A8A',
  'bf-white': '#FAFAFA',
  'bf-orange': '#FF6A00',
  'bf-orange-hover': '#FF8533',
  'bf-orange-dim': '#FF6A0026',
};

const css = readFileSync(fileURLToPath(new URL('../src/tokens.css', import.meta.url)), 'utf8');
const tokensJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../tokens.json', import.meta.url)), 'utf8'),
) as Record<string, string>;

/** Extracts every `--bf-*` declaration from the first CSS block for `selector`. */
function readCssBlock(cssSource: string, selector: string): Record<string, string> {
  const at = cssSource.indexOf(selector);
  expect(at, `tokens.css must declare ${selector}`).toBeGreaterThanOrEqual(0);
  const open = cssSource.indexOf('{', at);
  const close = cssSource.indexOf('}', open);
  const body = cssSource.slice(open + 1, close);
  const vars: Record<string, string> = {};
  for (const match of body.matchAll(/--bf-([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{8}|#[0-9A-Fa-f]{6})\s*;/g)) {
    vars[`bf-${match[1]}`] = match[2];
  }
  return vars;
}

describe('Cinema Black tokens (BF-013, DESIGN.md §2 exact values)', () => {
  it('designTokens is the exact 9-token dark palette from DESIGN.md §2', () => {
    expect(designTokens).toEqual(EXPECTED_TOKENS);
  });

  it('tokens.json is the same flat map as designTokens', () => {
    expect(tokensJson).toEqual(EXPECTED_TOKENS);
  });

  it('tokens.css :root (dark default) declares exactly the dark palette', () => {
    expect(readCssBlock(css, ':root')).toEqual(EXPECTED_TOKENS);
  });

  it('cssVar builds the matching CSS variable reference', () => {
    expect(cssVar('bf-orange')).toBe('var(--bf-orange)');
    expect(cssVar('bf-text-muted')).toBe('var(--bf-text-muted)');
  });
});

describe("tokens.css [data-theme='paper'] light inverse", () => {
  const paper = readCssBlock(css, "[data-theme='paper']");

  it('overrides every dark token key (no missing, no extra keys)', () => {
    expect(Object.keys(paper).sort()).toEqual(Object.keys(EXPECTED_TOKENS).sort());
  });

  it('inverts black and white ("theater dark" ↔ "Paper")', () => {
    expect(paper['bf-black']).toBe(EXPECTED_TOKENS['bf-white']);
    expect(paper['bf-white']).toBe(EXPECTED_TOKENS['bf-black']);
  });

  it('keeps the orange accent identical to the dark theme', () => {
    expect(paper['bf-orange']).toBe(EXPECTED_TOKENS['bf-orange']);
    expect(paper['bf-orange-hover']).toBe(EXPECTED_TOKENS['bf-orange-hover']);
    expect(paper['bf-orange-dim']).toBe(EXPECTED_TOKENS['bf-orange-dim']);
  });
});

describe('Paper theme also meets the WCAG AA contrast gate (DESIGN.md §3)', () => {
  const paper = readCssBlock(css, "[data-theme='paper']");

  it('primary text on paper background passes 4.5:1', () => {
    expect(contrastRatio(paper['bf-white'], paper['bf-black'])).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text on paper surface-1 passes 4.5:1', () => {
    expect(contrastRatio(paper['bf-text-muted'], paper['bf-surface-1'])).toBeGreaterThanOrEqual(4.5);
  });

  it('primary text on paper surface-2 passes 4.5:1', () => {
    expect(contrastRatio(paper['bf-white'], paper['bf-surface-2'])).toBeGreaterThanOrEqual(4.5);
  });

  it('primary button pair (black text on orange) passes 4.5:1 in both themes', () => {
    expect(contrastRatio(paper['bf-white'], paper['bf-orange'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(EXPECTED_TOKENS['bf-black'], EXPECTED_TOKENS['bf-orange'])).toBeGreaterThanOrEqual(4.5);
  });
});
