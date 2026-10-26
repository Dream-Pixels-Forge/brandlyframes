/**
 * BF-240: minimal clean-room PNG codec tests.
 *
 * The golden-frame diff decodes captured PNG bytes and stored golden PNGs,
 * so the codec must round-trip exactly and reject malformed input.
 */

import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodePng, encodePng } from '../src/png.js';

describe('png codec', () => {
  it('round-trips RGBA pixels through encode/decode', () => {
    const width = 4;
    const height = 3;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = (i * 7) % 256;
      pixels[i + 1] = (i * 13) % 256;
      pixels[i + 2] = (i * 29) % 256;
      pixels[i + 3] = 255;
    }

    const png = encodePng(pixels, width, height);
    const decoded = decodePng(png);

    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect(Array.from(decoded.pixels)).toEqual(Array.from(pixels));
  });

  it('starts with the PNG signature', () => {
    const png = encodePng(new Uint8ClampedArray(4 * 4 * 4), 4, 4);
    expect([0x89, 0x50, 0x4e, 0x47]).toEqual([...png.slice(0, 4)]);
  });

  it('decodes 8-bit RGB (color type 2) PNGs into RGBA', () => {
    // Hand-build a 1x1 RGB PNG via our own encoder path is not possible
    // (encode emits RGBA), so build the chunk structure manually here.
    const crcTable = buildCrcTable();
    const chunk = (type: string, data: Uint8Array): Uint8Array => {
      const out = new Uint8Array(12 + data.length);
      const view = new DataView(out.buffer);
      view.setUint32(0, data.length);
      out.set(Buffer.from(type, 'ascii'), 4);
      out.set(data, 8);
      const crcInput = out.subarray(4, 8 + data.length);
      view.setUint32(8 + data.length, crc32(crcInput, crcTable));
      return out;
    };

    const ihdr = new Uint8Array(13);
    const ihdrView = new DataView(ihdr.buffer);
    ihdrView.setUint32(0, 1); // width
    ihdrView.setUint32(4, 1); // height
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // color type: truecolor RGB
    // compression/filter/interlace all 0

    // One row: filter byte 0 + RGB pixel (10, 20, 30)
    const raw = new Uint8Array([0, 10, 20, 30]);
    const idat = new Uint8Array(deflateSync(raw));

    const png = new Uint8Array([
      ...Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ...chunk('IHDR', ihdr),
      ...chunk('IDAT', idat),
      ...chunk('IEND', new Uint8Array(0)),
    ]);

    const decoded = decodePng(png);
    expect(decoded.width).toBe(1);
    expect(decoded.height).toBe(1);
    expect(Array.from(decoded.pixels)).toEqual([10, 20, 30, 255]);
  });

  it('throws on a non-PNG payload', () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3, 4]))).toThrow(/not a PNG/i);
  });

  it('throws on unsupported color types instead of guessing', () => {
    // palette PNG (color type 3) header
    const bad = encodePng(new Uint8ClampedArray(16), 2, 2);
    bad[25] = 3; // IHDR color-type byte (offset 8 + 4 len + 4 type + 9)
    expect(() => decodePng(bad)).toThrow(/unsupported/i);
  });
});

// --- CRC32 helper for building the hand-made RGB PNG above ---

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(bytes: Uint8Array, table: Uint32Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
