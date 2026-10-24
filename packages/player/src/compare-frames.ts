/**
 * Pure pixel comparison between two RGBA frame buffers (BF-440).
 *
 * Compares `a` and `b` (4 bytes per pixel: R, G, B, A) and reports how many
 * pixels differ, the strongest/mean channel difference, and a bounding box of
 * the differing region. No DOM, no React — safe to run in Node or a worker.
 *
 * @param a First frame buffer (RGBA Uint8Array).
 * @param b Second frame buffer (RGBA Uint8Array), same length as `a`.
 * @param options.channel Which channels to compare: 'rgba' (all four),
 *   'rgb' (ignore alpha), or 'luma' (Rec. 601 luminance). Default 'rgba'.
 * @param options.threshold A channel diff must be *strictly greater* than this
 *   to count a pixel as differing. Default 0 (any difference counts).
 * @returns A `RenderFrameDiff` report. `bbox` is `null` when the frames are
 *   identical. Because the buffers carry no width/height, `bbox` x is the flat
 *   pixel index and y is always 0; callers knowing the width can remap
 *   `x % width` / `Math.floor(x / width)` into column/row.
 */
export interface CompareRenderFramesOptions {
  channel?: 'rgba' | 'rgb' | 'luma';
  threshold?: number;
}

export interface RenderFrameDiff {
  /** Pixels where any compared channel differs beyond `threshold`. */
  differingPixelCount: number;
  /** Total pixels compared (buffer length / 4). */
  totalPixels: number;
  /** Maximum absolute difference on any compared channel, across all pixels. */
  maxChannelDiff: number;
  /** Mean absolute difference across compared channels and all pixels. */
  meanChannelDiff: number;
  /**
   * Bounding box of differing pixels in flat pixel-index space
   * (`x` = pixel index, `y` = 0), or `null` when identical.
   */
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

// Rec. 601 luma coefficients for perceived luminance.
const LUMA_R = 0.299;
const LUMA_G = 0.587;
const LUMA_B = 0.114;

/**
 * Compare two RGBA frame buffers pixel by pixel.
 * @throws {RangeError} if lengths differ or a length is not divisible by 4.
 */
export function compareRenderFrames(
  a: Uint8Array,
  b: Uint8Array,
  options: CompareRenderFramesOptions = {},
): RenderFrameDiff {
  if (a.length !== b.length) {
    throw new RangeError(
      `compareRenderFrames: buffer lengths differ (${a.length} vs ${b.length})`,
    );
  }
  if (a.length % 4 !== 0) {
    throw new RangeError(
      `compareRenderFrames: buffer length ${a.length} is not divisible by 4 (expected RGBA)`,
    );
  }

  const { channel = 'rgba', threshold = 0 } = options;
  const compareAlpha = channel === 'rgba';
  const channelCount = compareAlpha ? 4 : 3;
  const pixelCount = a.length / 4;

  let differingPixelCount = 0;
  let maxChannelDiff = 0;
  let channelDiffSum = 0;
  let comparedChannelCount = 0;

  // Bounding box in flat pixel-index space; stays unset until a diff is found.
  let minX = -1;
  let maxX = -1;

  for (let p = 0; p < pixelCount; p++) {
    const o = p * 4;
    let pixelMaxDiff = 0;
    let pixelDiffSum = 0;

    if (channel === 'luma') {
      const lumaA =
        LUMA_R * a[o] + LUMA_G * a[o + 1] + LUMA_B * a[o + 2];
      const lumaB =
        LUMA_R * b[o] + LUMA_G * b[o + 1] + LUMA_B * b[o + 2];
      const diff = Math.abs(lumaA - lumaB);
      pixelMaxDiff = diff;
      pixelDiffSum = diff;
      comparedChannelCount += 1;
    } else {
      for (let c = 0; c < channelCount; c++) {
        const diff = Math.abs(a[o + c] - b[o + c]);
        if (diff > pixelMaxDiff) pixelMaxDiff = diff;
        pixelDiffSum += diff;
      }
      comparedChannelCount += channelCount;
    }

    channelDiffSum += pixelDiffSum;
    if (pixelMaxDiff > maxChannelDiff) maxChannelDiff = pixelMaxDiff;

    if (pixelMaxDiff > threshold) {
      if (minX === -1) minX = p;
      maxX = p;
      differingPixelCount += 1;
    }
  }

  const bbox =
    differingPixelCount === 0
      ? null
      : { minX, minY: 0, maxX, maxY: 0 };

  return {
    differingPixelCount,
    totalPixels: pixelCount,
    maxChannelDiff,
    meanChannelDiff: comparedChannelCount === 0 ? 0 : channelDiffSum / comparedChannelCount,
    bbox,
  };
}
