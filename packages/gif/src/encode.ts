/**
 * GIF89a encoder [BF-071]
 *
 * Emits header, logical screen, NETSCAPE loop extension, per-frame GCE +
 * image blocks, and trailer. Pure bytes — no canvas, no browser globals.
 */

import { lzwEncode } from './lzw';
import { buildPalette, paddedPalette, quantizeToPalette } from './palette';
import type { EncodeGifOptions } from './types';

/** Minimum LZW code size for a global palette with `entries` colors. */
function minCodeSizeFor(entries: number): number {
  if (entries <= 2) return 1;
  if (entries <= 4) return 2;
  if (entries <= 8) return 3;
  if (entries <= 16) return 4;
  if (entries <= 32) return 5;
  if (entries <= 64) return 6;
  if (entries <= 128) return 7;
  return 8;
}

/**
 * Encode RGBA frames as a GIF89a byte stream.
 *
 * @param options Width, height, frames (all identical dimensions) and loop count
 * @returns Complete GIF file bytes (header through trailer)
 */
export function encodeGif(options: EncodeGifOptions): Uint8Array {
  const { width, height, frames } = options;
  if (!Number.isInteger(width) || width < 1 || width > 65535) {
    throw new RangeError(`encodeGif: width must be 1..65535, got ${width}`);
  }
  if (!Number.isInteger(height) || height < 1 || height > 65535) {
    throw new RangeError(`encodeGif: height must be 1..65535, got ${height}`);
  }
  if (frames.length === 0) throw new RangeError('encodeGif: at least one frame is required');
  const loopCount = options.loopCount ?? 0;
  const expected = width * height * 4;
  for (const frame of frames) {
    if (frame.rgba.length !== expected) {
      throw new RangeError(`encodeGif: frame length ${frame.rgba.length} != ${expected}`);
    }
  }

  const palette = buildPalette(frames.map((f) => f.rgba));
  const { entries, bytes } = paddedPalette(palette);
  const minCodeSize = minCodeSizeFor(entries);
  const out: number[] = [];

  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a
  out.push(width & 0xff, (width >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff);
  const sizeBits = Math.log2(entries) - 1;
  out.push(0x80 | (sizeBits << 4), 0x00, 0x00);
  for (const byte of bytes) out.push(byte);

  out.push(
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01,
    loopCount & 0xff,
    (loopCount >> 8) & 0xff,
    0x00,
  );

  for (const frame of frames) {
    const delay = Math.max(0, Math.min(65535, Math.round(frame.delayCentiseconds)));
    out.push(0x21, 0xf9, 0x04, 0x00, delay & 0xff, (delay >> 8) & 0xff, 0x00, 0x00);
    out.push(
      0x2c,
      0x00, 0x00, 0x00, 0x00,
      width & 0xff, (width >> 8) & 0xff,
      height & 0xff, (height >> 8) & 0xff,
      0x00,
    );
    out.push(minCodeSize);
    const indices = quantizeToPalette(frame.rgba, palette);
    const payload = lzwEncode(indices, minCodeSize);
    for (let i = 0; i < payload.length; i += 255) {
      const chunk = payload.subarray(i, i + 255);
      out.push(chunk.length);
      for (const byte of chunk) out.push(byte);
    }
    out.push(0x00);
  }
  out.push(0x3b);
  return new Uint8Array(out);
}
