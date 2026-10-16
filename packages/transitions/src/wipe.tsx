/**
 * Wipe transition — [BF-070]
 *
 * Reveals the "to" element by progressively wiping across the "from" element
 * in a specified direction. Frame-exact and deterministic.
 */

import { type FC, type ReactElement, cloneElement, isValidElement, CSSProperties } from 'react';

type TypedReactElement = ReactElement<Record<string, unknown>>;
import { TransitionBaseProps, createProgress, easeInOut } from './types';

/**
 * Wipe direction.
 */
export type WipeDirection = 'left' | 'right' | 'up' | 'down' | 'diagonal-tl-br' | 'diagonal-tr-bl';

/**
 * Wipe transition props.
 */
export interface WipeProps extends TransitionBaseProps {
  /** Wipe direction. Default: 'left'. */
  direction?: WipeDirection;
  /** Width of the wipe edge feathering (percentage). Default: 0 (hard edge). */
  featherPercent?: number;
  /** Current frame index (instead of using useCurrentFrame hook). */
  frame: number;
}

/**
 * Wipe transition component.
 *
 * Reveals the "to" element by progressively clipping it in from the specified
 * direction, wiping across the "from" element.
 *
 * @param props - durationFrames, easing, children, direction, featherPercent, frame
 * @returns Composed transition element
 */
export const Wipe: FC<WipeProps> = ({
  durationFrames,
  easing = easeInOut,
  children,
  direction = 'left',
  featherPercent = 0,
  frame,
}) => {
  if (!isValidElement(children[0]) || !isValidElement(children[1])) {
    throw new Error('Wipe requires exactly two valid React elements as children');
  }

  const [fromElement, toElement] = children as [TypedReactElement, TypedReactElement];
  const progress = createProgress(Math.min(frame / durationFrames, 1));
  const easedProgress = easing(progress);

  const fromStyle = (fromElement.props.style as CSSProperties) || {};
  const toStyle = (toElement.props.style as CSSProperties) || {};

  // Calculate clip-path based on direction
  let clipPath: string;
  const feather = featherPercent / 100;

  switch (direction) {
    case 'left':
      clipPath = `inset(0 ${(1 - easedProgress) * 100}% 0 0)`;
      break;
    case 'right':
      clipPath = `inset(0 0 0 ${(1 - easedProgress) * 100}%)`;
      break;
    case 'up':
      clipPath = `inset(${(1 - easedProgress) * 100}% 0 0 0)`;
      break;
    case 'down':
      clipPath = `inset(0 0 ${(1 - easedProgress) * 100}% 0)`;
      break;
    case 'diagonal-tl-br':
      clipPath = `polygon(0 0, ${easedProgress * 100}% 0, 0 ${easedProgress * 100}%, 0 0)`;
      break;
    case 'diagonal-tr-bl':
      clipPath = `polygon(${100 - easedProgress * 100}% 0, 100% 0, 100% ${easedProgress * 100}%, 0 0)`;
      break;
  }

  if (feather > 0) {
    // For feathering, we'd need a more complex mask approach
    // This is a simplified version - real implementation would use mask-image
  }

  return (
    <>
      {cloneElement(fromElement as ReactElement, {
        style: { ...fromStyle, clipPath: 'inset(0 0 0 0)' },
      } as Record<string, unknown>)}
      {cloneElement(toElement as ReactElement, {
        style: { ...toStyle, clipPath, willChange: 'clip-path' },
      } as Record<string, unknown>)}
    </>
  );
};

/**
 * Wipe transition variant configs.
 */
export const wipeVariants = {
  left: { id: 'wipe-left', name: 'Wipe Left', component: Wipe, defaultProps: { direction: 'left' as WipeDirection } },
  right: { id: 'wipe-right', name: 'Wipe Right', component: Wipe, defaultProps: { direction: 'right' as WipeDirection } },
  up: { id: 'wipe-up', name: 'Wipe Up', component: Wipe, defaultProps: { direction: 'up' as WipeDirection } },
  down: { id: 'wipe-down', name: 'Wipe Down', component: Wipe, defaultProps: { direction: 'down' as WipeDirection } },
  diagonalTLBR: { id: 'wipe-diagonal-tl-br', name: 'Wipe Diagonal TL-BR', component: Wipe, defaultProps: { direction: 'diagonal-tl-br' as WipeDirection } },
  diagonalTRBL: { id: 'wipe-diagonal-tr-bl', name: 'Wipe Diagonal TR-BL', component: Wipe, defaultProps: { direction: 'diagonal-tr-bl' as WipeDirection } },
} as const;