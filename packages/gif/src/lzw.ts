/**
 * GIF LZW compression/decompression [BF-071]
 *
 * Early-change discipline shared by the encoder and decoder in this package.
 */

/** Maximum LZW code size in bits (GIF spec). */
const LZW_MAX_BITS = 12;

/**
 * Decode GIF LZW image data.
 *
 * @param minCodeSize Minimum code size from the image descriptor
 * @param data Concatenated LZW sub-block payload bytes
 * @param expectedCount Expected number of output indices
 * @returns Palette indices in row-major order
 */
export function lzwDecode(minCodeSize: number, data: Uint8Array, expectedCount: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let codeMask = (1 << codeSize) - 1;
  const prefix: number[] = new Array(1 << LZW_MAX_BITS).fill(-1);
  const suffix: number[] = new Array(1 << LZW_MAX_BITS).fill(0);
  const pixelStack: number[] = new Array(1 << LZW_MAX_BITS);
  const out = new Uint8Array(expectedCount);
  let outPos = 0;
  let dataPos = 0;
  let datum = 0;
  let bits = 0;
  let nextCode = eoiCode + 1;
  let oldCode = -1;
  let firstChar = 0;

  const resetTable = (): void => {
    codeSize = minCodeSize + 1;
    codeMask = (1 << codeSize) - 1;
    nextCode = eoiCode + 1;
    for (let i = 0; i < clearCode; i++) {
      prefix[i] = -1;
      suffix[i] = i;
    }
  };
  resetTable();

  const readCode = (): number | null => {
    while (bits < codeSize) {
      if (dataPos >= data.length) return null;
      datum |= (data[dataPos] ?? 0) << bits;
      dataPos += 1;
      bits += 8;
    }
    const code = datum & codeMask;
    datum >>= codeSize;
    bits -= codeSize;
    return code;
  };

  while (outPos < expectedCount) {
    const code = readCode();
    if (code === null) break;
    if (code === clearCode) {
      resetTable();
      oldCode = -1;
      continue;
    }
    if (code === eoiCode) break;
    let stackPos = 0;
    let current = code;
    if (oldCode === -1) {
      firstChar = suffix[code] ?? 0;
      out[outPos++] = firstChar;
      oldCode = code;
      continue;
    }
    if (code >= nextCode) {
      // KwKwK case: code not yet in table — start from the previous string
      pixelStack[stackPos++] = firstChar;
      current = oldCode;
    }
    while (current >= clearCode) {
      pixelStack[stackPos++] = suffix[current] ?? 0;
      current = prefix[current] ?? -1;
    }
    firstChar = suffix[current] ?? 0;
    pixelStack[stackPos++] = firstChar;
    while (stackPos > 0 && outPos < expectedCount) {
      stackPos -= 1;
      out[outPos++] = pixelStack[stackPos] ?? 0;
    }
    if (nextCode < 1 << LZW_MAX_BITS) {
      prefix[nextCode] = oldCode;
      suffix[nextCode] = firstChar;
      nextCode += 1;
      if (nextCode > codeMask && codeSize < LZW_MAX_BITS) {
        codeSize += 1;
        codeMask = (1 << codeSize) - 1;
      }
    }
    oldCode = code;
  }
  return out;
}

/**
 * Encode palette indices with GIF LZW.
 *
 * @param indices Palette indices to compress
 * @param minCodeSize Minimum code size (derived from palette size)
 * @returns Compressed payload bytes (without sub-block framing)
 */
export function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const dict = new Map<string, number>();
  for (let i = 0; i < clearCode; i++) dict.set(String.fromCharCode(i), i);
  let codeSize = minCodeSize + 1;
  const out: number[] = [];
  let datum = 0;
  let bits = 0;

  const emit = (code: number): void => {
    datum |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      out.push(datum & 0xff);
      datum >>= 8;
      bits -= 8;
    }
  };

  emit(clearCode);
  let nextCode = eoiCode + 1;
  let pending = indices.length > 0 ? String.fromCharCode(indices[0] ?? 0) : '';
  for (let i = 1; i < indices.length; i++) {
    const c = String.fromCharCode(indices[i] ?? 0);
    const combined = pending + c;
    if (dict.has(combined)) {
      pending = combined;
    } else {
      emit(dict.get(pending) ?? 0);
      if (nextCode < 1 << LZW_MAX_BITS) {
        dict.set(combined, nextCode);
        nextCode += 1;
        if (nextCode > 1 << codeSize && codeSize < LZW_MAX_BITS) {
          codeSize += 1;
        }
      }
      pending = c;
    }
  }
  if (indices.length > 0) emit(dict.get(pending) ?? 0);
  if (nextCode > 1 << codeSize && codeSize < LZW_MAX_BITS) codeSize += 1;
  emit(eoiCode);
  if (bits > 0) out.push(datum & 0xff);
  return new Uint8Array(out);
}
