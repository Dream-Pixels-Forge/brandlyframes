/**
 * `<Audio>` — the frame-driven audio primitive (BF-007). Thin, deterministic
 * wrapper around the native `<audio>`: the frame-derived playback time is
 * exposed on the rendered tree (`data-current-time`, in seconds) so the same
 * frame always produces the same output. No playback engine yet — the P3
 * renderer mounts real playback and volume curves on this component.
 */

import type { FC, AudioHTMLAttributes } from 'react';
import { useCurrentFrame } from '../../hooks';
import { useVideoConfig } from '../../hooks';

export type AudioProps = AudioHTMLAttributes<HTMLAudioElement> & {
  /** Audio source — usually built with `staticFile()`. */
  src: string;
};

/**
 * Renders an `<audio>` whose playback time is derived from the current
 * frame: `frame / fps` (Sequence-relative — inside a `<Sequence>` the child
 * frame drives the time). Must be rendered inside a frame context.
 */
export const Audio: FC<AudioProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <audio {...props} data-current-time={frame / fps} />;
};
