/**
 * RenderJob orchestration — progress, cancellation and resumable renders
 * [BF-024].
 *
 * A render job splits the frame range into chunks (see `capture.ts`), opens a
 * bounded pool of tabs on one browser and captures every frame to
 * `<outDir>/frame-%06d.png` (the naming {@link frameFileName} / the stitcher
 * consume directly). Three orchestration features sit on top of the plain
 * capture:
 *
 * - **Progress**: {@link RenderJobOptions.onProgress} receives `chunk-start`,
 *   `frame` and `chunk-done` events with cumulative `framesDone` / `framesTotal`
 *   counters (resumed frames included).
 * - **Cancellation**: an `AbortSignal` stops scheduling, closes in-flight tabs
 *   (killing the pending `gotoFrame`/screenshot) and awaits the pool; the job
 *   rejects with {@link RenderJobAbortedError} while keeping completed work
 *   recorded in the manifest.
 * - **Resume**: a JSON manifest in `outDir` ({@link DEFAULT_MANIFEST_FILENAME})
 *   records completed ranges — including partial chunks, updated after every
 *   frame. A rerun with the same URL + range skips completed frames; only the
 *   missing tail of an interrupted chunk is re-captured.
 *
 * The browser is fully injected ({@link LauncherFn}) so tests exercise the
 * orchestration with fakes — no Chrome.
 *
 * Clean-room implementation.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_CHROME_FLAGS,
  DEFAULT_CONCURRENCY,
  splitFrameRange,
  type BrowserTabLike,
  type FrameRange,
  type LauncherFn,
} from './capture.js';
import { frameFileName } from './stitch.js';

/** Manifest file name created inside `outDir` unless overridden. */
export const DEFAULT_MANIFEST_FILENAME = 'render-manifest.json';

/** Current manifest schema version; manifests with other versions are ignored. */
export const MANIFEST_VERSION = 1;

/** Persisted record of a render's completed frame ranges [BF-024]. */
export interface RenderManifest {
  /** Manifest schema version ({@link MANIFEST_VERSION}). */
  readonly version: number;
  /** Composition URL the render captured — resumes only match identical URLs. */
  readonly url: string;
  /** First frame of the rendered range (inclusive). */
  readonly start: number;
  /** One past the last frame of the rendered range (exclusive). */
  readonly end: number;
  /** Completed frame ranges, sorted and merged (adjacent ranges joined). */
  readonly completed: readonly FrameRange[];
}

/** Progress event emitted by a render job [BF-024]. */
export type RenderProgress =
  | {
      /** A worker began capturing a chunk (once per attempt; retries re-emit). */
      readonly type: 'chunk-start';
      /** The chunk being captured. */
      readonly chunk: FrameRange;
      /** Completed frames so far (resumed frames included). */
      readonly framesDone: number;
      /** Total frames in the render range. */
      readonly framesTotal: number;
    }
  | {
      /** One frame was captured and written to disk. */
      readonly type: 'frame';
      /** The chunk the frame belongs to. */
      readonly chunk: FrameRange;
      /** Completed frames so far (resumed frames included). */
      readonly framesDone: number;
      /** Total frames in the render range. */
      readonly framesTotal: number;
    }
  | {
      /** Every frame of a chunk was captured and written. */
      readonly type: 'chunk-done';
      /** The completed chunk. */
      readonly chunk: FrameRange;
      /** Completed frames so far (resumed frames included). */
      readonly framesDone: number;
      /** Total frames in the render range. */
      readonly framesTotal: number;
    };

/** Options for {@link runRenderJob}. */
export interface RenderJobOptions {
  /** Composition preview URL (same for every tab). */
  url: string;
  /** First frame (inclusive, >= 0). */
  start: number;
  /** One past the last frame (exclusive). */
  end: number;
  /** Directory the captured `frame-%06d.png` files and manifest are written to. */
  outDir: string;
  /**
   * Maximum worker tabs in the pool (default {@link DEFAULT_CONCURRENCY}); at
   * most `min(concurrency, pendingChunkCount)` tabs are launched.
   */
  concurrency?: number;
  /** Maximum frames per chunk (default: the range split evenly across the concurrency). */
  chunkSize?: number;
  /**
   * Resume from the manifest in `outDir` when it matches url + range
   * (default `true`). With `false` the manifest is reset and every frame is
   * captured again.
   */
  resume?: boolean;
  /** Manifest path (default: `<outDir>/{@link DEFAULT_MANIFEST_FILENAME}`). */
  manifestPath?: string;
  /** Progress callback (see {@link RenderProgress}). */
  onProgress?: (progress: RenderProgress) => void;
  /**
   * Cancellation signal [BF-024]: stops scheduling new chunks, closes
   * in-flight tabs (killing pending captures) and awaits the pool before the
   * job rejects with {@link RenderJobAbortedError}.
   */
  signal?: AbortSignal;
  /** Chrome flags (defaults to {@link DEFAULT_CHROME_FLAGS}). */
  flags?: readonly string[];
}

