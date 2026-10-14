import type { FC, ReactNode } from 'react';
import { AbsoluteFill } from '../absolute-fill/AbsoluteFill';
import { FrameContextProvider } from '../../context/frame-context-provider';
import { useCurrentFrame } from '../../hooks/use-current-frame';
import type { SequenceLayout } from '../sequence/Sequence';
import { isLoopActive, resolveLoopFrame, validateLayout, validatePositiveInteger } from '../../timing';

export type LoopProps = {
  /** Length of one iteration in frames. Positive integer. */
  durationInFrames: number;
  /** Number of iterations. Omit to loop until the enclosing timeline clips it. */
  times?: number;
  /** 'absolute-fill' (default) wraps children in an <AbsoluteFill>. */
  layout?: SequenceLayout;
  children?: ReactNode;
};

/**
 * Repeats a subtree: the children's frame resets to 0 every
 * `durationInFrames` frames. Children must be pure functions of the frame —
 * frame N renders identically on every iteration.
 */
export const Loop: FC<LoopProps> = ({ durationInFrames, times, layout = 'absolute-fill', children }) => {
  validatePositiveInteger(durationInFrames, '<Loop> durationInFrames');
  if (times !== undefined) validatePositiveInteger(times, '<Loop> times');
  validateLayout(layout, '<Loop>');
  const parentFrame = useCurrentFrame();
  if (!isLoopActive(parentFrame, durationInFrames, times)) return null;
  const childFrame = resolveLoopFrame(parentFrame, durationInFrames);
  const scoped = <FrameContextProvider currentFrame={childFrame}>{children}</FrameContextProvider>;
  return layout === 'absolute-fill' ? <AbsoluteFill>{scoped}</AbsoluteFill> : scoped;
};
