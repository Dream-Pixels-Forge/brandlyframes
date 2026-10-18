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
 * Capture every frame in `[start, end)` through one shared tab.
 *
 * @param options URL + half-open range + viewport
 * @param launcherFactory Launcher factory (injected; see {@link captureFrame})
 * @returns PNG bytes per frame, in frame order
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
  const pngs: Uint8Array[] = [];
  try {
    for (let frame = range.start; frame < range.end; frame++) {
      try {
        await tab.gotoFrame(frame);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`captureChunk: frame ${frame} failed: ${message}`, { cause: error });
      }
      pngs.push(await tab.screenshotPng());
    }
    return pngs;
  } finally {
    await tab.close();
    await launcher.close();
  }
}
