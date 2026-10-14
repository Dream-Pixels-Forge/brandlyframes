/**
 * Panel (BF-013, DESIGN.md §6): a surface-1 container with an optional mono
 * uppercase header, used for Studio sidebars and cards.
 */
import type { FC, ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { cssVar } from '../tokens';
import { typography } from '../typography';

/** Props for {@link Panel}. */
export interface PanelProps {
  /** Optional header label, rendered uppercase in the mono face. */
  title?: string;
  /** Panel body. */
  children?: ReactNode;
}

const panelStyle: CSSProperties = {
  backgroundColor: cssVar('bf-surface-1'),
  border: `1px solid ${cssVar('bf-border')}`,
  borderRadius: 6,
  color: cssVar('bf-white'),
  fontFamily: typography.ui,
};

const headerStyle: CSSProperties = {
  padding: '10px 14px',
  borderBottom: `1px solid ${cssVar('bf-border')}`,
  fontFamily: typography.mono,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: cssVar('bf-text-muted'),
};

const bodyStyle: CSSProperties = { padding: 14 };

/** Surface-1 panel with optional mono uppercase title (deterministic SSR). */
export const Panel: FC<PanelProps> = ({ title, children }) => (
  <section style={panelStyle}>
    {title !== undefined ? <header style={headerStyle}>{title}</header> : null}
    <div style={bodyStyle}>{children}</div>
  </section>
);
