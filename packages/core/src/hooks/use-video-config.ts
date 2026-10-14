import { useContext } from 'react';
import { VideoConfigContext, type VideoConfig } from '../context/frame-context';

/**
 * The video config (fps, width, height, durationInFrames) of the composition
 * currently being rendered, inherited through Sequence/Loop/Freeze scopes.
 *
 * Throws a helpful error when called outside a `<FrameContextProvider>`
 * (which `<Composition>` mounts automatically).
 */
export const useVideoConfig = (): VideoConfig => {
  const config = useContext(VideoConfigContext);
  if (config === null) {
    throw new Error(
      'useVideoConfig() must be used inside a <FrameContextProvider> — wrap the component tree in <FrameContextProvider> (this is done automatically by <Composition>).',
    );
  }
  return config;
};
