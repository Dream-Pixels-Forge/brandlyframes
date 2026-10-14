import type { FC, ReactNode } from 'react';
import { AbsoluteFill } from '../absolute-fill/AbsoluteFill';
import { FrameContextProvider } from '../../context/frame-context-provider';
import { useCurrentFrame } from '../../hooks/use-current-frame';
import {
  isSequenceVisible,
  resolveSequenceFrame,
  validateFrame,
  validateLayout,
  validatePositiveInteger,
} from '../../timing';

/** How a frame-scoper renders its children inside the layout. */
export type SequenceLayout = 'absolute-fill' | 'none';

export type SequenceProps = {
  /**
   * Absolute parent frame at which the Sequence starts. Negative values make
   * the Sequence start before the parent timeline and run its child frame
   * ahead. Defaults to 0.
   */
  from?: number;
  /** Length of the Sequence in frames. Positive integer. */
  durationInFrames: number;
  /** 'absolute-fill' (default) wraps children in an <AbsoluteFill>. */
  layout?: SequenceLayout;
  children?: ReactNode;
};

/**
 * Time-shifts and clips a subtree: children see their own timeline starting
 * at 0 where the parent frame equals `from`, and render only within
 * `[from, from + durationInFrames)`. Nested Sequences compose their offsets.
 */
export const Sequence: FC<SequenceProps> = ({ from = 0, durationInFrames, layout = 'absolute-fill', children }) => {
  validateFrame(from, '<Sequence> from');
  validatePositiveInteger(durationInFrames, '<Sequence> durationInFrames');
  validateLayout(layout, '<Sequence>');
  const parentFrame = useCurrentFrame();
  if (!isSequenceVisible(parentFrame, from, durationInFrames)) return null;
  const childFrame = resolveSequenceFrame(parentFrame, from);
  const scoped = <FrameContextProvider currentFrame={childFrame}>{children}</FrameContextProvider>;
  return layout === 'absolute-fill' ? <AbsoluteFill>{scoped}</AbsoluteFill> : scoped;
};
