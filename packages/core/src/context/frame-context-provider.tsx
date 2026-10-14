import { useContext, type FC, type ReactNode } from 'react';
import { FrameContext, VideoConfigContext, type VideoConfig } from './frame-context';
import { validateFrame, validateVideoConfig } from '../timing/validate-frame-inputs';

export type FrameContextProviderProps = {
  /** The current frame. Omitted to inherit it from the enclosing provider. */
  currentFrame?: number;
  /** The video config. Omitted to inherit it from the enclosing provider. */
  videoConfig?: VideoConfig;
  children?: ReactNode;
};

/**
 * The single source of frame truth for a subtree: provides `currentFrame`
 * and `videoConfig` to `useCurrentFrame()` / `useVideoConfig()`.
 *
 * Values not passed explicitly are inherited from the enclosing provider, so
 * frame-scoping components (Sequence, Loop, Freeze) can override just the
 * frame while the config flows through unchanged. `<Composition>` mounts one
 * at the root of every composition with both values.
 */
export const FrameContextProvider: FC<FrameContextProviderProps> = ({ currentFrame, videoConfig, children }) => {
  const parentFrame = useContext(FrameContext);
  const parentVideoConfig = useContext(VideoConfigContext);
  const frame = currentFrame ?? parentFrame;
  const config = videoConfig ?? parentVideoConfig;
  if (frame !== null) validateFrame(frame, '<FrameContextProvider> currentFrame');
  if (config !== null) validateVideoConfig(config);
  return (
    <FrameContext.Provider value={frame}>
      <VideoConfigContext.Provider value={config}>{children}</VideoConfigContext.Provider>
    </FrameContext.Provider>
  );
};
