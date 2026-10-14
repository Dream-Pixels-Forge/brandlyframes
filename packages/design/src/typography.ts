/**
 * Typography tokens for Cinema Black (BF-013, DESIGN.md §4).
 *
 * The design system prescribes three faces: a condensed poster-style display
 * sans for titles/logo, Inter for interface text, and JetBrains Mono (always
 * tabular) for timecode, code and frame numbers. These are font *stacks*
 * with system fallbacks — loading the webfonts themselves is BF-410
 * (`useFont()`), not this package's job.
 */

/**
 * CSS `font-family` stacks per typographic role, keyed like DESIGN.md §4.
 * `mono` must always be paired with `font-variant-numeric: tabular-nums`
 * (see {@link monoNumeric}) so timecode and frame counters do not jitter.
 */
export const typography = {
  display: "'Bebas Neue', 'Oswald', 'Arial Narrow', sans-serif",
  ui: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
} as const;

/** Union of the typographic roles (`display`, `ui`, `mono`). */
export type TypographyRole = keyof typeof typography;

/**
 * The tabular numeric rendering rule required for all mono readouts
 * (frame counters, timecode) per DESIGN.md §4.
 */
export const monoNumeric = {
  fontVariantNumeric: 'tabular-nums',
} as const;
