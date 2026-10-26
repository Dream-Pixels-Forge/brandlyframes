/**
 * BF-240: golden-frame diff + runner tests.
 *
 * All renderer interaction goes through the injected capture seam (fake
 * PNG bytes) — no real headless browser runs here. Golden storage is
 * exercised against a temp directory.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  formatGoldenReport,
  formatGoldenReportMarkdown,
  goldenFilePath,
  goldenFrameDiff,
  runGoldenTests,
  type CaptureFn,
} from '../src/index.js';
import { encodePng } from '../src/png.js';

const W = 4;
const H = 3;

function solidPng(r: number, g: number, b: number): Uint8Array {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  }
  return encodePng(px, W, H);
}

const BLUE = solidPng(0, 0, 255);
const ALMOST_BLUE = solidPng(0, 0, 250);
const RED = solidPng(255, 0, 0);

const captureOf =
  (byFrame: Map<number, Uint8Array>): CaptureFn =>
  async ({ frame }) => {
    const png = byFrame.get(frame);
    if (!png) throw new Error(`fake capture: no PNG for frame ${frame}`);
    return png;
  };

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bf-golden-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});

const BASE_ENTRY = {
  id: 'Intro',
  url: 'http://localhost:3000/Intro',
  frames: [0],
  dir: '.',
  width: W,
  height: H,
};

describe('goldenFrameDiff', () => {
  it('passes for identical PNGs', () => {
    const result = goldenFrameDiff(BLUE, BLUE, 0);
    expect(result.passed).toBe(true);
    expect(result.diffPixels).toBe(0);
    expect(result.totalPixels).toBe(W * H);
  });

  it('counts differing pixels and reports max channel diff', () => {
    const result = goldenFrameDiff(BLUE, RED, 0);
    expect(result.passed).toBe(false);
    expect(result.diffPixels).toBe(W * H);
    expect(result.maxChannelDiff).toBe(255);
  });

  it('applies the per-channel pixel threshold', () => {
    // max channel diff is 5 (255 - 250)
    expect(goldenFrameDiff(BLUE, ALMOST_BLUE, 4).passed).toBe(false);
    expect(goldenFrameDiff(BLUE, ALMOST_BLUE, 5).passed).toBe(true);
  });

  it('throws on dimension mismatch', () => {
    const other = encodePng(new Uint8ClampedArray(2 * 2 * 4), 2, 2);
    expect(() => goldenFrameDiff(BLUE, other, 0)).toThrow(/dimension/i);
  });
});

describe('goldenFilePath', () => {
  it('stores goldens next to the composition under __goldens__/<id>/', () => {
    expect(goldenFilePath('src', 'Intro', 30)).toBe(
      join('src', '__goldens__', 'Intro', 'frame-000030.png'),
    );
  });
});

describe('runGoldenTests', () => {
  it('fails with missing-golden status when no golden exists yet', async () => {
    const report = await runGoldenTests({
      entries: [BASE_ENTRY],
      capture: captureOf(new Map([[0, BLUE]])),
    });
    expect(report.passed).toBe(false);
    expect(report.results[0]?.status).toBe('missing-golden');
  });

  it('writes goldens in update mode and passes', async () => {
    const dir = tempDir();
    const report = await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, BLUE]])),
      updateGoldens: true,
    });
    expect(report.passed).toBe(true);
    expect(report.results[0]?.status).toBe('updated');
    const goldenPath = goldenFilePath(dir, 'Intro', 0);
    expect(existsSync(goldenPath)).toBe(true);
    expect(readFileSync(goldenPath)).toEqual(Buffer.from(BLUE));
  });

  it('passes when captured pixels match the golden', async () => {
    const dir = tempDir();
    await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, BLUE]])),
      updateGoldens: true,
    });
    const report = await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, BLUE]])),
    });
    expect(report.passed).toBe(true);
    expect(report.results[0]).toMatchObject({ status: 'pass', diffPixels: 0 });
  });

  it('fails with drift when captured pixels exceed the threshold', async () => {
    const dir = tempDir();
    await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, BLUE]])),
      updateGoldens: true,
    });
    const report = await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, RED]])),
    });
    expect(report.passed).toBe(false);
    expect(report.results[0]?.status).toBe('drift');
    expect(report.results[0]?.diffPixels).toBe(W * H);
  });

  it('applies a global threshold from options', async () => {
    const dir = tempDir();
    await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, BLUE]])),
      updateGoldens: true,
    });
    const report = await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, ALMOST_BLUE]])),
      threshold: 5,
    });
    expect(report.passed).toBe(true);
    expect(report.results[0]?.status).toBe('pass');
  });

  it('handles multiple frames and compositions', async () => {
    const dir = tempDir();
    const entries = [
      { ...BASE_ENTRY, id: 'A', frames: [0, 1], dir },
      { ...BASE_ENTRY, id: 'B', frames: [5], dir },
    ];
    const captures = new Map<number, Uint8Array>([
      [0, BLUE],
      [1, BLUE],
      [5, BLUE],
    ]);
    await runGoldenTests({
      entries,
      capture: captureOf(captures),
      updateGoldens: true,
    });
    const report = await runGoldenTests({
      entries,
      capture: captureOf(captures),
    });
    expect(report.results).toHaveLength(3);
    expect(report.passed).toBe(true);
  });

  it('reports capture errors without throwing', async () => {
    const report = await runGoldenTests({
      entries: [BASE_ENTRY],
      capture: async () => {
        throw new Error('chrome exploded');
      },
    });
    expect(report.passed).toBe(false);
    expect(report.results[0]?.status).toBe('error');
    expect(report.results[0]?.error).toContain('chrome exploded');
  });
});

describe('report formatting', () => {
  it('produces a readable text report', async () => {
    const dir = tempDir();
    await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, BLUE]])),
      updateGoldens: true,
    });
    const failing = await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, RED]])),
    });
    const text = formatGoldenReport(failing);
    expect(text).toContain('Golden-Frame Test Report');
    expect(text).toContain('Intro');
    expect(text).toContain('frame 0');
    expect(text).toContain('FAIL');
  });

  it('produces a markdown report for CI comments', async () => {
    const dir = tempDir();
    await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, BLUE]])),
      updateGoldens: true,
    });
    const failing = await runGoldenTests({
      entries: [{ ...BASE_ENTRY, dir }],
      capture: captureOf(new Map([[0, RED]])),
    });
    const md = formatGoldenReportMarkdown(failing);
    expect(md).toContain('| Composition | Frame | Status |');
    expect(md).toContain('Intro');
  });
});
