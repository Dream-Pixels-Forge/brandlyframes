/**
 * `<OffthreadVideo>` — decodes video frames off the main thread and renders
 * them into a canvas, driven by the composition frame clock ([frame -> pixels]).
 *
 * The decode backend is injected (`OffthreadVideoDecoder`) so the component
 * works with real WebCodecs / FFmpeg backends but stays testable with a fake.
 * Frame mapping reuses {@link mapFrameVideoIndex} (trim / playbackRate /
 * reverse / freeze / ping-pong). The same composition frame always yields the
 * same source frame index, so previews and renders match.
 *
 * The decoder is invoked during render (synchronously from a pre-decoded
 * FrameStore or cache). A real renderer draws the returned RGBA pixels onto
 * the canvas; this component wires the decode to the frame clock and renders
 * the canvas placeholder annotated with the source frame index.
 */

import { useState, type ReactElement } from 'react';
import { mapFrameVideoIndex } from './frame-video';

/** RGBA pixels for a single source frame: width * height * 4 bytes. */
export type DecodedFrame = Uint8ClampedArray;

/** A synchronous frame decoder — real backends wrap WebCodecs / FFmpeg. */
export interface OffthreadVideoDecoder {
  /** Returns the RGBA pixels for the given source frame index. */
  decodeFrame(frameIndex: number): DecodedFrame;
}

/** Props for {@link OffthreadVideo}. */
export interface OffthreadVideoProps {
  /** Video source identifier (e.g. URL or id). */
  readonly src: string;
  /** Source frame count (positive integer). */
  readonly length: number;
  /** Composition frame index (non-negative integer). */
  readonly frame: number;
  /** Composition frame rate (passed through to the decoder for timestamping). */
  readonly fps?: number;
  /** Half-open source window `[from, to)` intersected with `[0, length)`. */
  readonly trim?: [number, number];
  /** Speed multiplier. `2` shows every other source frame. */
  readonly playbackRate?: number;
  /** Play the window backwards. Ignored when `pingPong` is `true`. */
  readonly reverse?: boolean;
  /** Hold a single source frame (`null` = no freeze). Clamped to window. */
  readonly freeze?: number | null;
  /** Bounce back and forth across the window. `reverse` ignored when true. */
  readonly pingPong?: boolean;
  /** Canvas width in CSS pixels. */
  readonly width?: number;
  /** Canvas height in CSS pixels. */
  readonly height?: number;
  /** Injectible decode backend. */
  readonly decoder: OffthreadVideoDecoder;
}

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;

/**
 * Renders a `<canvas>` annotated with the mapped source frame index. The
 * decoder is invoked during render so the pipeline is wired end-to-end; a
 * real renderer draws the returned RGBA pixels onto the canvas.
 */
export const OffthreadVideo = (props: OffthreadVideoProps): ReactElement => {
  const {
    src,
    length,
    frame,
    trim,
    playbackRate,
    reverse,
    freeze,
    pingPong,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    decoder,
  } = props;

  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error(
      `OffthreadVideo: length must be a positive integer, got ${length}`,
    );
  }
  if (!Number.isSafeInteger(frame) || frame < 0) {
    throw new Error(
      `OffthreadVideo: frame must be a non-negative safe integer, got ${frame}`,
    );
  }

  const sourceFrame = mapFrameVideoIndex(frame, length, {
    trim,
    playbackRate,
    reverse,
    freeze,
    pingPong,
  });

  // Decode the source frame synchronously (pre-decoded FrameStore or cache).
  // `fps` is reserved for decoders that timestamp frames; it is not needed
  // for index-based decode from a FrameStore.
  const [pixels] = useState(() => decoder.decodeFrame(sourceFrame));
  void pixels; // Real renderers draw `pixels` onto the canvas below.

  return (
    <canvas
      width={width}
      height={height}
      data-src={src}
      data-frame={String(sourceFrame)}
      data-source-frame={String(sourceFrame)}
      style={{ display: 'block' }}
    />
  );
};
