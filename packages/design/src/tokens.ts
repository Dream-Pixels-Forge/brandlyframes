/**
 * Cinema Black design tokens — typed TypeScript form (BF-013).
 *
 * Source of truth: dev-notes/DESIGN.md §2 (exact values). The CSS variables
 * in `src/tokens.css` (dark default + `[data-theme='paper']` light inverse),
 * this map, and the flat `tokens.json` export are three synced forms of the
 * same palette; `test/tokens.test.ts` enforces consistency.
 */

/**
 * Every Cinema Black color token, keyed by its CSS variable name without the
 * leading `--` (e.g. `bf-black` ↔ `var(--bf-black)`).
 *
 * Dark ("theater black") is the default theme; the light inverse ("Paper")
 * lives only in `tokens.css` under `[data-theme='paper']`.
 */
export const designTokens = {
  'bf-black': '#0A0A0A',
  'bf-surface-1': '#111111',
  'bf-surface-2': '#1A1A1A',
  'bf-border': '#2A2A2A',
  'bf-text-muted': '#8A8A8A',
  'bf-white': '#FAFAFA',
  'bf-orange': '#FF6A00',
  'bf-orange-hover': '#FF8533',
  'bf-orange-dim': '#FF6A0026',
} as const;

/** Union of all Cinema Black token names (`bf-black`, `bf-orange`, …). */
export type DesignTokenName = keyof typeof designTokens;

/** Hex literal union of the token values (`'#0A0A0A'`, `'#FF6A00'`, …). */
export type DesignTokenValue = (typeof designTokens)[DesignTokenName];

/**
 * Builds the CSS `var()` reference for a token, e.g.
 * `cssVar('bf-orange')` → `'var(--bf-orange)'`. Use this (or the raw
 * `var(--bf-…)` string) in inline styles so components follow whichever
 * theme (`:root` dark or `[data-theme='paper']`) is active.
 */
export const cssVar = (name: DesignTokenName): string => `var(--${name})`;
