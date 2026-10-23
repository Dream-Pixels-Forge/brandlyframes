/**
 * BF-203: Benchmark suite tests.
 *
 * Verifies: path benchmarking, speedup calculation, tolerance comparison,
 * report formatting, and edge cases (empty paths, single path).
 */

import { describe, expect, it } from 'vitest';
import {
  comparePaths,
  formatReport,
  runBenchmark,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Fake render path
// ---------------------------------------------------------------------------

class FakePath {
  constructor(
    readonly backend: string,
    readonly msPerFrame: number,
    readonly pixelValue: number,
  ) {}

  async renderFrame(_options: {
    readonly url: string;
    readonly frame: number;
    readonly width: number;
    readonly height: number;
  }): Promise<{
    readonly backend: string;
    readonly frame: number;
    readonly width: number;
    readonly height: number;
    readonly pixels: Uint8ClampedArray;
  }> {
    // Add a deterministic delay so performance.now() measures something real.
    const start = performance.now();
    while (performance.now() - start < this.msPerFrame) {
      // busy-wait for the simulated render time
    }
    const pixels = new Uint8ClampedArray(640 * 480 * 4);
    pixels.fill(this.pixelValue);
    return {
      backend: this.backend,
      frame: 0,
      width: 0,
      height: 0,
      pixels,
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runBenchmark', () => {
  it('benchmarks multiple paths and reports fastest/slowest', async () => {
    const fast = new FakePath('gpu', 20, 100);
    const slow = new FakePath('screenshot', 100, 100);

    const report = await runBenchmark([slow, fast], { frameCount: 5 });

    expect(report.frameCount).toBe(5);
    expect(report.summary.backendCount).toBe(2);
    expect(report.summary.fastestBackend).toBe('gpu');
    expect(report.summary.slowestBackend).toBe('screenshot');
  });

  it('computes speedup correctly in comparisons', async () => {
    const fast = new FakePath('gpu', 20, 100);
    const slow = new FakePath('screenshot', 100, 100);

    const report = await runBenchmark([slow, fast], { frameCount: 5 });

    expect(report.comparisons).toHaveLength(1);
    const comp = report.comparisons[0];
    expect(comp.baseline.backend).toBe('screenshot');
    expect(comp.candidate.backend).toBe('gpu');
    expect(comp.speedup).toBeGreaterThan(1);
    // screenshot (~100ms) is significantly slower than gpu (~20ms)
    expect(comp.speedup).toBeGreaterThan(2);
  });

  it('reports within tolerance when pixels match', async () => {
    const same = new FakePath('gpu', 5, 100);
    const same2 = new FakePath('cpu', 5, 100);

    const report = await runBenchmark([same, same2], { frameCount: 3 });

    expect(report.summary.allWithinTolerance).toBe(true);
    for (const comp of report.comparisons) {
      expect(comp.withinTolerance).toBe(true);
      expect(comp.maxPixelDiff).toBe(0);
    }
  });

  it('reports exceeds tolerance when pixels differ', async () => {
    const dark = new FakePath('gpu', 5, 0);
    const bright = new FakePath('cpu', 5, 255);

    const report = await runBenchmark([dark, bright], { frameCount: 3 });

    expect(report.summary.allWithinTolerance).toBe(false);
    for (const comp of report.comparisons) {
      expect(comp.withinTolerance).toBe(false);
      expect(comp.maxPixelDiff).toBeGreaterThan(0);
    }
  });

  it('handles a single path (no comparisons)', async () => {
    const only = new FakePath('gpu', 5, 100);

    const report = await runBenchmark([only], { frameCount: 3 });

    expect(report.comparisons).toHaveLength(0);
    expect(report.summary.allWithinTolerance).toBe(true);
    expect(report.summary.anyMeetsSpeedupTarget).toBe(true);
  });

  it('respects custom tolerance', async () => {
    const a = new FakePath('gpu', 5, 100);
    const b = new FakePath('cpu', 5, 101); // 1 off per pixel

    // Strict tolerance (0%): should fail
    const strict = await runBenchmark([a, b], {
      frameCount: 3,
      tolerance: 0,
    });
    expect(strict.summary.allWithinTolerance).toBe(false);

    // Lenient tolerance (10%): should pass
    const lenient = await runBenchmark([a, b], {
      frameCount: 3,
      tolerance: 0.1,
    });
    expect(lenient.summary.allWithinTolerance).toBe(true);
  });
});

describe('comparePaths', () => {
  it('produces a comparison between baseline and candidate', async () => {
    const baseline = new FakePath('screenshot', 100, 100);
    const candidate = new FakePath('gpu', 20, 100);

    const comp = await comparePaths(baseline, candidate, { frameCount: 4 });

    expect(comp.baseline.backend).toBe('screenshot');
    expect(comp.candidate.backend).toBe('gpu');
    expect(comp.speedup).toBeGreaterThan(1);
    expect(comp.meetsSpeedupTarget).toBe(true); // ~5x >= 3x target
    expect(comp.withinTolerance).toBe(true);
  });

  it('reports below target when speedup is insufficient', async () => {
    const baseline = new FakePath('screenshot', 100, 100);
    const candidate = new FakePath('gpu', 90, 100); // only ~1.1x

    const comp = await comparePaths(baseline, candidate, {
      frameCount: 4,
      speedupTarget: 3,
    });

    expect(comp.speedup).toBeLessThan(3);
    expect(comp.meetsSpeedupTarget).toBe(false);
  });
});

describe('formatReport', () => {
  it('produces human-readable output', async () => {
    const slow = new FakePath('screenshot', 50, 100);
    const fast = new FakePath('gpu', 5, 100);

    const report = await runBenchmark([slow, fast], { frameCount: 5 });
    const text = formatReport(report);

    expect(text).toContain('BrandlyFrames Benchmark');
    expect(text).toContain('screenshot');
    expect(text).toContain('gpu');
    expect(text).toContain('speedup');
    expect(text).toContain('x');
  });
});
