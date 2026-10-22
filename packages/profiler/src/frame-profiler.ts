/**
 * @brandlyframes/profiler — frame profiler [BF-202]
 *
 * Wraps a render path and records per-frame and per-component render timing.
 * Identifies slow frames and slow components, and produces flame-view data
 * for the Studio. Deterministic: no wall-clock dependence beyond timing
 * measurements, no Math.random.
 */

import type {
  ComponentTiming,
  FlameViewPoint,
  FrameProfilerOptions,
  FrameTiming,
  ProfileResult,
  ProfiledRenderPath,
} from './types.js';

const DEFAULT_SLOW_FRAME_THRESHOLD_MS = 33; // ~1 frame at 30 fps
const DEFAULT_TOP_N = 10;

/**
 * FrameProfiler wraps a render path and instruments every renderFrame call
 * with timing. Attach it to the renderer to get a slow-frame report and
 * flame-view data for the Studio.
 *
 * Example:
 *   const profiler = new FrameProfiler(screenshotPath, { component: 'MyScene' });
 *   const result = await profiler.renderFrame({ url, frame, width, height });
 *   const report = profiler.report();
 */
export class FrameProfiler {
  private readonly path: ProfiledRenderPath;
  private readonly slowFrameThresholdMs: number;
  private readonly topN: number;
  private readonly component?: string;
  private readonly frames: FrameTiming[] = [];

  constructor(path: ProfiledRenderPath, options: FrameProfilerOptions = {}) {
    this.path = path;
    this.slowFrameThresholdMs = options.slowFrameThresholdMs ?? DEFAULT_SLOW_FRAME_THRESHOLD_MS;
    this.topN = options.topN ?? DEFAULT_TOP_N;
    this.component = options.component;
  }

  /** Backend type of the wrapped render path. */
  get backendType(): 'screenshot' | 'gpu' | 'cpu' {
    return this.path.backendType;
  }

  /** Render one frame and record its timing. */
  async renderFrame(options: {
    readonly url: string;
    readonly frame: number;
    readonly width: number;
    readonly height: number;
    readonly sourcePixels?: Uint8ClampedArray;
  }): Promise<{
    readonly backend: 'screenshot' | 'gpu' | 'cpu';
    readonly frame: number;
    readonly width: number;
    readonly height: number;
    readonly pixels: Uint8ClampedArray;
    readonly durationMs: number;
  }> {
    const startedAt = performance.now();
    const result = await this.path.renderFrame({
      url: options.url,
      frame: options.frame,
      width: options.width,
      height: options.height,
      sourcePixels: options.sourcePixels,
    });
    const durationMs = performance.now() - startedAt;

    const timing: FrameTiming = {
      frame: options.frame,
      backend: result.backend,
      durationMs,
      startedAt,
      component: this.component,
    };
    this.frames.push(timing);

    return {
      backend: result.backend,
      frame: result.frame,
      width: result.width,
      height: result.height,
      pixels: result.pixels,
      durationMs,
    };
  }

  /** Record an external timing (e.g. an effect applied outside renderFrame). */
  recordTiming({
    frame,
    backend,
    durationMs,
    component,
    effects,
  }: {
    readonly frame: number;
    readonly backend: 'screenshot' | 'gpu' | 'cpu';
    readonly durationMs: number;
    readonly component?: string;
    readonly effects?: readonly string[];
  }): void {
    this.frames.push({
      frame,
      backend,
      durationMs,
      startedAt: performance.now() - durationMs,
      component: component ?? this.component,
      effects,
    });
  }

  /** Clear all recorded timings. */
  clear(): void {
    this.frames.length = 0;
  }

  /** Number of frames recorded. */
  get count(): number {
    return this.frames.length;
  }

  /** Total render time across all recorded frames (ms). */
  get totalDurationMs(): number {
    return this.frames.reduce((sum, f) => sum + f.durationMs, 0);
  }

  /** Average render time per frame (ms). */
  get averageDurationMs(): number {
    if (this.frames.length === 0) return 0;
    return this.totalDurationMs / this.frames.length;
  }

  /** Frames exceeding the slow-frame threshold, descending by duration. */
  get slowFrames(): readonly FrameTiming[] {
    return [...this.frames]
      .filter((f) => f.durationMs >= this.slowFrameThresholdMs)
      .sort((a, b) => b.durationMs - a.durationMs);
  }

  /** The N slowest frames, descending by duration. */
  get slowestFrames(): readonly FrameTiming[] {
    return [...this.frames]
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, this.topN);
  }

  /** Per-component aggregate timing. */
  get components(): readonly ComponentTiming[] {
    const byComponent = new Map<string, { total: number; count: number; max: number }>();
    for (const f of this.frames) {
      const name = f.component ?? '(unknown)';
      const cur = byComponent.get(name) ?? { total: 0, count: 0, max: 0 };
      cur.total += f.durationMs;
      cur.count += 1;
      cur.max = Math.max(cur.max, f.durationMs);
      byComponent.set(name, cur);
    }
    return [...byComponent.entries()]
      .map(([name, c]): ComponentTiming => ({
        name,
        frameCount: c.count,
        totalDurationMs: c.total,
        averageDurationMs: c.total / c.count,
        maxDurationMs: c.max,
      }))
      .sort((a, b) => b.totalDurationMs - a.totalDurationMs);
  }

  /** The N slowest components, descending by total time. */
  get slowestComponents(): readonly ComponentTiming[] {
    return [...this.components].slice(0, this.topN);
  }

  /** Full profile report. */
  report(): ProfileResult {
    return {
      frameCount: this.frames.length,
      totalDurationMs: this.totalDurationMs,
      averageDurationMs: this.averageDurationMs,
      frames: [...this.frames],
      components: this.components,
      slowestFrames: this.slowestFrames,
      slowestComponents: this.slowestComponents,
      slowFrames: this.slowFrames,
    };
  }

  /** Flame-view data points for the Studio flame chart. */
  flameView(): readonly FlameViewPoint[] {
    return this.frames.map((f) => ({
      frame: f.frame,
      durationMs: f.durationMs,
      backend: f.backend,
      component: f.component,
      isSlow: f.durationMs >= this.slowFrameThresholdMs,
    }));
  }
}
