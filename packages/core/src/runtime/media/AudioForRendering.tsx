/**
 * `<AudioForRendering>` — render-optimized audio primitive. Forces the
 * playback time to the frame-derived time (`frame / fps`) so every frame is
 * deterministic (`frame -> pixels`). Use this for render output; for
 * responsive scrubbing in Studio/Player prefer `<AudioForPreview>`.
 *
 * Must be rendered inside a frame context.
 */

import type { FC, AudioHTMLAttributes } from 'react';
import { useCurrentFrame } from '../../hooks';
import { useVideoConfig } from '../../hooks';

export type AudioRenderingProps = AudioHTMLAttributes<HTMLAudioElement> & {
  /** Audio source — usually built with `staticFile()`. */
  src: string;
};

export const AudioForRendering: FC<AudioRenderingProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <audio {...props} data-current-time={frame / fps} />;
};
