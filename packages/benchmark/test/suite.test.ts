/**
 * BF-203: scene benchmark suite tests.
 *
 * Runs the side-by-side WebGPU/renderer-path vs screenshot-baseline
 * comparison on the 3 standard scenes using fake render paths — no
 * browser, no network. Verifies the comparison table, the tolerance
 * check, and that the 3x claim is *validated from measured numbers*
 * (never asserted).
 */

import { describe, expect, it } from 'vitest';
import {
  formatComparisonTable,
  runSceneBenchmark,
  sceneUrl,
  STANDARD_SCENES,
  type BenchmarkablePath,
} from '../src/index.js';

/** Fake path: constant deterministic pixels + a busy-wait cost. */
function fakePath(backend: string, msPerFrame: number, tint: number): BenchmarkablePath {
  return {
    backend,
    async renderFrame({ url, frame, width, height }) {
      const start = performance.now();
      while (performance.now() - start < msPerFrame) {
        // busy-wait to produce measurable per-frame cost
      }
      void url; // suite passes benchmark-scene:// URLs; fake ignores them
      const pixels = new Uint8ClampedArray(width * height * 4);
      if (tint !== 0) pixels.fill(tint);
      return { backend, frame, width, height, pixels };
    },
  };
}

describe('runSceneBenchmark', () => {
  it('benchmarks both paths on all 3 standard scenes', async () => {
    const baseline = fakePath('screenshot', 8, 0);
    const candidate = fakePath('gpu', 2, 0);

    const report = await runSceneBenchmark(baseline, candidate, {
      msPerFrame: { baseline: 8, candidate: 2 },
      framesPerScene: 2,
    });

    expect(report.scenes.map((s) => s.sceneId)).toEqual(
      STANDARD_SCENES.map((s) => s.id),
    );
    expect(report.scenes).toHaveLength(3);
    for (const scene of report.scenes) {
      expect(scene.baseline.backend).toBe('screenshot');
      expect(scene.candidate.backend).toBe('gpu');
      expect(scene.baseline.frameCount).toBe(2);
      expect(scene.speedup).toBeGreaterThan(1);
      expect(scene.withinTolerance).toBe(true);
    }
  });

  it('reports a measured aggregate speedup (validated, not asserted)', async () => {
    const baseline = fakePath('screenshot', 9, 0);
    const candidate = fakePath('gpu', 3, 0);

    const report = await runSceneBenchmark(baseline, candidate, {
      framesPerScene: 2,
      speedupTarget: 2,
    });

    // measured from the fake costs (~3x busy-wait ratio, diluted slightly
    // by harness overhead) — never hardcoded
    expect(report.measuredSpeedup).toBeGreaterThan(2);
    expect(report.measuredSpeedup).toBeLessThan(4);
    expect(report.meetsSpeedupTarget).toBe(true);
    expect(report.speedupTarget).toBe(2);
  });

  it('flags scenes below the speedup target instead of asserting 3x', async () => {
    const baseline = fakePath('screenshot', 4, 0);
    const candidate = fakePath('gpu', 4, 0);

    const report = await runSceneBenchmark(baseline, candidate, {
      framesPerScene: 2,
      speedupTarget: 3,
    });

    expect(report.measuredSpeedup).toBeLessThan(1.5);
    expect(report.meetsSpeedupTarget).toBe(false);
  });

  it('marks scenes outside the pixel tolerance', async () => {
    const baseline = fakePath('screenshot', 5, 0);
    const candidate = fakePath('gpu', 5, 255); // red-tinted output

    const report = await runSceneBenchmark(baseline, candidate, {
      framesPerScene: 1,
    });

    expect(report.scenes.every((s) => !s.withinTolerance)).toBe(true);
    expect(report.allWithinTolerance).toBe(false);
  });

  it('honours a scene subset', async () => {
    const report = await runSceneBenchmark(
      fakePath('screenshot', 2, 0),
      fakePath('gpu', 2, 0),
      { scenes: ['gradient'], framesPerScene: 1 },
    );
    expect(report.scenes.map((s) => s.sceneId)).toEqual(['gradient']);
  });

  it('throws on an unknown scene id', async () => {
    await expect(
      runSceneBenchmark(fakePath('a', 1, 0), fakePath('b', 1, 0), {
        scenes: ['nope' as string],
        framesPerScene: 1,
      }),
    ).rejects.toThrow(/unknown scene/i);
  });
});

describe('formatComparisonTable', () => {
  it('renders the comparison table with actual numbers and verdicts', async () => {
    const report = await runSceneBenchmark(
      fakePath('screenshot', 9, 0),
      fakePath('gpu', 3, 0),
      { framesPerScene: 2 },
    );
    const table = formatComparisonTable(report);

    expect(table).toContain('Standard Scenes');
    expect(table).toContain('screenshot');
    expect(table).toContain('gpu');
    for (const scene of STANDARD_SCENES) {
      expect(table).toContain(scene.id);
    }
    expect(table).toMatch(/speedup/i);
    expect(table).toMatch(/tolerance/i);
    // measured, not asserted: the target line reports the actual number
    expect(table).toMatch(/measured/i);
    expect(table).not.toMatch(/3\.00x passed/);
  });

  it('keeps scene URLs derivable for real path wiring', () => {
    expect(sceneUrl('gradient')).toMatch(/^benchmark-scene:\/\//);
  });
});
