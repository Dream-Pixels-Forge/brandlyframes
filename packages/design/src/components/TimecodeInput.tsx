/**
 * TimecodeInput (BF-013, DESIGN.md §4 + §6): controlled input for SMPTE-style
 * `HH:MM:SS:FF` timecode in the mono tabular face. Validation is pure and
 * reported via `aria-invalid` — never color alone.
 */
import type { ChangeEvent, CSSProperties, FC } from 'react';
import { cssVar } from '../tokens';
import { monoNumeric, typography } from '../typography';

/** Props for {@link TimecodeInput}. */
export interface TimecodeInputProps {
  /** Controlled value in `HH:MM:SS:FF` format (two digits per field). */
  value: string;
  /** Called with the raw input string on every keystroke. */
  onChange: (value: string) => void;
  /** Frames per second; the FF field must stay below it. Default 30. */
  fps?: number;
  /** Accessible name for the input. */
  ariaLabel?: string;
}

const inputStyle: CSSProperties = {
  backgroundColor: cssVar('bf-surface-2'),
  border: `1px solid ${cssVar('bf-border')}`,
  borderRadius: 4,
  color: cssVar('bf-white'),
  fontFamily: typography.mono,
  ...monoNumeric,
  fontSize: 13,
  padding: '6px 10px',
  width: '11ch',
};

/** `HH` (00-99), `MM`/`SS` (00-59), `FF` two digits. */
const TIMECODE_RE = /^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;

/** Pure `HH:MM:SS:FF` validity check against an fps (FF must be < fps). */
const isValidTimecode = (value: string, fps: number): boolean => {
  const match = TIMECODE_RE.exec(value);
  if (match === null) {
    return false;
  }
  const [, , minutes, seconds, frames] = match;
  return Number(minutes) < 60 && Number(seconds) < 60 && Number(frames) < fps;
};

/**
 * Controlled `HH:MM:SS:FF` input (deterministic SSR). Out-of-range values are
 * flagged with `aria-invalid="true"` and the orange border token; the raw
 * string is always forwarded to `onChange`.
 *
 * @throws RangeError when `fps` is not a positive integer.
 */
export const TimecodeInput: FC<TimecodeInputProps> = ({ value, onChange, fps = 30, ariaLabel }) => {
  if (!Number.isInteger(fps) || fps <= 0) {
    throw new RangeError(`fps must be a positive integer, got ${fps}`);
  }
  const valid = isValidTimecode(value, fps);
  return (
    <input
      type="text"
      value={value}
      placeholder="HH:MM:SS:FF"
      aria-label={ariaLabel}
      aria-invalid={!valid}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      style={{ ...inputStyle, borderColor: valid ? cssVar('bf-border') : cssVar('bf-orange') }}
    />
  );
};
