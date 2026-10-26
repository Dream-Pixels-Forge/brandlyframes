/**
 * BF-303 live mode — pure wall-time → frame mapping ("frame is the clock",
 * but wall time decides which frame a live overlay shows).
 */
import { describe, expect, it } from 'vitest';
import { frameAt } from '../../src/live-clock';

describe('frameAt (BF-303)', () => {
  it('maps elapsed wall time to the frame at 60fps', () => {
    expect(frameAt(0, 60, 300)).toBe(0);
    expect(frameAt(16, 60, 300)).toBe(0); // 16ms < 1 frame period (16.667ms)
    expect(frameAt(17, 60, 300)).toBe(1);
    expect(frameAt(1000, 60, 100000)).toBe(60); // exactly 1s in
  });

  it('loops within durationInFrames', () => {
    expect(frameAt(5000, 60, 300)).toBe(0); // 5s at 60fps = frame 300 → loops to 0
    expect(frameAt(5017, 60, 300)).toBe(1);
  });

  it('handles fractional fps (29.97) without drift', () => {
    // 1000/29.97 ms per frame; after 1s → floor(29.97) = 29
    expect(frameAt(1000, 29.97, 100000)).toBe(29);
  });

  it('is a pure function: same input, same frame', () => {
    expect(frameAt(12345.678, 60, 90)).toBe(frameAt(12345.678, 60, 90));
  });

  it('rejects non-positive fps and duration', () => {
    expect(() => frameAt(0, 0, 300)).toThrow(RangeError);
    expect(() => frameAt(0, 60, 0)).toThrow(RangeError);
  });
});
