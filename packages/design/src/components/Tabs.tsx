/**
 * Tabs (BF-013, DESIGN.md §6): a controlled tab strip for the Studio shell.
 * The active tab is marked with the orange accent underline and exposed to
 * assistive tech via `role="tablist"` / `aria-selected`.
 */
import type { CSSProperties, FC } from 'react';
import { cssVar } from '../tokens';
import { typography } from '../typography';

/** One tab in a {@link Tabs} strip. */
export interface TabItem {
  /** Stable tab identifier passed to {@link TabsProps.onChange}. */
  readonly id: string;
  /** Visible tab label. */
  readonly label: string;
}

/** Props for {@link Tabs}. */
export interface TabsProps {
  /** Tabs to render, in order. */
  tabs: ReadonlyArray<TabItem>;
  /** `id` of the active tab. */
  activeId: string;
  /** Called with the clicked tab's `id`. */
  onChange?: (id: string) => void;
  /** Accessible name for the tablist. */
  ariaLabel?: string;
}

const listStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  borderBottom: `1px solid ${cssVar('bf-border')}`,
};

const tabBase: CSSProperties = {
  fontFamily: typography.ui,
  fontSize: 13,
  fontWeight: 500,
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
};

/** Controlled tab strip with orange active underline (deterministic SSR). */
export const Tabs: FC<TabsProps> = ({ tabs, activeId, onChange, ariaLabel }) => (
  <div role="tablist" aria-label={ariaLabel} style={listStyle}>
    {tabs.map((tab) => {
      const active = tab.id === activeId;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active}
          tabIndex={active ? 0 : -1}
          onClick={onChange === undefined ? undefined : () => onChange(tab.id)}
          style={{
            ...tabBase,
            color: active ? cssVar('bf-white') : cssVar('bf-text-muted'),
            borderBottomColor: active ? cssVar('bf-orange') : 'transparent',
          }}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
