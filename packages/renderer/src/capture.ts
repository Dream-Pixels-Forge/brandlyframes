/**
 * Headless-Chromium frame capture + parallel-tab pool + frame-range
 * chunking [BF-020].
 *
 * `brandlyframes render` drives one headless Chrome per worker: a tab loads
 * the Studio preview URL, the virtual clock seeks frame N (via the
 * `?frame=` contract), and a PNG screenshot is pulled back. The launcher is
 * injectable ({@link LauncherFn}) so tests exercise arg construction,
 * chunking and error mapping without launching Chrome.
 *
 * Clean-room implementation.
 */
import { availableParallelism } from 'node:os';

/** Deterministic headless-Chrome flags shared by every worker tab. */
export const DEFAULT_CHROME_FLAGS: readonly string[] = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--mute-audio',
  '--force-color-profile=srgb',
];

/** A single open tab bound to a composition URL. */
export interface BrowserTabLike {
  /** The URL this tab was opened on. */
  readonly url: string;
  /** Seek the tab's virtual clock to a frame (throws on failure). */
  gotoFrame(frame: number): Promise<void>;
  /** Screenshot the current frame as PNG bytes. */
  screenshotPng(): Promise<Uint8Array>;
  /** Close the tab. Idempotent. */
  close(): Promise<void>;
}

/** A browser instance that can open tabs and be shut down. */
export interface BrowserLauncherLike {
  /** Open a tab on `url` with the given Chrome flags. */
  launchTab(url: string, flags: readonly string[]): Promise<BrowserTabLike>;
  /** Shut the browser down. Idempotent. */
  close(): Promise<void>;
}

/**
 * Factory producing a browser launcher. Real implementations shell out to
 * a Chrome binary (or CDP endpoint); tests inject fakes.
 */
export type LauncherFn = (flags?: readonly string[]) => Promise<BrowserLauncherLike>;

/** Half-open frame range `[start, end)`. */
export interface FrameRange {
  /** First frame (inclusive). */
  readonly start: number;
  /** One past the last frame (exclusive). */
  readonly end: number;
}

/** Options for a single-frame capture. */
export interface CaptureFrameOptions {
  /** Composition preview URL. */
  url: string;
  /** Zero-based frame to capture. */
  frame: number;
  /** Viewport width (default 1920). */
  width?: number;
  /** Viewport height (default 1080). */
  height?: number;
  /** Chrome flags (defaults to {@link DEFAULT_CHROME_FLAGS}). */
  flags?: readonly string[];
}

/** Options for a chunk capture (consecutive frames, one shared tab). */
export interface CaptureChunkOptions {
  /** Composition preview URL. */
  url: string;
  /** First frame (inclusive). */
  start: number;
  /** One past the last frame (exclusive). */
  end: number;
  /** Viewport width (default 1920). */
  width?: number;
  /** Viewport height (default 1080). */
  height?: number;
  /** Chrome flags (defaults to {@link DEFAULT_CHROME_FLAGS}). */
  flags?: readonly string[];
  /**
   * Streaming sink: each frame is handed to this callback as it is
   * captured and is NOT accumulated into the returned array, so the
   * result is always empty. Use this to stream frames straight to FFmpeg
   * instead of holding every frame in memory.
   */
  onFrame?: (frame: number, png: Uint8Array) => void;
  /**
   * Maximum frames held in memory without a streaming sink. Throws a
   * RangeError when more than `maxFramesInMemory` frames are accumulated
   * before the result is returned. Ignored when `onFrame` is provided,
   * since frames stream out instead of being buffered.
   */
  maxFramesInMemory?: number;
}

/**
 * Split `[start, end)` into chunks of at most `chunkSize` frames.
 *
 * @param start First frame (inclusive)
 * @param end One past the last frame (exclusive)
 * @param chunkSize Maximum frames per chunk
 * @returns Ordered chunk list covering the range exactly
 */
export function splitFrameRange(start: number, end: number, chunkSize: number): FrameRange[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError(`splitFrameRange: chunkSize must be >= 1, got ${chunkSize}`);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
    throw new RangeError(`splitFrameRange: empty or invalid range [${start}, ${end})`);
  }
  const ranges: FrameRange[] = [];
  for (let cursor = start; cursor < end; cursor += chunkSize) {
    ranges.push({ start: cursor, end: Math.min(cursor + chunkSize, end) });
  }
  return ranges;
}

/**
 * Capture a single frame as PNG bytes through one fresh tab.
 *
 * @param options URL + frame + viewport
 * @param launcherFactory Optional launcher factory; must be provided
 * (there is no real Chrome in this package — the CLI wires the CDP backend)
 */
export async function captureFrame(
  options: CaptureFrameOptions,
  launcherFactory: LauncherFn,
): Promise<Uint8Array> {
  if (!Number.isInteger(options.frame) || options.frame < 0) {
    throw new RangeError(`captureFrame: invalid frame index ${options.frame}`);
  }
  const flags = options.flags ?? DEFAULT_CHROME_FLAGS;
  const launcher = await launcherFactory(flags);
  const tab = await launcher.launchTab(options.url, flags);
  try {
    await tab.gotoFrame(options.frame);
    return await tab.screenshotPng();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`captureFrame: frame ${options.frame} failed: ${message}`, { cause: error });
  } finally {
    await tab.close();
    await launcher.close();
  }
}

