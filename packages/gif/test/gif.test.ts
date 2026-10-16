/**
 * RED phase — @brandlyframes/gif [BF-071]
 *
 * Pure-TS GIF89a export/import, Node-testable (Uint8Array in/out, no canvas).
 * Tests use hand-crafted minimal GIF byte streams plus encode→parse round-trips.
 */

import { describe, it, expect } from 'vitest';
import { parseGif, encodeGif, gifFrameToRgba } from '../src/index';

/** Minimal 1x1 single-frame GIF89a: global palette [black, white], pixel 1, no loop. */
const MIN_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
  0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, // 1x1, GCT flag, 2 colors, bg 0, aspect 0
  0x00, 0x00, 0x00, 0xff, 0xff, 0xff, // palette: black, white
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // image descriptor
  0x02, 0x02, 0x4c, 0x01, 0x00, // min code 2, 2-byte LZW payload, terminator
  0x3b, // trailer
]);

describe('parseGif', () => {
  it('parses header, logical screen, palette and single frame', () => {
    const gif = parseGif(MIN_GIF);
    expect(gif.width).toBe(1);
    expect(gif.height).toBe(1);
    expect(gif.frames).toHaveLength(1);
    expect(gif.loopCount).toBe(0);
  });

  it('decodes pixel indices through the global palette', () => {
    const gif = parseGif(MIN_GIF);
    const rgba = gifFrameToRgba(gif, 0);
    expect(rgba).toEqual(new Uint8ClampedArray([255, 255, 255, 255]));
  });

  it('reads per-frame delays and loop count from extensions', () => {
    const encoded = encodeGif({
      width: 2,
      height: 2,
      loopCount: 3,
      frames: [
        { rgba: new Uint8ClampedArray(2 * 2 * 4).fill(255), delayCentiseconds: 10 },
        { rgba: new Uint8ClampedArray(2 * 2 * 4).fill(0), delayCentiseconds: 20 },
      ],
    });
    const gif = parseGif(encoded);
    expect(gif.frames).toHaveLength(2);
    expect(gif.frames[0].delayCentiseconds).toBe(10);
    expect(gif.frames[1].delayCentiseconds).toBe(20);
    expect(gif.loopCount).toBe(3);
  });

  it('rejects non-GIF input', () => {
    expect(() => parseGif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toThrow(/not a GIF/i);
  });
});

describe('encodeGif', () => {
  it('emits a valid GIF89a header and trailer', () => {
    const out = encodeGif({
      width: 1,
      height: 1,
      frames: [{ rgba: new Uint8ClampedArray([255, 0, 0, 255]), delayCentiseconds: 5 }],
    });
    expect(out[0]).toBe(0x47);
    expect(out[1]).toBe(0x49);
    expect(out[2]).toBe(0x46);
    expect(out[out.length - 1]).toBe(0x3b);
  });

  it('round-trips solid-color frames through parse with exact RGBA', () => {
    const red = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const out = encodeGif({ width: 2, height: 1, frames: [{ rgba: red, delayCentiseconds: 5 }] });
    const gif = parseGif(out);
    expect(gif.width).toBe(2);
    expect(gif.height).toBe(1);
    expect(gifFrameToRgba(gif, 0)).toEqual(red);
  });
});
