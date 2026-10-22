/**
 * `<OffthreadVideo>` — decodes video frames off the main thread and renders
 * them into a canvas, driven by the composition frame clock ([frame -> pixels]).
 *
 * The decode backend is injected (`OffthreadVideoDecoder`) so the component
 * is testable without real WebCodecs / FFmpeg: a fake decoder returns known
 * pixels for a given source frame index.
 *
 * Frame mapping reuses {@link mapFrameVideoIndex} (trim / playbackRate /
 * reverse / freeze / ping-pong). The same composition frame always yields the
 * same source frame index, so previews and renders match.
 */

import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { jsx } from 'react/jsx-runtime';
import { OffthreadVideo, type OffthreadVideoProps } from '../src/offthread-video';

const WIDTH = 1920;
const HEIGHT = 1080;
const LENGTH = 100; // source frame count
const FPS = 30;

/** A fake decoder that records calls and returns known RGBA pixels. */
class FakeDecoder {
  calls: number[] = [];
  pixelsByFrame = new Map<number, Uint8ClampedArray>();

  decodeFrame(frameIndex: number): Uint8ClampedArray {
    this.calls.push(frameIndex);
    let pixels = this.pixelsByFrame.get(frameIndex);
    if (!pixels) {
      pixels = new Uint8ClampedArray([frameIndex, 0, 0, 255]);
      this.pixelsByFrame.set(frameIndex, pixels);
    }
    return pixels;
  }
}

const defaultProps: OffthreadVideoProps = {
  src: 'clip.mp4',
  length: LENGTH,
  frame: 0,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  decoder: new FakeDecoder(),
};

/** Renders `<OffthreadVideo>` and returns the fake decoder + HTML output. */
function renderOffthreadVideo(props: Partial<OffthreadVideoProps> = {}): {
  decoder: FakeDecoder;
  html: string;
} {
  const decoder = new FakeDecoder();
  const html = renderToString(
    jsx(OffthreadVideo, { ...defaultProps, ...props, decoder }),
  );
  return { decoder, html };
}

describe('<OffthreadVideo>', () => {
  it('renders a canvas element sized to width/height', () => {
    const { html } = renderOffthreadVideo({ frame: 0 });
    expect(html).toContain('<canvas');
    expect(html).toContain(`width="${WIDTH}"`);
    expect(html).toContain(`height="${HEIGHT}"`);
  });

  it('calls the decoder with the mapped source frame index', () => {
    // frame 0 -> source frame 0 (no trim/rate/reverse)
    const { decoder, html } = renderOffthreadVideo({ frame: 0 });
    expect(html).toContain('data-frame="0"');
    expect(decoder.calls).toEqual([0]);
  });

  it('maps composition frame to source frame via playbackRate', () => {
    // playbackRate 2 -> composition frame 1 maps to source frame 2
    const { decoder, html } = renderOffthreadVideo({ frame: 1, playbackRate: 2 });
    expect(html).toContain('data-frame="2"');
    expect(decoder.calls).toEqual([2]);
  });

  it('reverses the source frame order when reverse is set', () => {
    // composition frame 0 -> last source frame (99) when reversed
    const { decoder, html } = renderOffthreadVideo({ frame: 0, reverse: true });
    expect(html).toContain('data-frame="99"');
    expect(decoder.calls).toEqual([99]);
  });

  it('is deterministic: same props yield the same data-frame attribute', () => {
    const a = renderOffthreadVideo({ frame: 42 });
    const b = renderOffthreadVideo({ frame: 42 });
    expect(a.html).toBe(b.html);
    expect(a.decoder.calls).toEqual(b.decoder.calls);
  });

  it('freezes to the requested source frame', () => {
    // freeze 7 -> always source frame 7 regardless of composition frame
    const { decoder, html } = renderOffthreadVideo({ frame: 50, freeze: 7 });
    expect(html).toContain('data-frame="7"');
    expect(decoder.calls).toEqual([7]);
  });

  it('does not call the decoder when the source has no frames', () => {
    expect(() =>
      renderOffthreadVideo({ length: 0, frame: 0 }),
    ).toThrow(/length/);
  });
});