/** Result of a completed (or aborted — see the error) render job. */
export interface RenderJobResult {
  /** The capture output directory. */
  readonly outDir: string;
  /** The manifest path written by the job. */
  readonly manifestPath: string;
  /** Total frames in the render range. */
  readonly framesTotal: number;
  /** Frames captured during this run. */
  readonly framesRendered: number;
  /** Frames skipped because the manifest already covered them. */
  readonly framesResumed: number;
  /** Final completed ranges (the manifest content). */
  readonly completed: readonly FrameRange[];
}

/**
 * Error rejecting a render job whose signal aborted [BF-024]. Completed
 * frames stay recorded in the manifest — rerun the same render to resume.
 */
export class RenderJobAbortedError extends Error {
  /** Frames completed when the abort landed (resumed frames included). */
  readonly framesDone: number;
  /** Total frames in the render range. */
  readonly framesTotal: number;

  constructor(framesDone: number, framesTotal: number) {
    super(
      `Render job aborted after ${framesDone} of ${framesTotal} frame(s). ` +
        'Completed frames are recorded in the render manifest — rerun the same render to resume.',
    );
    this.name = 'RenderJobAbortedError';
    this.framesDone = framesDone;
    this.framesTotal = framesTotal;
  }
}

/** True for a safe integer. */
const isInt = (value: unknown): value is number => Number.isInteger(value);

/**
 * Sorts ranges and merges overlapping or adjacent ones into the smallest
 * equivalent set. Pure — always returns a new array.
 */
const mergeRanges = (ranges: readonly FrameRange[]): FrameRange[] => {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: FrameRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && range.start <= last.end) {
      if (range.end > last.end) merged[merged.length - 1] = { start: last.start, end: range.end };
    } else {
      merged.push({ start: range.start, end: range.end });
    }
  }
  return merged;
};

/** `ranges` with `range` added (merged). Pure. */
const addCompleted = (ranges: readonly FrameRange[], range: FrameRange): FrameRange[] =>
  mergeRanges([...ranges, range]);

/** Total frames covered by `ranges`. */
const countFrames = (ranges: readonly FrameRange[]): number =>
  ranges.reduce((sum, range) => sum + (range.end - range.start), 0);

/**
 * Length of the fully-covered prefix of `[start, end)` given the completed
 * ranges — the resume offset inside a partially completed chunk.
 */
const coveredPrefix = (ranges: readonly FrameRange[], start: number, end: number): number => {
  let cursor = start;
  for (;;) {
    const covering = ranges.find((range) => range.start <= cursor && range.end > cursor);
    if (covering === undefined || cursor >= end) break;
    cursor = covering.end;
  }
  return Math.min(cursor, end) - start;
};

/**
 * Reads and validates a render manifest. Returns `null` for a missing,
 * unreadable or malformed file (a stale manifest simply starts a fresh
 * render); completed ranges are clamped to `[start, end)` and merged.
 *
 * @param manifestPath Path of the manifest JSON
 * @returns The validated manifest, or `null` when unusable
 */
