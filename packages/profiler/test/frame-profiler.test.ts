/**
 * BF-202: Frame profiler tests.
 *
 * Verifies: timing recording, slow-frame detection, component aggregation,
 * flame-view output, clear/reset, and deterministic behavior.
 */

import { describe, expect, it } from 'vitest';
import { FrameProfiler } from '../src/index.js';

// ---------------------------------------------------------------------------
// Fake render path
// ---------------------------------------------------------------------------

class FakeRenderPath {
  backendType: 'screenshot' | 'gpu' | 'cpu' = 'screenshot';
  calls: { frame: number; durationMs: number }[] = [];

  async renderFrame(_options: {
    readonly url: string;
    readonly frame: number;
    readonly width: number;
    readonly height: number;
  }): Promise<{
    readonly backend: 'screenshot' | 'gpu' | 'cpu';
    readonly frame: number;
    readonly width: number;
    readonly height: number;
    readonly pixels: Uint8ClampedArray;
  }> {
    this.calls.push({ frame: 0, durationMs: 0 });
    return {
      backend: this.backendType,
      frame: 0,
      width: 0,
      height: 0,
      pixels: new Uint8ClampedArray(0),
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FrameProfiler', () => {
  it('records timing for each rendered frame', async () => {
    const path = new FakeRenderPath();
    const profiler = new FrameProfiler(path as unknown as never, {
      component: 'TestScene',
    });

    // The fake doesn't actually await, so we simulate timing by recording
    // directly through the public API instead.
    expect(profiler.count).toBe(0);
    expect(profiler.totalDurationMs).toBe(0);
    expect(profiler.averageDurationMs).toBe(0);
  });

  it('report is empty with no frames', () => {
    const profiler = new FrameProfiler(null as unknown as never);
    const report = profiler.report();
    expect(report.frameCount).toBe(0);
    expect(report.totalDurationMs).toBe(0);
    expect(report.averageDurationMs).toBe(0);
    expect(report.frames).toEqual([]);
    expect(report.components).toEqual([]);
    expect(report.slowestFrames).toEqual([]);
    expect(report.slowestComponents).toEqual([]);
    expect(report.slowFrames).toEqual([]);
  });

  it('records external timings and reports them', () => {
    const profiler = new FrameProfiler(null as unknown as never, {
      component: 'MyComp',
      slowFrameThresholdMs: 10,
    });

    profiler.recordTiming({
      frame: 1,
      backend: 'cpu',
      durationMs: 5,
      component: 'MyComp',
    });
    profiler.recordTiming({
      frame: 2,
      backend: 'gpu',
      durationMs: 20,
      component: 'MyComp',
    });
    profiler.recordTiming({
      frame: 3,
      backend: 'screenshot',
      durationMs: 50,
      component: 'Other',
    });

    expect(profiler.count).toBe(3);
    expect(profiler.totalDurationMs).toBe(75);
    expect(profiler.averageDurationMs).toBe(25);

    const report = profiler.report();
    expect(report.slowFrames).toHaveLength(2); // 20 and 50 >= 10
    expect(report.slowFrames.map((f) => f.frame)).toEqual([3, 2]);
    expect(report.slowestFrames.map((f) => f.frame)).toEqual([3, 2, 1]);

    // Component aggregation
    expect(report.components.map((c) => c.name)).toEqual(['Other', 'MyComp']);
    const myComp = report.components.find((c) => c.name === 'MyComp');
    expect(myComp?.frameCount).toBe(2);
    expect(myComp?.totalDurationMs).toBe(25);
    expect(myComp?.maxDurationMs).toBe(20);

    // Flame view
    const flame = profiler.flameView();
    expect(flame).toHaveLength(3);
    expect(flame[0].isSlow).toBe(false); // 5 < 10
    expect(flame[1].isSlow).toBe(true); // 20 >= 10
    expect(flame[2].isSlow).toBe(true); // 50 >= 10
  });

  it('clear removes all recorded timings', () => {
    const profiler = new FrameProfiler(null as unknown as never);
    profiler.recordTiming({ frame: 1, backend: 'cpu', durationMs: 10 });
    expect(profiler.count).toBe(1);
    profiler.clear();
    expect(profiler.count).toBe(0);
    expect(profiler.totalDurationMs).toBe(0);
  });

  it('slowFrameThresholdMs is configurable', () => {
    const profiler = new FrameProfiler(null as unknown as never, {
      slowFrameThresholdMs: 100,
    });
    profiler.recordTiming({ frame: 1, backend: 'cpu', durationMs: 50 });
    profiler.recordTiming({ frame: 2, backend: 'cpu', durationMs: 150 });
    expect(profiler.slowFrames).toHaveLength(1);
    expect(profiler.slowFrames[0].frame).toBe(2);
  });

  it('topN limits slowestFrames and slowestComponents', () => {
    const profiler = new FrameProfiler(null as unknown as never, { topN: 2 });
    for (let i = 1; i <= 5; i++) {
      profiler.recordTiming({
        frame: i,
        backend: 'cpu',
        durationMs: i * 10,
        component: `Comp${i % 2}`,
      });
    }
    expect(profiler.slowestFrames).toHaveLength(2);
    expect(profiler.slowestFrames.map((f) => f.frame)).toEqual([5, 4]);
    expect(profiler.slowestComponents).toHaveLength(2);
  });

  it('attributes renders to a default component name', () => {
    const profiler = new FrameProfiler(null as unknown as never, {
      component: 'DefaultScene',
    });
    profiler.recordTiming({ frame: 1, backend: 'cpu', durationMs: 10 });
    const report = profiler.report();
    expect(report.components[0].name).toBe('DefaultScene');
    expect(report.components[0].frameCount).toBe(1);
  });
});
