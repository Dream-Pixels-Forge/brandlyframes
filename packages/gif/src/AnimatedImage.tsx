import { jsx } from 'react/jsx-runtime';
import { mapGifFrameIndex } from './gif-frame-index';
import type { DecodedGif } from './types';

/** Props for {@link AnimatedImage}. */
export interface AnimatedImageProps {
  /** GIF source URL — set on the rendered `` for the renderer to resolve. */
  src: string;
  /** Decoded GIF frames (from `parseGif`); drives which source frame shows. */
  gif: DecodedGif;
  /** Composition frame index (non-negative integer). */
  frame: number;
  /** Composition frame rate (finite number > 0). */
  fps: number;
}

/**
 * `<AnimatedImage>` — renders an animated GIF driven by the composition
 * frame. The same composition frame always yields the same source frame
 * (`frame -> pixels`), so previews and renders match.
 *
 * Renders an `` whose `data-gif-frame` attribute names the current source
 * frame; the renderer resolves it to the rasterized GIF frame.
 *
 * The caller supplies `frame` and `fps` (e.g. from `useCurrentFrame()` /
 * `useVideoConfig()`), keeping this component free of context dependencies.
 */
export const AnimatedImage = (props: AnimatedImageProps) => {
  const { src, gif, frame, fps } = props;
  const gifFrame = mapGifFrameIndex(frame, fps, gif);
  return jsx('img', {
    src,
    'data-gif-frame': gifFrame,
    'data-frame': gifFrame,
    alt: '',
  });
};
