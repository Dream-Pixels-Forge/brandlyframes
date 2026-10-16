/**
 * GIF89a decoder [BF-071]
 *
 * Parses header, global/local palettes, graphic control extensions,
 * NETSCAPE loop counts and LZW image blocks into `DecodedGif`.
 */

import { lzwDecode } from './lzw';
import type { DecodedGif, GifFrame } from './types';

/** Read a little-endian u16 at `pos`. */
function readU16(data: Uint8Array, pos: number): number {
  return ((data[pos] ?? 0) | ((data[pos + 1] ?? 0) << 8)) >>> 0;
}

/** Collect sub-block payload bytes starting at `pos`; returns bytes + next position. */
function readSubBlocks(data: Uint8Array, pos: number): { bytes: Uint8Array; next: number } {
  const chunks: number[] = [];
  while (pos < data.length) {
    const size = data[pos] ?? 0;
    pos += 1;
    if (size === 0) break;
    for (let i = 0; i < size && pos < data.length; i++, pos++) {
      chunks.push(data[pos] ?? 0);
    }
  }
  return { bytes: new Uint8Array(chunks), next: pos };
}

/**
 * Parse GIF bytes into a decoded structure.
 *
 * @param data Complete GIF file bytes
 * @returns Width, height, global palette, frames and loop count
 */
export function parseGif(data: Uint8Array): DecodedGif {
  if (
    data.length < 6 ||
    data[0] !== 0x47 ||
    data[1] !== 0x49 ||
    data[2] !== 0x46 ||
    data[3] !== 0x38 ||
    (data[4] !== 0x37 && data[4] !== 0x39) ||
    data[5] !== 0x61
  ) {
    throw new Error('parseGif: input is not a GIF89a/GIF87a stream');
  }
  if (data.length < 13) throw new Error('parseGif: truncated logical screen descriptor');
  const width = readU16(data, 6);
  const height = readU16(data, 8);
  const packed = data[10] ?? 0;
  let pos = 13;
  let globalPalette = new Uint8Array(0);
  if ((packed & 0x80) !== 0) {
    const entries = 1 << ((packed & 0x07) + 1);
    globalPalette = data.slice(pos, pos + entries * 3);
    if (globalPalette.length !== entries * 3) throw new Error('parseGif: truncated global palette');
    pos += entries * 3;
  }

  const frames: GifFrame[] = [];
  let loopCount = 0;
  let pendingDelay = 0;
  let pendingDisposal = 0;
  let pendingTransparent: number | null = null;

  while (pos < data.length) {
    const sep = data[pos] ?? 0;
    pos += 1;
    if (sep === 0x3b) break;
    if (sep === 0x21) {
      const label = data[pos] ?? 0;
      pos += 1;
      if (label === 0xf9) {
        const size = data[pos] ?? 0;
        if (size < 4 || pos + 1 + size > data.length) throw new Error('parseGif: truncated GCE');
        const flags = data[pos + 1] ?? 0;
        pendingDisposal = (flags >> 2) & 0x07;
        pendingDelay = readU16(data, pos + 2);
        pendingTransparent = (flags & 0x01) !== 0 ? (data[pos + 4] ?? 0) : null;
        pos += 1 + size;
        const term = data[pos] ?? 1;
        pos += 1;
        if (term !== 0) throw new Error('parseGif: GCE missing terminator');
      } else if (label === 0xff) {
        const size = data[pos] ?? 0;
        pos += 1;
        const ident = data.slice(pos, pos + size);
        pos += size;
        const { bytes, next } = readSubBlocks(data, pos);
        pos = next;
        const tag = String.fromCharCode(...ident.subarray(0, 11));
        if (tag === 'NETSCAPE2.0' && bytes.length >= 3 && bytes[0] === 1) {
          loopCount = ((bytes[1] ?? 0) | ((bytes[2] ?? 0) << 8)) >>> 0;
        }
      } else {
        const { next } = readSubBlocks(data, pos + 1);
        pos = next;
      }
      continue;
    }
    if (sep !== 0x2c) throw new Error(`parseGif: unexpected block separator 0x${sep.toString(16)}`);
    if (pos + 9 > data.length) throw new Error('parseGif: truncated image descriptor');
    const descWidth = readU16(data, pos + 4);
    const descHeight = readU16(data, pos + 6);
    const descPacked = data[pos + 8] ?? 0;
    pos += 9;
    let localPalette: Uint8Array | null = null;
    if ((descPacked & 0x80) !== 0) {
      const entries = 1 << ((descPacked & 0x07) + 1);
      localPalette = data.slice(pos, pos + entries * 3);
      if (localPalette.length !== entries * 3) throw new Error('parseGif: truncated local palette');
      pos += entries * 3;
    }
    if (descWidth !== width || descHeight !== height) {
      throw new Error(`parseGif: sub-image ${descWidth}x${descHeight} != canvas ${width}x${height}`);
    }
    const minCodeSize = data[pos] ?? 0;
    pos += 1;
    const { bytes, next } = readSubBlocks(data, pos);
    pos = next;
    const indices = lzwDecode(minCodeSize, bytes, width * height);
    frames.push({
      indices,
      delayCentiseconds: pendingDelay,
      transparentIndex: pendingTransparent,
      localPalette,
      disposal: pendingDisposal,
    });
    pendingDelay = 0;
    pendingDisposal = 0;
    pendingTransparent = null;
  }
  if (frames.length === 0) throw new Error('parseGif: no image frames found');
  return { width, height, globalPalette, frames, loopCount };
}

/**
 * Rasterize a decoded frame to RGBA using its local palette when present,
 * else the global palette. Transparent indices emit alpha 0.
 *
 * @param gif Decoded GIF from `parseGif`
 * @param frameIndex Frame to rasterize
 * @returns Row-major RGBA pixels
 */
export function gifFrameToRgba(gif: DecodedGif, frameIndex: number): Uint8ClampedArray {
  const frame = gif.frames[frameIndex];
  if (frame === undefined) throw new RangeError(`gifFrameToRgba: frame ${frameIndex} out of range`);
  const palette = frame.localPalette ?? gif.globalPalette;
  const rgba = new Uint8ClampedArray(gif.width * gif.height * 4);
  for (let p = 0; p < frame.indices.length; p++) {
    const index = frame.indices[p] ?? 0;
    if (index === frame.transparentIndex) {
      rgba[p * 4 + 3] = 0;
      continue;
    }
    rgba[p * 4] = palette[index * 3] ?? 0;
    rgba[p * 4 + 1] = palette[index * 3 + 1] ?? 0;
    rgba[p * 4 + 2] = palette[index * 3 + 2] ?? 0;
    rgba[p * 4 + 3] = 255;
  }
  return rgba;
}