/**
 * Capture frames `[start, end)` on an already-open tab (internal shared loop
 * behind {@link captureChunk} and {@link captureParallel}). Screenshot
 * failures propagate raw; seek failures are wrapped with the caller's label.
 */
interface CaptureFrameSink {
  /** Hand each captured frame to this callback instead of buffering it. */
  readonly onFrame?: (frame: number, png: Uint8Array) => void;
  /**
   * Max frames buffered without a sink; throws RangeError when exceeded.
   */
  readonly maxFramesInMemory?: number;
}

async function captureFramesOnTab(
  tab: BrowserTabLike,
  start: number,
  end: number,
  label: string,
  sink: CaptureFrameSink,
): Promise<Uint8Array[]> {
  const pngs: Uint8Array[] = [];
  for (let frame = start; frame < end; frame++) {
    try {
      await tab.gotoFrame(frame);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${label}: frame ${frame} failed: ${message}`, { cause: error });
    }
    const png = await tab.screenshotPng();
    if (sink.onFrame) {
      sink.onFrame(frame, png);
    } else {
      pngs.push(png);
      if (
        sink.maxFramesInMemory !== undefined &&
        pngs.length > sink.maxFramesInMemory
      ) {
        throw new RangeError(
          `${label}: memory budget exceeded — ${pngs.length} frames held in memory without a sink (max ${sink.maxFramesInMemory})`,
        );
      }
    }
  }
  return pngs;
}

/**
 * Capture every frame in `[start, end)` through one shared tab.
 *
 * @param options URL + half-open range + viewport
 * @param launcherFactory Launcher factory (injected; see {@link captureFrame})
 * @returns PNG bytes per frame, in frame order — an empty array when
 * `options.onFrame` is provided (streaming sink, nothing is buffered)
 */
export async function captureChunk(
  options: CaptureChunkOptions,
  launcherFactory: LauncherFn,
): Promise<Uint8Array[]> {
  const ranges = splitFrameRange(options.start, options.end, Number.MAX_SAFE_INTEGER);
  const range = ranges[0];
  if (range === undefined) throw new RangeError('captureChunk: empty range');
  const flags = options.flags ?? DEFAULT_CHROME_FLAGS;
  const launcher = await launcherFactory(flags);
  const tab = await launcher.launchTab(options.url, flags);
  try {
    return await captureFramesOnTab(tab, range.start, range.end, 'captureChunk', {
      onFrame: options.onFrame,
      maxFramesInMemory: options.maxFramesInMemory,
    });
  } finally {
    await tab.close();
    await launcher.close();
  }
}

/** Default worker-tab count: one tab per CPU, capped at 8. */
export const DEFAULT_CONCURRENCY: number = Math.min(availableParallelism(), 8);

/** Options for a parallel multi-tab capture over one composition URL. */
export interface CaptureParallelOptions {
  /** Composition preview URL (same for every tab). */
  url: string;
  /** First frame (inclusive). */
  start: number;
  /** One past the last frame (exclusive). */
  end: number;
  /**
   * Maximum worker tabs in the pool (default {@link DEFAULT_CONCURRENCY}).
   * At most `min(concurrency, chunkCount)` tabs are actually launched.
   */
  concurrency?: number;
  /**
   * Maximum frames per chunk (default: the range split evenly across the
   * concurrency, so each tab gets roughly one chunk).
   */
  chunkSize?: number;
  /** Viewport width (default 1920). */
  width?: number;
  /** Viewport height (default 1080). */
  height?: number;
  /** Chrome flags (defaults to {@link DEFAULT_CHROME_FLAGS}). */
  flags?: readonly string[];
  /**
   * Streaming sink: each frame is handed to this callback as it is
   * captured and is NOT accumulated into the returned array, so the
   * result is always empty. Use this to stream frames straight to FFmpeg
   * instead of holding every frame in memory.
   */
  onFrame?: (frame: number, png: Uint8Array) => void;
  /**
   * Maximum frames held in memory without a streaming sink. Throws a
   * RangeError when more than `maxFramesInMemory` frames are accumulated
   * before the result is returned. Ignored when `onFrame` is provided,
   * since frames stream out instead of being buffered.
   */
  maxFramesInMemory?: number;
}

/**
 * Capture every frame in `[start, end)` across a bounded pool of parallel
 * tabs [BF-020].
 *
 * The range is split into chunks (see {@link splitFrameRange}) and dispatched
 * across at most `min(concurrency, chunkCount)` tabs opened on one launcher
 * (one browser): each tab pulls the next unclaimed chunk until the queue is
 * empty. All workers run concurrently and are joined with
 * `Promise.allSettled`, so one tab's failure never blocks the others.
 *
 * When a chunk capture fails, the tab is recycled — closed, replaced with a
 * fresh tab, and the same chunk is retried once. A second failure ends that
 * worker; after the pool drains, all failures are surfaced as one error whose
 * `cause` chains the first underlying failure.
 *
 * @param options URL + half-open range + concurrency + viewport
 * @param launcherFactory Launcher factory (injected; see {@link captureFrame})
 * @returns PNG bytes per frame, in frame order (chunk boundaries are not
 * observable in the result) — an empty array when `options.onFrame` is
 * provided (streaming sink, nothing is buffered)
 * @throws RangeError for an invalid range, concurrency, or chunk size
 * @throws Error aggregating every failed chunk (with `cause`) if any chunk
 * could not be captured after its one retry
 */
export async function captureParallel(
  options: CaptureParallelOptions,
  launcherFactory: LauncherFn,
): Promise<Uint8Array[]> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(
      `captureParallel: concurrency must be an integer >= 1, got ${concurrency}`,
    );
  }
  const total = options.end - options.start;
  const chunkSize = options.chunkSize ?? Math.max(1, Math.ceil(total / concurrency));
  const chunks = splitFrameRange(options.start, options.end, chunkSize);
  const flags = options.flags ?? DEFAULT_CHROME_FLAGS;

  const launcher = await launcherFactory(flags);
  const pngs: Uint8Array[][] = new Array<Uint8Array[]>(chunks.length);
  const failures: unknown[] = [];
  /** Chunk indices that still failed after the primary pool's per-chunk recycle. */
  const failedIndices = new Set<number>();
  let cursor = 0;

  const runWorker = async (): Promise<void> => {
    let tab: BrowserTabLike | undefined;
    try {
      tab = await launcher.launchTab(options.url, flags);
      while (cursor < chunks.length) {
        const index = cursor++;
        const chunk = chunks[index] as FrameRange;
        try {
          pngs[index] = await captureFramesOnTab(tab, chunk.start, chunk.end, 'captureParallel', {
            onFrame: options.onFrame,
            maxFramesInMemory: options.maxFramesInMemory,
          });
          failedIndices.delete(index);
        } catch {
          // Recycle once: fresh tab, retry this chunk; a second failure is final.
          await tab.close();
          tab = await launcher.launchTab(options.url, flags);
          try {
            pngs[index] = await captureFramesOnTab(tab, chunk.start, chunk.end, 'captureParallel', {
              onFrame: options.onFrame,
              maxFramesInMemory: options.maxFramesInMemory,
            });
            failedIndices.delete(index);
          } catch (error) {
            failedIndices.add(index);
            failures.push(error);
          }
        }
      }
    } catch (error) {
      failures.push(error);
    } finally {
      await tab?.close();
    }
  };

  await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, chunks.length) }, () => runWorker()),
  );

  // Pool-level OOM recovery: retry failed chunks once at lower concurrency.
  if (failedIndices.size > 0) {
    const retryConcurrency = Math.max(1, Math.floor(concurrency / 2));
    const retryList = [...failedIndices];
    const retryLauncher = await launcherFactory(flags);
    const retryFailures: unknown[] = [];
    let retryCursor = 0;

    await Promise.allSettled(
      Array.from(
        { length: Math.min(retryConcurrency, retryList.length) },
        async () => {
          let tab: BrowserTabLike | undefined;
          try {
            while (retryCursor < retryList.length) {
              const index = retryList[retryCursor++];
              const chunk = chunks[index] as FrameRange;
              tab = await retryLauncher.launchTab(options.url, flags);
              try {
                pngs[index] = await captureFramesOnTab(
                  tab,
                  chunk.start,
                  chunk.end,
                  'captureParallel-retry',
                  {
                    onFrame: options.onFrame,
                    maxFramesInMemory: options.maxFramesInMemory,
                  },
                );
              } catch (error) {
                retryFailures.push(error);
              } finally {
                await tab?.close();
                tab = undefined;
              }
            }
          } catch (error) {
            retryFailures.push(error);
          } finally {
            await tab?.close();
          }
        },
      ),
    );
    await retryLauncher.close();

    if (retryFailures.length > 0) {
      // Retry also failed: surface the original aggregated error (cause chains
      // the first failure, not a retry failure).
      const detail = failures
        .map((error) => (error instanceof Error ? error.message : String(error)))
        .join('; ');
      throw new Error(
        `captureParallel: ${failures.length} of ${chunks.length} chunk(s) failed: ${detail}`,
        { cause: failures[0] },
      );
    }
    // Retry recovered every failed chunk — clear the stale primary failures.
    failures.length = 0;
    failedIndices.clear();
  }

  if (failures.length > 0) {
    const detail = failures
      .map((error) => (error instanceof Error ? error.message : String(error)))
      .join('; ');
    throw new Error(
      `captureParallel: ${failures.length} of ${chunks.length} chunk(s) failed: ${detail}`,
      { cause: failures[0] },
    );
  }
  return pngs.flat();
}
