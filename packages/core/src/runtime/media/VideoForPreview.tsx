/**
 * `<VideoForPreview>` — preview-optimized video primitive. Lets the native
 * `<video>` element manage its own playback time, so scrubbing and seeking
 * stay responsive in Studio/Player. Not deterministic — do not use for
 * render output; prefer `<VideoForRendering>` there.
 */

import type { FC, VideoHTMLAttributes } from 'react';

export type VideoPreviewProps = VideoHTMLAttributes<HTMLVideoElement> & {
  /** Video source — usually built with `staticFile()`. */
  src: string;
};

export const VideoForPreview: FC<VideoPreviewProps> = (props) => <video {...props} />;
