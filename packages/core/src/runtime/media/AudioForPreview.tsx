/**
 * `<AudioForPreview>` — preview-optimized audio primitive. Lets the native
 * `<audio>` element manage its own playback time, so scrubbing and seeking
 * stay responsive in Studio/Player. Not deterministic — do not use for
 * render output; prefer `<AudioForRendering>` there.
 */

import type { FC, AudioHTMLAttributes } from 'react';

export type AudioPreviewProps = AudioHTMLAttributes<HTMLAudioElement> & {
  /** Audio source — usually built with `staticFile()`. */
  src: string;
};

export const AudioForPreview: FC<AudioPreviewProps> = (props) => <audio {...props} />;
