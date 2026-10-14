/**
 * LogoLockup (BF-013, DESIGN.md §7): the BRANDLYFRAMES wordmark in the
 * display face with the orange frame-bracket mark. The mark is a static SVG
 * (no randomness, no ids) so server renders are byte-identical.
 */
import type { CSSProperties, FC } from 'react';
import { cssVar } from '../tokens';
import { typography } from '../typography';

/** Props for {@link LogoLockup}. */
export interface LogoLockupProps {
  /** Bracket-mark box size in px; the wordmark scales with it. Default 24. */
  size?: number;
}

const lockupStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
};

const wordmarkStyle = (size: number): CSSProperties => ({
  fontFamily: typography.display,
  fontSize: Math.round(size * 0.75),
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  lineHeight: 1,
  color: cssVar('bf-white'),
  userSelect: 'none',
});

/**
 * Brand lockup: orange `[ ]` frame-bracket mark plus the BRANDLYFRAMES
 * wordmark (deterministic SSR). The decorative mark is `aria-hidden`; the
 * wordmark text carries the accessible name.
 */
export const LogoLockup: FC<LogoLockupProps> = ({ size = 24 }) => (
  <span style={lockupStyle}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11 4 H4 V28 H11" stroke={cssVar('bf-orange')} strokeWidth={3} />
      <path d="M21 4 H28 V28 H21" stroke={cssVar('bf-orange')} strokeWidth={3} />
    </svg>
    <span style={wordmarkStyle(size)}>BRANDLYFRAMES</span>
  </span>
);
