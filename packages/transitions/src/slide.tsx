/**
 * Slide transition — [BF-070]
 *
 * Slides one element out while sliding the other in from a specified direction.
 * Frame-exact and deterministic.
 */

import { type FC, type ReactElement, cloneElement, isValidElement, CSSProperties } from 'react';

type TypedReactElement = ReactElement<Record<string, unknown>>;
import { TransitionBaseProps, createProgress, easeInOut } from './types';

/**
 * Slide direction.
 */
export type SlideDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Slide transition props.
 */
export interface SlideProps extends TransitionBaseProps {
  /** Direction the "to" element slides in from. Default: 'left'. */
  direction?: SlideDirection;
  /** Distance to slide (percentage of container size). Default: 100. */
  distancePercent?: number;
  /** Current frame index (instead of using useCurrentFrame hook). */
  frame: number;
}

/**
 * Slide transition component.
 *
 * Slides the "to" element in from the specified direction while optionally
 * sliding the "from" element out in the opposite direction.
 *
 * @param props - durationFrames, easing, children, direction, distancePercent, frame
 * @returns Composed transition element
 */
export const Slide: FC<SlideProps> = ({
  durationFrames,
  easing = easeInOut,
  children,
  direction = 'left',
  distancePercent = 100,
  frame,
}) => {
  if (!isValidElement(children[0]) || !isValidElement(children[1])) {
    throw new Error('Slide requires exactly two valid React elements as children');
  }

  const [fromElement, toElement] = children as [TypedReactElement, TypedReactElement];
  const progress = createProgress(Math.min(frame / durationFrames, 1));
  const easedProgress = easing(progress);

  const fromStyle = (fromElement.props.style as CSSProperties) || {};
  const toStyle = (toElement.props.style as CSSProperties) || {};

  // Calculate transform based on direction
  const distance = distancePercent / 100;
  let fromTransform: string;
  let toTransform: string;

  switch (direction) {
    case 'left':
      fromTransform = `translateX(${-easedProgress * distance * 100}%)`;
      toTransform = `translateX(${(1 - easedProgress) * distance * 100}%)`;
      break;
    case 'right':
      fromTransform = `translateX(${easedProgress * distance * 100}%)`;
      toTransform = `translateX(${-(1 - easedProgress) * distance * 100}%)`;
      break;
    case 'up':
      fromTransform = `translateY(${-easedProgress * distance * 100}%)`;
      toTransform = `translateY(${(1 - easedProgress) * distance * 100}%)`;
      break;
    case 'down':
      fromTransform = `translateY(${easedProgress * distance * 100}%)`;
      toTransform = `translateY(${-(1 - easedProgress) * distance * 100}%)`;
      break;
  }

  return (
    <>
      {cloneElement(fromElement as ReactElement, {
        style: { ...fromStyle, transform: fromTransform, willChange: 'transform' },
      } as Record<string, unknown>)}
      {cloneElement(toElement as ReactElement, {
        style: { ...toStyle, transform: toTransform, willChange: 'transform' },
      } as Record<string, unknown>)}
    </>
  );
};

/**
 * Slide transition variant configs.
 */
export const slideVariants = {
  left: { id: 'slide-left', name: 'Slide Left', component: Slide, defaultProps: { direction: 'left' as SlideDirection } },
  right: { id: 'slide-right', name: 'Slide Right', component: Slide, defaultProps: { direction: 'right' as SlideDirection } },
  up: { id: 'slide-up', name: 'Slide Up', component: Slide, defaultProps: { direction: 'up' as SlideDirection } },
  down: { id: 'slide-down', name: 'Slide Down', component: Slide, defaultProps: { direction: 'down' as SlideDirection } },
} as const;