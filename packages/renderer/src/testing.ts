/**
 * Golden-frame + determinism test harness for the render path [BF-026].
 *
 * Provides `frameHash` (pure digest of PNG bytes), `compareGoldenFrames`
 * (compares captured frames against golden references with a configurable
 * tolerance), `assertGoldenFrame` (single-frame golden assertion) and
 * `assertDeterministic` (captures the same range twice and asserts
 * byte-for-byte equality).
 *
 * The pure layer ({@link frameHash}, {@link compareGoldenFrames}) is
 * separated from the capture-wrapping helpers so tests can exercise
 * comparison logic without launching Chrome.
 */

import { createHash } from 'node:crypto';

import { captureFrame, type CaptureFrameOptions, type LauncherFn } from './capture.js';

/** SHA-256 hex digest of PNG bytes. Always lowercase. */
export const frameHash = (png: Uint8Array): string => {
  // SHA-256 over the raw PNG bytes; hex string, lowercase.
  return createHash('sha256').update(Buffer.from(png)).digest('hex');
};

/**
 * Converts a tolerance fraction [0,1] into an absolute BigInt hash-diff
 * threshold over the full 256-bit space. Returns 0 for tolerance 0.
 */
const toleranceThreshold = (maxHash: bigint, tolerance: number): bigint => {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1) {
    throw new RangeError(`tolerance must be a number between 0 and 1, got ${tolerance}`);
  }
  // Pure integer arithmetic: scale tolerance by 1e15 (within safe integer
  // range), then scale maxHash and divide back. Number(2n**256n) is Infinity,
  // so BigInt(Number(maxHash) * tolerance) would throw — avoided here.
  const scale = 1_000_000_000_000_000n; // 1e15
  const scaledTolerance = BigInt(Math.floor(tolerance * Number(scale)));
  return (maxHash * scaledTolerance) / scale;
};

/** Result of comparing one frame against its golden reference. */
export interface GoldenFrameResult {
  /** Frame index. */
  readonly frame: number;
  /** Whether the captured hash matches the golden hash within tolerance. */
  readonly pass: boolean;
  /** Captured frame hash (hex). */
  readonly capturedHash: string;
  /** Golden frame hash (hex). */
  readonly goldenHash: string;
  /** Absolute difference between captured and golden hash integers. */
  readonly diff: bigint;
}

/** Options for {@link compareGoldenFrames}. */
export interface CompareGoldenFramesOptions {
  /** Golden hashes keyed by frame index. */
  readonly golden: ReadonlyMap<number, string>;
  /** Frames to compare (defaults to all keys in `golden`). */
  readonly frames?: readonly number[];
  /**
   * Maximum allowed hash difference, as a fraction of the full 256-bit space
   * (0 = exact match, 1 = anything passes). Default 0.
   */
  readonly tolerance?: number;
}

/**
 * Compares captured frames against golden references.
 *
 * Captures each frame via {@link captureFrame} using `launcherFactory`,
 * hashes the PNG, and compares against the golden hash. When `tolerance` is
 * 0 (default) an exact hash match is required.
 *
 * @param url Composition preview URL
 * @param launcherFactory Injectible launcher (no real Chrome in this package)
 * @param options Golden map + frames + tolerance
 * @returns One result per frame
 */
export async function compareGoldenFrames(
  url: string,
  launcherFactory: LauncherFn,
  options: CompareGoldenFramesOptions,
): Promise<GoldenFrameResult[]> {
  const { golden, frames = [...golden.keys()], tolerance = 0 } = options;
  const results: GoldenFrameResult[] = [];
  const maxHash = 2n ** 256n;
  const threshold = toleranceThreshold(maxHash, tolerance);
  for (const frame of frames) {
    const options: CaptureFrameOptions = { url, frame };
    const png = await captureFrame(options, launcherFactory);
    const capturedHash = frameHash(png);
    const goldenHash = golden.get(frame);
    let pass = false;
    let diff = 0n;
    if (goldenHash !== undefined) {
      const captured = BigInt('0x' + capturedHash);
      const goldenInt = BigInt('0x' + goldenHash);
      diff = captured > goldenInt ? captured - goldenInt : goldenInt - captured;
      pass = diff <= threshold;
    }
    results.push({ frame, pass, capturedHash, goldenHash: goldenHash ?? '', diff });
  }
  return results;
}

/** Options for {@link assertGoldenFrame}. */
export interface AssertGoldenFrameOptions {
  /** Golden hash (hex) for this frame. */
  readonly goldenHash: string;
  /**
   * Maximum allowed hash difference, as a fraction of the full 256-bit space
   * (0 = exact match, 1 = anything passes). Default 0.
   */
  readonly tolerance?: number;
}

/**
 * Captures a single frame and throws if its hash does not match `options`.
 * Use inside a test to assert a frame matches its golden reference.
 *
 * @throws {Error} with the diff when the comparison fails
 */
export const assertGoldenFrame = async (
  url: string,
  launcherFactory: LauncherFn,
  frame: number,
  options: AssertGoldenFrameOptions,
): Promise<void> => {
  const { goldenHash, tolerance = 0 } = options;
  const png = await captureFrame({ url, frame }, launcherFactory);
  const capturedHash = frameHash(png);
  const maxHash = 2n ** 256n;
  const threshold = toleranceThreshold(maxHash, tolerance);
  const captured = BigInt('0x' + capturedHash);
  const goldenInt = BigInt('0x' + goldenHash);
  const diff = captured > goldenInt ? captured - goldenInt : goldenInt - captured;
  if (diff > threshold) {
    throw new Error(
      `assertGoldenFrame: frame ${frame} hash mismatch: ` +
        `captured ${capturedHash}, golden ${goldenHash}, diff ${diff}`,
    );
  }
};

/** Options for {@link assertDeterministic}. */
export interface AssertDeterministicOptions {
  /** Range of frames to capture twice and compare. */
  readonly range: { start: number; end: number };
  /** Viewport width (default 1920). */
  readonly width?: number;
  /** Viewport height (default 1080). */
  readonly height?: number;
}

/**
 * Captures the same frame range twice (fresh tabs each time) and asserts
 * byte-for-byte equality across every frame, proving headless capture is
 * deterministic [BF-026].
 *
 * @throws {Error} listing mismatched frames if any differ
 */
export const assertDeterministic = async (
  url: string,
  launcherFactory: LauncherFn,
  options: AssertDeterministicOptions,
): Promise<void> => {
  const { range, width = 1920, height = 1080 } = options;
  const captureRange = async (start: number, end: number): Promise<Uint8Array[]> => {
    const pngs: Uint8Array[] = [];
    for (let frame = start; frame < end; frame++) {
      pngs.push(await captureFrame({ url, frame, width, height }, launcherFactory));
    }
    return pngs;
  };
  const first = await captureRange(range.start, range.end);
  const second = await captureRange(range.start, range.end);
  const mismatches: number[] = [];
  for (let i = 0; i < first.length; i++) {
    const f = first[i];
    const s = second[i];
    if (f.length !== s.length) {
      mismatches.push(range.start + i);
      continue;
    }
    for (let j = 0; j < f.length; j++) {
      if (f[j] !== s[j]) {
        mismatches.push(range.start + i);
        break;
      }
    }
  }
  if (mismatches.length > 0) {
    throw new Error(
      `assertDeterministic: ${mismatches.length} frame(s) not byte-identical ` +
        `across two captures: [${mismatches.join(', ')}]`,
    );
  }
};
