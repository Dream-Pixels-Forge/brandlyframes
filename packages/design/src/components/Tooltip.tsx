/**
 * Tooltip (BF-013, DESIGN.md §6): hover/focus tooltip rendered as React
 * state (open/closed), so SSR always ships the closed state deterministically
 * — no generated ids, no timers, no random positioning.
 */
import type { CSSProperties, FC, ReactNode } from 'react';
import { useState } from 'react';
import { cssVar } from '../tokens';
import { typography } from '../typography';

/** Props for {@link Tooltip}. */
export interface TooltipProps {
  /** Text shown in the floating tooltip. */
  label: string;
  /** Trigger element; hover or focus opens the tooltip. */
  children: ReactNode;
  /**
   * Optional id wired to `aria-describedby` on the trigger. No id is
   * generated automatically — keeping SSR deterministic is worth the
   * explicitness.
   */
  id?: string;
}

const wrapperStyle: CSSProperties = { position: 'relative', display: 'inline-flex' };

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 6,
  padding: '6px 10px',
  backgroundColor: cssVar('bf-surface-2'),
  border: `1px solid ${cssVar('bf-border')}`,
  borderRadius: 4,
  color: cssVar('bf-white'),
  fontFamily: typography.ui,
  fontSize: 12,
  whiteSpace: 'nowrap',
  zIndex: 10,
};

/** Hover/focus tooltip; server renders always ship the closed state. */
export const Tooltip: FC<TooltipProps> = ({ label, children, id }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={wrapperStyle}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        id={id}
        aria-hidden={!open}
        style={{ ...tooltipStyle, opacity: open ? 1 : 0, pointerEvents: 'none' }}
      >
        {label}
      </span>
    </span>
  );
};
