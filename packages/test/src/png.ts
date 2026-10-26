/**
 * BF-240: minimal clean-room PNG codec (8-bit, non-interlaced).
 *
 * Decode supports color types 0 (grayscale), 2 (RGB) and 6 (RGBA) — the
 * formats headless-Chromium screenshots and this encoder produce. Encode
 * always emits RGBA with filter 0. Implemented on top of node:zlib; no
 * external dependencies.
 */

import { inflateSync, deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

export interface DecodedPng {
  readonly width: number;
  readonly height: number;
  /** RGBA, width * height * 4. */
  readonly pixels: Uint8ClampedArray;
}

// --- CRC32 (PNG chunk checksum) ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(Buffer.from(type, 'ascii'), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encode RGBA pixels (width * height * 4) as an 8-bit RGBA PNG. */
export function encodePng(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError(`encodePng: invalid dimensions ${width}x${height}`);
  }
  if (pixels.length !== width * height * 4) {
    throw new RangeError(
      `encodePng: expected ${width * height * 4} RGBA bytes, got ${pixels.length}`,
    );
  }
  // Filter 0 on every scanline (None) — sufficient for golden storage.
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), rowStart + 1);
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter: adaptive (we emit 0)
  ihdr[12] = 0; // no interlace

  const parts = [
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(raw))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

// --- Decode ---

const CHANNELS_BY_COLOR_TYPE: Record<number, number> = { 0: 1, 2: 3, 6: 4 };

/** Decode an 8-bit, non-interlaced PNG (color types 0/2/6) into RGBA pixels. */
export function decodePng(bytes: Uint8Array): DecodedPng {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error('decodePng: input is not a PNG (bad signature)');
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  let colorType = -1;
  const idatParts: Uint8Array[] = [];
  let idatLength = 0;

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = Buffer.from(bytes.subarray(offset + 4, offset + 8)).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      const ihdr = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = ihdr.getUint32(0);
      height = ihdr.getUint32(4);
      const bitDepth = data[8]!;
      colorType = data[9]!;
      const interlace = data[12]!;
      if (bitDepth !== 8) {
        throw new Error(`decodePng: unsupported bit depth ${bitDepth} (only 8)`);
      }
      if (interlace !== 0) {
        throw new Error('decodePng: unsupported interlaced PNG');
      }
      if (!(colorType in CHANNELS_BY_COLOR_TYPE)) {
        throw new Error(
          `decodePng: unsupported color type ${colorType} (only 0 grayscale, 2 RGB, 6 RGBA)`,
        );
      }
    } else if (type === 'IDAT') {
      idatParts.push(data);
      idatLength += length;
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (width < 1 || height < 1) {
    throw new Error('decodePng: missing or invalid IHDR chunk');
  }
  if (idatParts.length === 0) {
    throw new Error('decodePng: missing IDAT chunk');
  }

  const compressed = new Uint8Array(idatLength);
  let writeOffset = 0;
  for (const part of idatParts) {
    compressed.set(part, writeOffset);
    writeOffset += part.length;
  }
  const raw = new Uint8Array(inflateSync(compressed));

  const channels = CHANNELS_BY_COLOR_TYPE[colorType]!;
  const stride = width * channels;
  if (raw.length < height * (1 + stride)) {
    throw new Error(
      `decodePng: truncated pixel data (expected ${height * (1 + stride)} bytes, got ${raw.length})`,
    );
  }

  // Un-filter (per PNG spec: None/Sub/Up/Average/Paeth).
  const unfiltered = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (1 + stride)]!;
    const rowIn = y * (1 + stride) + 1;
    const rowOut = y * stride;
    const row = raw.subarray(rowIn, rowIn + stride);
    const prev = y > 0 ? unfiltered.subarray((y - 1) * stride, y * stride) : null;
    const current = unfiltered.subarray(rowOut, rowOut + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? current[x - channels]! : 0;
      const b = prev ? prev[x]! : 0;
      const c = x >= channels && prev ? prev[x - channels]! : 0;
      let value = row[x]!;
      switch (filter) {
        case 0:
          break;
        case 1:
          value = (value + a) & 0xff;
          break;
        case 2:
          value = (value + b) & 0xff;
          break;
        case 3:
          value = (value + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          value = (value + predictor) & 0xff;
          break;
        }
        default:
          throw new Error(`decodePng: unsupported scanline filter ${filter}`);
      }
      current[x] = value;
    }
  }

  // Expand to RGBA.
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const src = i * channels;
    const dst = i * 4;
    if (colorType === 0) {
      pixels[dst] = unfiltered[src]!;
      pixels[dst + 1] = unfiltered[src]!;
      pixels[dst + 2] = unfiltered[src]!;
      pixels[dst + 3] = 255;
    } else {
      pixels[dst] = unfiltered[src]!;
      pixels[dst + 1] = unfiltered[src + 1]!;
      pixels[dst + 2] = unfiltered[src + 2]!;
      pixels[dst + 3] = colorType === 6 ? (unfiltered[src + 3] ?? 255) : 255;
    }
  }

  return { width, height, pixels };
}
