/**
 * Progress (BF-013, DESIGN.md §5 + §6): bar variant for plain progress and
 * clapper variant for the slate/clapperboard loading & render motif. Values
 * are clamped to 0..100 with pure math — deterministic SSR, no animation
 * from wall-clock time.
 */
import type { CSSProperties, FC } from 'react';
import { cssVar } from '../tokens';
import { typography } from '../typography';

/** Visual variant of {@link Progress}. */
export type ProgressVariant = 'bar' | 'clapper';

/** Props for {@link Progress}. */
export interface ProgressProps {
  /** Progress percentage; values outside 0..100 are clamped. */
  value: number;
  /** `bar` thin orange fill on a surface-2 track; `clapper` slate motif. Default `bar`. */
  variant?: ProgressVariant;
  /** Accessible name; also the clapper slate label. Defaults to `"N%"`. */
  label?: string;
}

/** Clamps a raw percentage into the aria-legal 0..100 range. */
const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const barTrackStyle: CSSProperties = {
  width: '100%',
  height: 8,
  borderRadius: 4,
  backgroundColor: cssVar('bf-surface-2'),
  overflow: 'hidden',
};

const barFillStyle: CSSProperties = {
  height: '100%',
  backgroundColor: cssVar('bf-orange'),
};

const clapperContainerStyle: CSSProperties = {
  border: `1px solid ${cssVar('bf-border')}`,
  borderRadius: 6,
  overflow: 'hidden',
  backgroundColor: cssVar('bf-surface-1'),
};

const clapperStripesStyle: CSSProperties = {
  height: 14,
  borderBottom: `1px solid ${cssVar('bf-border')}`,
  background: `repeating-linear-gradient(45deg, ${cssVar('bf-border')} 0 8px, transparent 8px 16px)`,
};

const clapperBodyStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  fontFamily: typography.mono,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 12,
  letterSpacing: '0.08em',
  color: cssVar('bf-white'),
};

/** Progress indicator with bar and clapper (slate) variants. */
export const Progress: FC<ProgressProps> = ({ value, variant = 'bar', label }) => {
  const clamped = clampPercent(value);
  const accessibleName = label ?? `${clamped}%`;
  if (variant === 'clapper') {
    return (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={accessibleName}
        style={clapperContainerStyle}
      >
        <div style={clapperStripesStyle} />
        <div style={clapperBodyStyle}>
          <span>{accessibleName}</span>
          <span>{`${clamped}%`}</span>
        </div>
      </div>
    );
  }
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={accessibleName}
      style={barTrackStyle}
    >
      <div style={{ ...barFillStyle, width: `${clamped}%` }} />
    </div>
  );
};
