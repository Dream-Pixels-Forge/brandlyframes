import type { FC } from 'react';
import { renderToString } from 'react-dom/server';
import { FrameContextProvider, type VideoConfig } from '../src/context';
import { useCurrentFrame, useVideoConfig } from '../src/hooks';

export const TEST_VIDEO_CONFIG: VideoConfig = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 120,
};

/** Renders `frame:<n>` plus the whole video config — observes both hooks. */
export const FrameProbe: FC = () => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  return <>{`frame:${frame};fps:${config.fps};w:${config.width};h:${config.height};d:${config.durationInFrames}`}</>;
};

/** Renders only the video config — observes useVideoConfig alone. */
export const ConfigProbe: FC = () => {
  const config = useVideoConfig();
  return <>{`fps:${config.fps};w:${config.width};h:${config.height};d:${config.durationInFrames}`}</>;
};

/** Renders `ui` inside a root frame context at the given absolute frame. */
export const renderAtFrame = (ui: React.ReactElement, frame: number): string =>
  renderToString(
    <FrameContextProvider currentFrame={frame} videoConfig={TEST_VIDEO_CONFIG}>
      {ui}
    </FrameContextProvider>,
  );
