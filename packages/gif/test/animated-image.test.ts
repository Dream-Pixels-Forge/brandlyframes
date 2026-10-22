import { describe, expect, it } from 'vitest';
import { mapGifFrameIndex } from '../src/gif-frame-index';
import { AnimatedImage } from '../src/AnimatedImage';
import type { DecodedGif } from '../src/types';

/** Builds a minimal decoded GIF with the given per-frame delays (centiseconds). */
const gifWithDelays = (delays: number[], loopCount = 0): DecodedGif => ({
  width: 2,
  height: 2,
  globalPalette: new Uint8Array(0),
  frames: delays.map((delay) => ({
    indices: new Uint8Array(4),
    delayCentiseconds: delay,
    transparentIndex: null,
    localPalette: null,
    disposal: 0,
  })),
  loopCount,
});

// 30 fps → 33.333 ms per composition frame; 30 cs delay = 300 ms = 9 frames.
describe('mapGifFrameIndex', () => {
  it('shows the first frame at composition frame 0', () => {
    const gif = gifWithDelays([30, 30]);
    expect(mapGifFrameIndex(0, 30, gif)).toBe(0);
  });

  it('advances to the next frame once its delay elapses', () => {
    const gif = gifWithDelays([30, 30]);
    // Frame 0: composition frames 0-8 (0 to 266 ms < 300 ms).
    expect(mapGifFrameIndex(0, 30, gif)).toBe(0);
    expect(mapGifFrameIndex(1, 30, gif)).toBe(0);
    expect(mapGifFrameIndex(8, 30, gif)).toBe(0);
    // composition frame 9 → 300 ms → frame 1 (300 < 600).
    expect(mapGifFrameIndex(9, 30, gif)).toBe(1);
  });

  it('stays on the last frame once all delays are consumed (no loop)', () => {
    const gif = gifWithDelays([30, 30], 1); // play once
    // period 600 ms = 18 composition frames; totalAvailable 600 ms → hold at frame 18+.
    expect(mapGifFrameIndex(5, 30, gif)).toBe(0); // 166 ms, loop 1 frame 0
    expect(mapGifFrameIndex(9, 30, gif)).toBe(1); // 300 ms, loop 1 frame 1
    expect(mapGifFrameIndex(17, 30, gif)).toBe(1); // 566 ms, still frame 1
    expect(mapGifFrameIndex(18, 30, gif)).toBe(1); // 600 ms → past end, hold last
    expect(mapGifFrameIndex(100, 30, gif)).toBe(1);
  });

  it('loops forever when loopCount is 0', () => {
    const gif = gifWithDelays([30, 30], 0); // infinite loop
    // period 600 ms = 18 composition frames
    expect(mapGifFrameIndex(0, 30, gif)).toBe(0);
    expect(mapGifFrameIndex(9, 30, gif)).toBe(1);
    expect(mapGifFrameIndex(18, 30, gif)).toBe(0); // wrapped to loop start
    expect(mapGifFrameIndex(27, 30, gif)).toBe(1);
  });

  it('loops a finite number of times then holds', () => {
    const gif = gifWithDelays([30, 30], 2); // play twice
    // period 600 ms, two loops = 1200 ms = 36 composition frames
    expect(mapGifFrameIndex(0, 30, gif)).toBe(0);
    expect(mapGifFrameIndex(9, 30, gif)).toBe(1);
    expect(mapGifFrameIndex(18, 30, gif)).toBe(0); // loop 2, frame 0
    expect(mapGifFrameIndex(27, 30, gif)).toBe(1); // loop 2, frame 1
    expect(mapGifFrameIndex(36, 30, gif)).toBe(1); // past both loops → hold last
    expect(mapGifFrameIndex(100, 30, gif)).toBe(1);
  });

  it('handles a single-frame GIF (always frame 0)', () => {
    const gif = gifWithDelays([200]);
    expect(mapGifFrameIndex(0, 30, gif)).toBe(0);
    expect(mapGifFrameIndex(100, 30, gif)).toBe(0);
    expect(mapGifFrameIndex(1000, 30, gif)).toBe(0);
  });

  it('uses a zero-delay frame immediately', () => {
    const gif = gifWithDelays([0, 100]);
    // frame 0 has 0 delay → instantly advances to frame 1 at composition frame 0
    expect(mapGifFrameIndex(0, 30, gif)).toBe(1);
  });

  it('throws on invalid composition frame', () => {
    const gif = gifWithDelays([100]);
    expect(() => mapGifFrameIndex(-1, 30, gif)).toThrow(/composition frame/);
    expect(() => mapGifFrameIndex(1.5, 30, gif)).toThrow(/composition frame/);
  });

  it('throws on invalid fps', () => {
    const gif = gifWithDelays([100]);
    expect(() => mapGifFrameIndex(0, 0, gif)).toThrow(/fps/);
    expect(() => mapGifFrameIndex(0, -1, gif)).toThrow(/fps/);
    expect(() => mapGifFrameIndex(0, NaN, gif)).toThrow(/fps/);
  });

  it('throws on a GIF with no frames', () => {
    const gif: DecodedGif = {
      width: 1,
      height: 1,
      globalPalette: new Uint8Array(0),
      frames: [],
      loopCount: 0,
    };
    expect(() => mapGifFrameIndex(0, 30, gif)).toThrow(/frame/);
  });
});

const fps = 30;
const gif = gifWithDelays([30, 30]); // frame 0: composition frames 0-8, frame 1: 9-17

describe('<AnimatedImage>', () => {
  it('returns an  element passing src through', () => {
    const el = AnimatedImage({ src: 'anim.gif', gif, frame: 0, fps });
    expect(el.type).toBe('img');
    expect(el.props.src).toBe('anim.gif');
    expect(el.props.alt).toBe('');
  });

  it('sets data-gif-frame to the mapped source frame', () => {
    const el0 = AnimatedImage({ src: 'anim.gif', gif, frame: 0, fps });
    const el9 = AnimatedImage({ src: 'anim.gif', gif, frame: 9, fps });
    expect(el0.props['data-gif-frame']).toBe(0);
    expect(el0.props['data-frame']).toBe(0);
    expect(el9.props['data-gif-frame']).toBe(1);
    expect(el9.props['data-frame']).toBe(1);
  });

  it('is deterministic: same props yield same element props', () => {
    const el = AnimatedImage({ src: 'anim.gif', gif, frame: 5, fps });
    const el2 = AnimatedImage({ src: 'anim.gif', gif, frame: 5, fps });
    expect(el.props['data-gif-frame']).toBe(el2.props['data-gif-frame']);
  });
});
