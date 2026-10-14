/**
 * `<Video>` — the frame-driven video primitive (BF-007). Thin, deterministic
 * wrapper around the native `<video>`: the frame-derived playback time is
 * exposed on the rendered tree (`data-current-time`, in seconds) so the same
 * frame always produces the same output. No playback engine yet — P3 mounts
 * real playback here, and P5's `<FrameVideo>` adds exact-frame decoding
 * (BF-450 will auto-promote this component in render mode).
 */

import type { FC, VideoHTMLAttributes } from 'react';
import { useCurrentFrame } from '../../hooks';
import { useVideoConfig } from '../../hooks';

export type VideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  /** Video source — usually built with `staticFile()`. */
  src: string;
};

/**
 * Renders a `<video>` whose playback time is derived from the current
 * frame: `frame / fps` (Sequence-relative — inside a `<Sequence>` the child
 * frame drives the time). Must be rendered inside a frame context.
 */
export const Video: FC<VideoProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <video {...props} data-current-time={frame / fps} />;
};
