/**
 * FrameCounter (BF-013, DESIGN.md §5): the persistent mono readout in the
 * exact `FRAME 0042 / 0300` format — four-digit zero-padded, tabular so
 * digits never jitter.
 */
import type { CSSProperties, FC } from 'react';
import { cssVar } from '../tokens';
import { monoNumeric, typography } from '../typography';

/** Props for {@link FrameCounter}. */
export interface FrameCounterProps {
  /** Current frame, 0-based. */
  frame: number;
  /** Total frame count. */
  total: number;
}

const counterStyle: CSSProperties = {
  fontFamily: typography.mono,
  ...monoNumeric,
  fontSize: 12,
  letterSpacing: '0.08em',
  color: cssVar('bf-white'),
};

/** Zero-pads a frame number to the 4-digit readout width (expands past 9999). */
const pad4 = (value: number): string => String(value).padStart(4, '0');

/**
 * Persistent `FRAME 0042 / 0300` readout (deterministic SSR).
 *
 * @throws RangeError when `frame` or `total` is not a non-negative integer.
 */
export const FrameCounter: FC<FrameCounterProps> = ({ frame, total }) => {
  for (const [name, value] of [
    ['frame', frame],
    ['total', total],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative integer, got ${value}`);
    }
  }
  return <div style={counterStyle}>{`FRAME ${pad4(frame)} / ${pad4(total)}`}</div>;
};
