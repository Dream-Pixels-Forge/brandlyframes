/**
 * Toast (BF-013, DESIGN.md §3 + §6): status message with an icon glyph so
 * the state never relies on color alone. Error uses white text on a
 * dark-orange tint (no red); success is white with a check icon.
 */
import type { CSSProperties, FC, ReactNode } from 'react';
import { cssVar } from '../tokens';
import { typography } from '../typography';

/** Severity of a {@link Toast}. */
export type ToastVariant = 'info' | 'success' | 'error';

/** Props for {@link Toast}. */
export interface ToastProps {
  /** Message body. */
  message: ReactNode;
  /** Severity; decides the icon glyph and live-region role. Default `info`. */
  variant?: ToastVariant;
  /** When provided, renders a dismiss button calling this handler. */
  onDismiss?: () => void;
}

/** Icon glyph per variant — meaning is carried by the glyph + text, not color. */
const ICONS: Record<ToastVariant, string> = { info: 'ℹ', success: '✓', error: '!' };

const toastStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  backgroundColor: cssVar('bf-orange-dim'),
  border: `1px solid ${cssVar('bf-border')}`,
  borderLeft: `3px solid ${cssVar('bf-orange')}`,
  borderRadius: 4,
  color: cssVar('bf-white'),
  fontFamily: typography.ui,
  fontSize: 13,
};

const iconStyle: CSSProperties = { fontFamily: typography.mono, flexShrink: 0 };

const dismissStyle: CSSProperties = {
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  color: cssVar('bf-text-muted'),
  cursor: 'pointer',
  fontFamily: typography.mono,
  fontSize: 13,
  padding: '0 2px',
};

/**
 * Status toast (deterministic SSR). `error` maps to `role="alert"`, other
 * variants to `role="status"`.
 */
export const Toast: FC<ToastProps> = ({ message, variant = 'info', onDismiss }) => (
  <div role={variant === 'error' ? 'alert' : 'status'} style={toastStyle}>
    <span aria-hidden="true" style={iconStyle}>
      {ICONS[variant]}
    </span>
    <span>{message}</span>
    {onDismiss !== undefined ? (
      <button type="button" aria-label="Dismiss" onClick={onDismiss} style={dismissStyle}>
        ✕
      </button>
    ) : null}
  </div>
);
