/**
 * GIF palette construction and quantization [BF-071]
 *
 * Exact color collection with median-cut reduction to the 256-entry limit,
 * then nearest-color mapping with an exact-match fast path.
 */

/** Pack an RGB triplet into a map key. */
export const rgbKey = (r: number, g: number, b: number): number => (r << 16) | (g << 8) | b;

type Rgb = [number, number, number];

/**
 * Build a global palette for a frame-set: exact collection, then median-cut
 * reduction when more than 256 distinct colors appear.
 *
 * @param frames RGBA frames of identical dimensions
 * @returns Flat RGB palette (multiple of 3, at most 768 entries)
 */
export function buildPalette(frames: Uint8ClampedArray[]): Uint8Array {
  const seen = new Map<number, Rgb>();
  for (const rgba of frames) {
    for (let i = 0; i < rgba.length; i += 4) {
      const r = rgba[i] ?? 0;
      const g = rgba[i + 1] ?? 0;
      const b = rgba[i + 2] ?? 0;
      const key = rgbKey(r, g, b);
      if (!seen.has(key)) seen.set(key, [r, g, b]);
    }
  }
  const colors = [...seen.values()];
  // Few colors: keep every color exactly — no averaging.
  if (colors.length <= 256) {
    const flat = new Uint8Array(colors.length * 3);
    colors.forEach(([r, g, b], i) => {
      flat[i * 3] = r;
      flat[i * 3 + 1] = g;
      flat[i * 3 + 2] = b;
    });
    return flat;
  }
  // Many colors: median-cut down to 256 boxes, then average each box.
  const boxes: Rgb[][] = [colors];
  while (boxes.some((box) => box.length > 1) && boxes.reduce((n, box) => n + box.length, 0) > 256) {
    boxes.sort((a, b) => b.length - a.length);
    const box = boxes.shift();
    if (box === undefined || box.length < 2) break;
    let rMin = 255;
    let rMax = 0;
    let gMin = 255;
    let gMax = 0;
    let bMin = 255;
    let bMax = 0;
    for (const [r, g, b] of box) {
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
    }
    const channel: 0 | 1 | 2 =
      rMax - rMin >= gMax - gMin && rMax - rMin >= bMax - bMin
        ? 0
        : gMax - gMin >= bMax - bMin
          ? 1
          : 2;
    box.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.length / 2);
    const splitA = box.slice(0, mid);
    const splitB = box.slice(mid);
    if (splitA.length === 0 || splitB.length === 0) break;
    boxes.push(splitA, splitB);
  }
  const means = boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const c of box) {
      r += c[0];
      g += c[1];
      b += c[2];
    }
    const n = Math.max(1, box.length);
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)] as Rgb;
  });
  const flat = new Uint8Array(means.length * 3);
  means.forEach(([r, g, b], i) => {
    flat[i * 3] = r;
    flat[i * 3 + 1] = g;
    flat[i * 3 + 2] = b;
  });
  return flat;
}

/** Pad a flat RGB palette to the next power-of-two entry count (min 2). */
export function paddedPalette(palette: Uint8Array): { entries: number; bytes: Uint8Array } {
  let entries = 2;
  while (entries * 3 < palette.length && entries < 256) entries *= 2;
  const bytes = new Uint8Array(entries * 3);
  bytes.set(palette.subarray(0, entries * 3));
  return { entries, bytes };
}

/** Map RGBA pixels to the nearest palette entry (exact match fast path). */
export function quantizeToPalette(rgba: Uint8ClampedArray, palette: Uint8Array): Uint8Array {
  const exact = new Map<number, number>();
  for (let i = 0; i < palette.length; i += 3) {
    const key = rgbKey(palette[i] ?? 0, palette[i + 1] ?? 0, palette[i + 2] ?? 0);
    if (!exact.has(key)) exact.set(key, i / 3);
  }
  const indices = new Uint8Array(rgba.length / 4);
  for (let p = 0; p < indices.length; p++) {
    const r = rgba[p * 4] ?? 0;
    const g = rgba[p * 4 + 1] ?? 0;
    const b = rgba[p * 4 + 2] ?? 0;
    const direct = exact.get(rgbKey(r, g, b));
    if (direct !== undefined) {
      indices[p] = direct;
      continue;
    }
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < palette.length; i += 3) {
      const dr = r - (palette[i] ?? 0);
      const dg = g - (palette[i + 1] ?? 0);
      const db = b - (palette[i + 2] ?? 0);
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = i / 3;
      }
    }
    indices[p] = best;
  }
  return indices;
}