export const readRenderManifest = async (manifestPath: string): Promise<RenderManifest | null> => {
  let raw: string;
  try {
    raw = await readFile(manifestPath, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const manifest = parsed as Record<string, unknown>;
  const { url, start, end, completed } = manifest;
  if (manifest['version'] !== MANIFEST_VERSION || typeof url !== 'string') return null;
  if (!isInt(start) || !isInt(end) || end <= start) return null;
  if (!Array.isArray(completed)) return null;
  const ranges: FrameRange[] = [];
  for (const entry of completed) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { start: rangeStart, end: rangeEnd } = entry as Record<string, unknown>;
    if (!isInt(rangeStart) || !isInt(rangeEnd)) return null;
    const clampedStart = Math.max(start, rangeStart);
    const clampedEnd = Math.min(end, rangeEnd);
    if (clampedEnd > clampedStart) ranges.push({ start: clampedStart, end: clampedEnd });
  }
  return { version: MANIFEST_VERSION, url, start, end, completed: mergeRanges(ranges) };
};

let manifestWriteCounter = 0;

/**
 * Writes a render manifest atomically (write to a unique temp file, rename)
 * so a crash mid-write never corrupts the previous manifest.
 *
 * @param manifestPath Manifest destination
 * @param manifest Manifest to persist
 */
export const writeRenderManifest = async (
  manifestPath: string,
  manifest: RenderManifest,
): Promise<void> => {
  manifestWriteCounter += 1;
  const tmp = `${manifestPath}.${process.pid}.${manifestWriteCounter}.tmp`;
  await writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(tmp, manifestPath);
};

/**
 * Runs a chunked, resumable render: captures every frame in `[start, end)`
 * to `<outDir>/frame-%06d.png` across a bounded pool of parallel tabs
 * [BF-024].
 *
 * Resume semantics: the manifest from `outDir` (see
 * {@link DEFAULT_MANIFEST_FILENAME}) is honored when it matches `url`,
 * `start` and `end`; completed frames (including partial chunks) are skipped
 * and only the missing tail of an interrupted chunk is re-captured. The
 * manifest is rewritten atomically after every captured frame, so an
 * interrupted render always resumes at the exact frame boundary.
 *
 * Failure semantics: a failed chunk closes its tab, respawns a fresh tab and
 * retries the chunk once from its completed offset (mirroring
 * `captureParallel`); a second failure ends that worker and all failures are
 * surfaced as one error (with `cause`) after the pool drains. An abort via
 * {@link RenderJobOptions.signal} takes precedence over chunk failures.
 *
 * @param options URL, half-open range, outDir, concurrency, resume, progress
 *   callback and signal
 * @param launcherFactory Launcher factory (injected; the CLI wires the real
 *   Chrome backend)
 * @returns Render summary (frames rendered / resumed, manifest path)
 * @throws {RangeError} synchronously on invalid options
 * @throws {RenderJobAbortedError} when the signal aborted
 * @throws {Error} aggregating every failed chunk (with `cause`) when any
 *   chunk could not be captured after its one retry
 */
export async function runRenderJob(
  options: RenderJobOptions,
  launcherFactory: LauncherFn,
): Promise<RenderJobResult> {
  const { url, start, end } = options;
  if (typeof url !== 'string' || url.length === 0) {
    throw new RangeError('runRenderJob: url must be a non-empty string');
  }
  if (!isInt(start) || !isInt(end) || start < 0 || end <= start) {
    throw new RangeError(
      `runRenderJob: frame range must be integers with 0 <= start < end, got [${start}, ${end})`,
    );
  }
  const outDir = options.outDir;
  if (typeof outDir !== 'string' || outDir.length === 0) {
    throw new RangeError('runRenderJob: outDir must be a non-empty path');
  }
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  if (!isInt(concurrency) || concurrency < 1) {
    throw new RangeError(`runRenderJob: concurrency must be an integer >= 1, got ${concurrency}`);
  }
  const manifestPath = options.manifestPath ?? join(outDir, DEFAULT_MANIFEST_FILENAME);
  const signal = options.signal;

  await mkdir(outDir, { recursive: true });

  let completed: FrameRange[] = [];
  if (options.resume === false) {
    // Fresh render: reset the manifest up front so a crash mid-render cannot
    // resurrect stale completed ranges on the next resume.
    await writeRenderManifest(manifestPath, {
      version: MANIFEST_VERSION,
      url,
      start,
      end,
      completed: [],
    });
  } else {
    const stored = await readRenderManifest(manifestPath);
    if (stored !== null && stored.url === url && stored.start === start && stored.end === end) {
      completed = [...stored.completed];
    }
  }

  const framesTotal = end - start;
  const framesResumed = countFrames(completed);
  let framesRendered = 0;

  if (signal?.aborted) throw new RenderJobAbortedError(framesResumed, framesTotal);

  const framesDone = (): number => framesResumed + framesRendered;
  const currentManifest = (): RenderManifest => ({
    version: MANIFEST_VERSION,
    url,
    start,
    end,
    completed,
  });

  const chunkSize = options.chunkSize ?? Math.max(1, Math.ceil(framesTotal / concurrency));
  const chunks = splitFrameRange(start, end, chunkSize).filter(
    (chunk) => coveredPrefix(completed, chunk.start, chunk.end) < chunk.end - chunk.start,
  );
  const failures: unknown[] = [];

  if (chunks.length > 0) {
    const flags = options.flags ?? DEFAULT_CHROME_FLAGS;
    const launcher = await launcherFactory(flags);
    const activeTabs = new Set<BrowserTabLike>();
    let cursor = 0;

    /**
     * Captures `[from, chunk.end)` onto one tab, writing each frame to disk
     * and extending the manifest after every frame. Stops early (silently)
     * when the signal aborts; partial progress is already recorded.
     */
    const captureChunkOn = async (tab: BrowserTabLike, chunk: FrameRange, from: number): Promise<void> => {
      options.onProgress?.({
        type: 'chunk-start',
        chunk,
        framesDone: framesDone(),
        framesTotal,
      });
      for (let frame = from; frame < chunk.end; frame++) {
        if (signal?.aborted) return;
        await tab.gotoFrame(frame);
        const png = await tab.screenshotPng();
        await writeFile(join(outDir, frameFileName(frame)), png);
        framesRendered += 1;
        completed = addCompleted(completed, { start: chunk.start, end: frame + 1 });
        await writeRenderManifest(manifestPath, currentManifest());
        options.onProgress?.({
          type: 'frame',
          chunk,
          framesDone: framesDone(),
          framesTotal,
        });
      }
      options.onProgress?.({
        type: 'chunk-done',
        chunk,
        framesDone: framesDone(),
        framesTotal,
      });
    };

    const runWorker = async (): Promise<void> => {
      let tab: BrowserTabLike | undefined;
      try {
        while (cursor < chunks.length) {
          if (signal?.aborted) return;
          const chunk = chunks[cursor++] as FrameRange;
          if (tab === undefined) {
            tab = await launcher.launchTab(url, flags);
            activeTabs.add(tab);
          }
          try {
            const from = chunk.start + coveredPrefix(completed, chunk.start, chunk.end);
            await captureChunkOn(tab, chunk, from);
          } catch (error) {
            if (signal?.aborted) return;
            // Recycle once: fresh tab, retry from the completed offset; a
            // second failure is final for this worker.
            await tab.close();
            activeTabs.delete(tab);
            tab = await launcher.launchTab(url, flags);
            activeTabs.add(tab);
            const offset = chunk.start + coveredPrefix(completed, chunk.start, chunk.end);
            if (offset < chunk.end) {
              try {
                await captureChunkOn(tab, chunk, offset);
              } catch (retryError) {
                if (signal?.aborted) return;
                failures.push(retryError);
                return;
              }
            }
          }
        }
      } catch (error) {
        failures.push(error);
      } finally {
        if (tab !== undefined) {
          activeTabs.delete(tab);
          await tab.close();
        }
      }
    };

    // Kill in-flight captures on abort: closing the tab rejects the pending
    // gotoFrame/screenshot, unwinding the worker cooperatively.
    const onAbort = (): void => {
      for (const tab of activeTabs) void tab.close();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      await Promise.allSettled(
        Array.from({ length: Math.min(concurrency, chunks.length) }, () => runWorker()),
      );
    } finally {
      signal?.removeEventListener('abort', onAbort);
      await launcher.close();
    }
  }

  // Final authoritative manifest write (per-frame writes may interleave).
  await writeRenderManifest(manifestPath, currentManifest());

  if (signal?.aborted) throw new RenderJobAbortedError(framesDone(), framesTotal);
  if (failures.length > 0) {
    const detail = failures
      .map((error) => (error instanceof Error ? error.message : String(error)))
      .join('; ');
    throw new Error(
      `runRenderJob: ${failures.length} of ${chunks.length} chunk(s) failed: ${detail}`,
      { cause: failures[0] },
    );
  }

  return {
    outDir,
    manifestPath,
    framesTotal,
    framesRendered,
    framesResumed,
    completed,
  };
}
