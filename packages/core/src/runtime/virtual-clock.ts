/**
 * Virtual clock for deterministic rendering (BF-420).
 *
 * When installed, `setTimeout`, `setInterval`, `Date.now`,
 * `performance.now` and `requestAnimationFrame` derive time from the
 * current frame number instead of wall-clock time. This keeps renders
 * deterministic: `setTimeout` callbacks do not fire mid-render, and
 * `Date.now()` returns a stable value for the same frame.
 *
 * Install during render/capture, uninstall after. The patch surface is
 * intentionally small and injectable.
 */

type TimerCallback = () => void;
type TimerId = number;

let virtualActive = false;
let virtualFrame = 0;
let virtualBaseRealMs = 0;

/** Assumed frame duration for virtual time conversion (60fps). */
const FRAME_MS = 1000 / 60;

const pendingTimeouts = new Map<TimerId, { callback: TimerCallback; targetFrame: number }>();
const pendingIntervals = new Map<TimerId, { callback: TimerCallback; intervalFrames: number; lastFrame: number }>();
const pendingRafs = new Map<TimerId, { callback: TimerCallback; targetFrame: number }>();
let nextTimerId = 1;

/** Originals saved at install time. */
const origSetTimeout = globalThis.setTimeout.bind(globalThis);
const origSetInterval = globalThis.setInterval.bind(globalThis);
const origClearTimeout = globalThis.clearTimeout.bind(globalThis);
const origClearInterval = globalThis.clearInterval.bind(globalThis);
const origDateNow = Date.now.bind(Date);
const origPerformanceNow = globalThis.performance?.now.bind(globalThis.performance);
const origRequestAnimationFrame = globalThis.requestAnimationFrame?.bind(globalThis);
const origCancelAnimationFrame = globalThis.cancelAnimationFrame?.bind(globalThis);

/** Is the virtual clock currently active? */
export function isVirtualClockActive(): boolean {
  return virtualActive;
}

/** Current virtual frame number. */
export function getVirtualClockFrame(): number {
  return virtualFrame;
}

/**
 * Advance the virtual clock to a frame, firing any timeouts/intervals/rafs
 * whose target frame has been reached. Safe to call multiple times.
 */
export function setVirtualClockFrame(frame: number): void {
  virtualFrame = frame;
  for (const [timerId, entry] of pendingTimeouts) {
    if (entry.targetFrame <= frame) {
      pendingTimeouts.delete(timerId);
      entry.callback();
    }
  }
  for (const entry of pendingIntervals.values()) {
    while (entry.lastFrame + entry.intervalFrames <= frame) {
      entry.lastFrame += entry.intervalFrames;
      entry.callback();
    }
  }
  for (const [timerId, entry] of pendingRafs) {
    if (entry.targetFrame <= frame) {
      pendingRafs.delete(timerId);
      entry.callback();
    }
  }
}

/**
 * Install the virtual clock. Replaces `setTimeout`, `setInterval`,
 * `Date.now`, `performance.now`, `requestAnimationFrame` with
 * frame-driven versions. Idempotent.
 */
export function installVirtualClock(frame = 0): void {
  if (virtualActive) {
    virtualFrame = frame;
    return;
  }
  virtualActive = true;
  virtualFrame = frame;
  virtualBaseRealMs = origDateNow();

  globalThis.setTimeout = ((cb: TimerCallback, delayMs: number): TimerId => {
    const id = nextTimerId++;
    pendingTimeouts.set(id, {
      callback: cb,
      targetFrame: virtualFrame + Math.max(0, Math.ceil(delayMs / FRAME_MS)),
    });
    return id;
  }) as typeof setTimeout;

  globalThis.setInterval = ((cb: TimerCallback, intervalMs: number): TimerId => {
    const id = nextTimerId++;
    pendingIntervals.set(id, {
      callback: cb,
      intervalFrames: Math.max(1, Math.ceil(intervalMs / FRAME_MS)),
      lastFrame: virtualFrame,
    });
    return id;
  }) as typeof setInterval;

  globalThis.clearTimeout = ((id: TimerId): void => {
    pendingTimeouts.delete(id);
  }) as typeof clearTimeout;

  globalThis.clearInterval = ((id: TimerId): void => {
    pendingIntervals.delete(id);
  }) as typeof clearInterval;

  Date.now = (): number => virtualBaseRealMs + virtualFrame * FRAME_MS;

  if (globalThis.performance?.now) {
    globalThis.performance.now = (): number => virtualFrame * FRAME_MS;
  }

  if (globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = ((cb: TimerCallback): number => {
      const id = nextTimerId++;
      pendingRafs.set(id, { callback: cb, targetFrame: virtualFrame + 1 });
      return id;
    }) as typeof requestAnimationFrame;
  }

  if (globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = ((id: TimerId): void => {
      pendingRafs.delete(id);
    }) as typeof cancelAnimationFrame;
  }
}

/**
 * Uninstall the virtual clock and restore originals. Fires no pending
 * timers. Idempotent.
 */
export function uninstallVirtualClock(): void {
  if (!virtualActive) return;
  virtualActive = false;
  globalThis.setTimeout = origSetTimeout;
  globalThis.setInterval = origSetInterval;
  globalThis.clearTimeout = origClearTimeout;
  globalThis.clearInterval = origClearInterval;
  Date.now = origDateNow;
  if (globalThis.performance?.now && origPerformanceNow) {
    globalThis.performance.now = origPerformanceNow;
  }
  if (globalThis.requestAnimationFrame && origRequestAnimationFrame) {
    globalThis.requestAnimationFrame = origRequestAnimationFrame;
  }
  if (globalThis.cancelAnimationFrame && origCancelAnimationFrame) {
    globalThis.cancelAnimationFrame = origCancelAnimationFrame;
  }
  pendingTimeouts.clear();
  pendingIntervals.clear();
  pendingRafs.clear();
  nextTimerId = 1;
}

/**
 * Wall-clock guard (BF-420): returns `true` when the virtual clock is
 * active and `Date.now()`/`performance.now()` are being used — useful for
 * warning when a component reads wall-clock time during render.
 */
export function isWallClockUnsafe(): boolean {
  return virtualActive;
}
