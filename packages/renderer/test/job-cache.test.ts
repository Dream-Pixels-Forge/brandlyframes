/**
 * Content-addressed frame cache in runRenderJob — cold vs cached render
 * byte-identity with an injected renderer, plus hit/miss counters
 * [BF-110][BF-111][BF-112].
 */

import { afterAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runRenderJob } from '../src/job';
import { type BrowserTabLike, type LauncherFn } from '../src/capture';

// Deterministic fake renderer: a tab whose screenshot is a fixed "PNG"
// payload keyed by the currently seeked frame — identical bytes for the
// same frame, so cold and cached runs are comparable.
let renders = 0;
const fakeLauncher: LauncherFn = async () => ({
  launchTab: async (): Promise<BrowserTabLike> => {
    let frame = -1;
    return {
      url: 'test://composition',
      gotoFrame: async (f: number) => {
        frame = f;
      },
      screenshotPng: async () => {
        renders += 1;
        return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, frame]);
      },
      close: async () => {},
    };
  },
  close: async () => {},
});

const tmpRoot = mkdtemp(join(tmpdir(), 'bf-job-cache-'));
afterAll(async () => {
  rm(await tmpRoot, { recursive: true, force: true });
});

describe('runRenderJob frame cache [BF-111][BF-112]', () => {
  it('cached rerun is byte-identical and never re-renders', async () => {
    const root = await tmpRoot;
    const coldDir = join(root, 'cold');
    const cachedDir = join(root, 'cached');
    const cacheDir = join(root, 'cache');
    const base = {
      url: 'test://composition',
      start: 0,
      end: 5,
      concurrency: 2,
      cacheDir,
      propsHash: 'p1',
    };

    const cold = await runRenderJob({ ...base, outDir: coldDir }, fakeLauncher);
    expect(renders).toBe(5);
    expect(cold.cacheMisses).toBe(5);
    expect(cold.cacheHits).toBe(0);

    const cached = await runRenderJob({ ...base, outDir: cachedDir }, fakeLauncher);
    expect(renders).toBe(5); // injected renderer untouched on the cached run
    expect(cached.cacheHits).toBe(5);
    expect(cached.cacheMisses).toBe(0);

    const files = (await readdir(coldDir)).filter((f) => f.endsWith('.png')).sort();
    expect(files).toHaveLength(5);
    for (const file of files) {
      const coldBytes = await readFile(join(coldDir, file));
      const cachedBytes = await readFile(join(cachedDir, file));
      expect(Buffer.from(coldBytes).equals(Buffer.from(cachedBytes))).toBe(true);
    }
  });

  it('a props change forces misses (key sensitivity) [BF-110]', async () => {
    const root = await tmpRoot;
    const cacheDir = join(root, 'cache');
    const before = renders;

    const changed = await runRenderJob(
      {
        url: 'test://composition',
        start: 0,
        end: 5,
        outDir: join(root, 'props-changed'),
        cacheDir,
        propsHash: 'p2',
      },
      fakeLauncher,
    );
    expect(renders).toBe(before + 5);
    expect(changed.cacheMisses).toBe(5);
    expect(changed.cacheHits).toBe(0);
  });

  it('counters stay zero when no cacheDir is given', async () => {
    const root = await tmpRoot;
    const result = await runRenderJob(
      { url: 'test://composition', start: 0, end: 2, outDir: join(root, 'no-cache') },
      fakeLauncher,
    );
    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(0);
  });
});
