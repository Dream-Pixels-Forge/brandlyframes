/**
 * Frame profiler (BF-202).
 *
 * Records per-frame render duration so the slowest frames can be surfaced.
 * Framework-free (no React, no DOM) — safe in render workers and Node.
 * Times are wall-clock ms measured around the frame's render work, keyed
 * by frame number.
 */

export interface FrameProfileEntry {
  readonly frame: number;
  readonly durationMs: number;
}

const samples = new Map<number, number[]>();

/** Begin timing frame `frame`. Returns an id to pass to endFrameProfile. */
export function startFrameProfile(_frame: number): number {
  return performance.now();
}

/** End timing for `frame`, recording the elapsed ms. */
export function endFrameProfile(frame: number, startId: number): void {
  const durationMs = performance.now() - startId;
  let samplesForFrame = samples.get(frame);
  if (!samplesForFrame) {
    samplesForFrame = [];
    samples.set(frame, samplesForFrame);
  }
  samplesForFrame.push(durationMs);
}

/** All profile entries, slowest first. */
export function getFrameProfile(): readonly FrameProfileEntry[] {
  const entries: FrameProfileEntry[] = [];
  for (const [frame, durations] of samples) {
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    entries.push({ frame, durationMs: avg });
  }
  entries.sort((a, b) => b.durationMs - a.durationMs);
  return entries;
}

/** Clear all profile samples (test isolation / new render). */
export function clearFrameProfile(): void {
  samples.clear();
}
