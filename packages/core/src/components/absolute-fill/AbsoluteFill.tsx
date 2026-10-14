import type { ComponentPropsWithoutRef, CSSProperties, FC } from 'react';

export type AbsoluteFillProps = ComponentPropsWithoutRef<'div'>;

const BASE_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

/**
 * A full-size flex container filling the composition (or the enclosing
 * Sequence). Purely presentational — no frame logic, usable anywhere.
 */
export const AbsoluteFill: FC<AbsoluteFillProps> = ({ style, ...rest }) => (
  <div {...rest} style={{ ...BASE_STYLE, ...style }} />
);
