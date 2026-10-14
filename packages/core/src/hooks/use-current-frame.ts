import { useContext } from 'react';
import { FrameContext } from '../context/frame-context';

/**
 * The current frame of the enclosing timeline scope: the composition frame
 * at the root, the Sequence-relative frame inside a `<Sequence>`, the
 * wrapped frame inside a `<Loop>`, and the pinned frame inside a `<Freeze>`.
 *
 * Throws a helpful error when called outside a `<FrameContextProvider>`
 * (which `<Composition>` mounts automatically).
 */
export const useCurrentFrame = (): number => {
  const frame = useContext(FrameContext);
  if (frame === null) {
    throw new Error(
      'useCurrentFrame() must be used inside a <FrameContextProvider> — wrap the component tree in <FrameContextProvider> (this is done automatically by <Composition>).',
    );
  }
  return frame;
};
