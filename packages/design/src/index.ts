/**
 * @brandlyframes/design — the "Cinema Black" design system (BF-013).
 *
 * Ships the brand palette in three synced forms (CSS variables with a dark
 * default and a `[data-theme='paper']` light inverse, a typed TypeScript map,
 * and a flat JSON export) plus deterministic, token-styled React components
 * for the Studio, Player and docs UI.
 *
 * Components are deterministic under `react-dom/server`: no `Math.random`,
 * no `Date.now`, no generated ids (GOAL_00 §2 — the frame is the clock, and
 * even UI chrome must not introduce wall-clock behavior). Interaction states
 * such as hover are React state.
 *
 * Color tokens: import `@brandlyframes/design/tokens.css` once for the CSS
 * variables, or read {@link designTokens} / `tokens.json` programmatically.
 * All shipped text pairs meet WCAG AA (≥ 4.5:1), gated by the tests; orange
 * is the only accent and covers at most ~5% of any screen (DESIGN.md §3).
 */

/**
 * Color tokens (BF-013): the exact Cinema Black palette as a typed const map,
 * with {@link cssVar} to build `var(--bf-…)` references. See
 * `src/tokens.css` for the themed CSS form (dark default, Paper inverse) and
 * `tokens.json` for the flat machine-readable export.
 */
export { cssVar, designTokens, type DesignTokenName, type DesignTokenValue } from './tokens';

/**
 * Typography tokens (DESIGN.md §4): display / UI / mono font stacks and the
 * tabular-numeric rule for mono readouts.
 */
export { monoNumeric, typography, type TypographyRole } from './typography';

/**
 * WCAG 2.x relative luminance and contrast ratio — pure math used to gate
 * AA contrast on the shipped text pairs (DESIGN.md §3).
 */
export { contrastRatio, hexToRgb01, relativeLuminance, type Rgb01 } from './contrast';

/**
 * UI components (BF-013, DESIGN.md §6). Timeline, Scrubber, Props editor
 * fields, Modal and Command palette land with the Studio phases (BF-011/
 * BF-012); this package ships the primitives they will be built from.
 */
export { Button, type ButtonProps, type ButtonVariant } from './components/Button';
export { FrameCounter, type FrameCounterProps } from './components/FrameCounter';
export { LogoLockup, type LogoLockupProps } from './components/LogoLockup';
export { Panel, type PanelProps } from './components/Panel';
export { Progress, type ProgressProps, type ProgressVariant } from './components/Progress';
export { Tabs, type TabItem, type TabsProps } from './components/Tabs';
export { TimecodeInput, type TimecodeInputProps } from './components/TimecodeInput';
export { Toast, type ToastProps, type ToastVariant } from './components/Toast';
export { Tooltip, type TooltipProps } from './components/Tooltip';
