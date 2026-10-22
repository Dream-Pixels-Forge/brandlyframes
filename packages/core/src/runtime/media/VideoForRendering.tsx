/**
 * `<VideoForRendering>` — render-optimized video primitive. Forces the
 * playback time to the frame-derived time (`frame / fps`) so every frame is
 * deterministic (`frame -> pixels`). Use this for render output; for
 * responsive scrubbing in Studio/Player prefer `<VideoForPreview>`.
 *
 * Must be rendered inside a frame context.
 */

import type { FC, VideoHTMLAttributes } from 'react';
import { useCurrentFrame } from '../../hooks';
import { useVideoConfig } from '../../hooks';

export type VideoRenderingProps = VideoHTMLAttributes<HTMLVideoElement> & {
  /** Video source — usually built with `staticFile()`. */
  src: string;
};

export const VideoForRendering: FC<VideoRenderingProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <video {...props} data-current-time={frame / fps} />;
};
