/**
 * Crossfade transition — [BF-070]
 *
 * Smoothly blends between two elements by interpolating opacity.
 * Frame-exact and deterministic.
 */

import { type FC, type ReactElement, cloneElement, isValidElement, CSSProperties } from 'react';

type TypedReactElement = ReactElement<any, any>;
import { TransitionBaseProps, EasingFn, createProgress, easeInOut } from './types';

/**
 * Crossfade transition props.
 */
export interface CrossfadeProps extends TransitionBaseProps {
  /** Optional: crossfade both directions simultaneously (true) or sequential (false). Default: false. */
  simultaneous?: boolean;
  /** Current frame index (instead of using useCurrentFrame hook). */
  frame: number;
}

/**
 * Crossfade transition component.
 *
 * Interpolates opacity of the two children based on transition progress.
 * When simultaneous=true, both elements are visible during the transition.
 * When simultaneous=false, first element fades out, then second fades in.
 *
 * @param props - durationFrames, easing, children, simultaneous, frame
 * @returns Composed transition element
 */
export const Crossfade: FC<CrossfadeProps> = ({
  durationFrames,
  easing = easeInOut,
  children,
  simultaneous = false,
  frame,
}) => {
  if (!isValidElement(children[0]) || !isValidElement(children[1])) {
    throw new Error('Crossfade requires exactly two valid React elements as children');
  }

  const [fromElement, toElement] = children as [TypedReactElement, TypedReactElement];
  const progress = createProgress(Math.min(frame / durationFrames, 1));
  const easedProgress = easing(progress);

  const fromStyle = (fromElement.props.style as CSSProperties) || {};
  const toStyle = (toElement.props.style as CSSProperties) || {};

  if (simultaneous) {
    // Both elements visible, crossfade opacity
    const fromOpacity = 1 - easedProgress;
    const toOpacity = easedProgress;

    return (
      <>
        {cloneElement(fromElement as ReactElement, {
          style: { ...fromStyle, opacity: fromOpacity },
        } as Record<string, unknown>)}
        {cloneElement(toElement as ReactElement, {
          style: { ...toStyle, opacity: toOpacity },
        } as Record<string, unknown>)}
      </>
    );
  }

  // Sequential: first fade out, then fade in
  const midpoint = 0.5;
  let fromOpacity: number;
  let toOpacity: number;

  if (progress <= midpoint) {
    // First half: fade out from element
    const localProgress = createProgress(progress / midpoint);
    const eased = easing(localProgress);
    fromOpacity = 1 - eased;
    toOpacity = 0;
  } else {
    // Second half: fade in to element
    const localProgress = createProgress((progress - midpoint) / midpoint);
    const eased = easing(localProgress);
    fromOpacity = 0;
    toOpacity = eased;
  }

  return (
    <>
      {cloneElement(fromElement as ReactElement, {
        style: { ...fromStyle, opacity: fromOpacity },
      } as Record<string, unknown>)}
      {cloneElement(toElement as ReactElement, {
        style: { ...toStyle, opacity: toOpacity },
      } as Record<string, unknown>)}
    </>
  );
};

/**
 * Crossfade transition variant config.
 */
export const crossfadeVariant = {
  id: 'crossfade',
  name: 'Crossfade',
  component: Crossfade,
} as const;
