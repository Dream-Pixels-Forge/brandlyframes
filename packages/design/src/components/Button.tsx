/**
 * Button (BF-013, DESIGN.md §6): primary orange fill / secondary outline /
 * ghost. Interaction states (hover) are React state, never wall-clock CSS
 * animation, so server renders stay deterministic.
 */
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent } from 'react';
import { useState } from 'react';
import { cssVar } from '../tokens';
import { typography } from '../typography';

/** Visual variant of {@link Button}. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/** Props for {@link Button}. Extends native button attributes. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Color scheme: `primary` orange fill with black text (black-on-orange
   * passes AA at ~6.9:1; white-on-orange fails at ~2.75:1), `secondary`
   * outline on the border token, `ghost` bare muted text. Default: `primary`.
   */
  variant?: ButtonVariant;
}

const baseStyle: CSSProperties = {
  fontFamily: typography.ui,
  fontSize: 14,
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: 4,
  cursor: 'pointer',
  transition: 'background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out',
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: cssVar('bf-orange'),
    color: cssVar('bf-black'),
    border: '1px solid transparent',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: cssVar('bf-white'),
    border: `1px solid ${cssVar('bf-border')}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: cssVar('bf-text-muted'),
    border: '1px solid transparent',
  },
};

const hoverStyles: Record<ButtonVariant, CSSProperties> = {
  primary: { backgroundColor: cssVar('bf-orange-hover') },
  secondary: { color: cssVar('bf-orange'), borderColor: cssVar('bf-orange') },
  ghost: { color: cssVar('bf-white') },
};

/**
 * Cinema Black button. Hover styling is applied through React state so the
 * markup is fully deterministic under SSR (`renderToString`).
 */
export function Button({ variant = 'primary', style, onMouseEnter, onMouseLeave, ...rest }: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      {...rest}
      onMouseEnter={(event: MouseEvent<HTMLButtonElement>) => {
        setHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event: MouseEvent<HTMLButtonElement>) => {
        setHovered(false);
        onMouseLeave?.(event);
      }}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...(hovered ? hoverStyles[variant] : undefined),
        ...style,
      }}
    />
  );
}
