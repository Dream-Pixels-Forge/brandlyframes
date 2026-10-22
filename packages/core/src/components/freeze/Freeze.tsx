import type { FC, ReactNode } from 'react';
import { FrameContextProvider } from '../../context/frame-context-provider';
import { FreezeContextProvider } from '../../context/freeze-context';
import { useCurrentFrame } from '../../hooks/use-current-frame';
import { resolveFreezeFrame, type FreezeFrameOverride } from '../../timing';

export type FreezeProps = {
  /**
   * The frame the children always see: a constant, or a function mapping the
   * parent frame to the frozen frame. The resolved value must be a finite
   * integer.
   */
  frame: FreezeFrameOverride;
  children?: ReactNode;
};

/**
 * Stops time for a subtree: children observe a pinned frame regardless of
 * where the parent timeline is. Nested Freezes compose — a function override
 * receives the already-frozen frame of the enclosing Freeze.
 */
export const Freeze: FC<FreezeProps> = ({ frame, children }) => {
  const parentFrame = useCurrentFrame();
  const frozenFrame = resolveFreezeFrame(parentFrame, frame);
  return (
    <FreezeContextProvider>
      <FrameContextProvider currentFrame={frozenFrame}>{children}</FrameContextProvider>
    </FreezeContextProvider>
  );
};
