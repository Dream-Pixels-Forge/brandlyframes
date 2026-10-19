/**
 * RenderJob orchestration — runRenderJob [BF-024]
 *
 * Progress events, AbortSignal cancellation and manifest-based resume,
 * exercised against a scripted fake launcher (fake tabs seek a virtual frame
 * and screenshot it back as a one-byte PNG) — no real Chrome.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runRenderJob,
  readRenderManifest,
  writeRenderManifest,
  RenderJobAbortedError,
  DEFAULT_MANIFEST_FILENAME,
  MANIFEST_VERSION,
  type RenderProgress,
} from '../src/job';
import { type BrowserLauncherLike, type BrowserTabLike, type LauncherFn } from '../src/capture';

/** A fake tab that records seeks and screenshots the current frame as [frame]. */
interface FakeTab extends BrowserTabLike {
  /** Frames successfully seeked, in order. */
  readonly seeks: number[];
  /** Whether close() was called. */
  closed: boolean;
}

/** A fake launcher that scripts its tabs and counts launches/closes. */
interface FakePool {
  readonly launcher: BrowserLauncherLike;
  /** Tabs in launch order (index = launch number). */
  readonly tabs: FakeTab[];
  launches: () => number;
  closes: () => number;
  /** Flags the factory was called with. */
  readonly factoryFlags: readonly (readonly string[] | undefined)[];
}

/**
 * Build a fake pool. `makeTab` receives the launch number (0-based) and
 * returns a scripted tab, so a specific launch can be made to fail.
 */
const makePool = (makeTab: (launch: number) => FakeTab): FakePool => {
  const tabs: FakeTab[] = [];
  const factoryFlags: readonly (readonly string[] | undefined)[] = [];
  let launches = 0;
  let closes = 0;
  const launcher: BrowserLauncherLike = {
    launchTab: async (url, flags) => {
      void url;
      factoryFlags.push(flags);
      const tab = makeTab(launches++);
      tabs.push(tab);
      return tab;
    },
    close: async () => {
      closes += 1;
    },
  };
  return { launcher, tabs, launches: () => launches, closes: () => closes, factoryFlags };
};

/** Healthy tab: seeks any frame, screenshots it back as a one-byte PNG. */
const healthyTab = (): FakeTab => {
  const tab: FakeTab = {
    url: 'http://localhost:3000',
    seeks: [],
    closed: false,
    gotoFrame: async (frame: number) => {
      if (tab.closed) throw new Error('tab closed');
      tab.seeks.push(frame);
    },
    screenshotPng: async (): Promise<Uint8Array> =>
      new Uint8Array([tab.seeks[tab.seeks.length - 1] ?? 0]),
    close: async () => {
      tab.closed = true;
    },
  };
  return tab;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const makeOutDir = async (): Promise<string> => mkdtemp(join(tmpdir(), 'bf-job-'));

const readManifest = async (outDir: string) =>
  readRenderManifest(join(outDir, DEFAULT_MANIFEST_FILENAME));

const typedError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

describe('runRenderJob — capture + progress', () => {
  it('renders every frame to outDir, writes a merged manifest and emits progress', async () => {
    const outDir = await makeOutDir();
    try {
      const pool = makePool(() => healthyTab());
      const events: RenderProgress[] = [];
      const result = await runRenderJob(
        {
          url: 'http://localhost:3000',
          start: 0,
          end: 10,
          outDir,
          concurrency: 2,
          chunkSize: 4,
          onProgress: (progress) => events.push(progress),
        },
        () => Promise.resolve(pool.launcher),
      );

      expect(result.framesTotal).toBe(10);
      expect(result.framesRendered).toBe(10);
      expect(result.framesResumed).toBe(0);
      expect(result.manifestPath).toBe(join(outDir, DEFAULT_MANIFEST_FILENAME));

      const files = (await readdir(outDir)).sort();
      expect(files).toContain('frame-000000.png');
      expect(files).toContain('frame-000009.png');
      // Frame files carry the seeked frame back as their single byte.
      const first = await readFile(join(outDir, 'frame-000000.png'));
      expect(Array.from(first)).toEqual([0]);
      const last = await readFile(join(outDir, 'frame-000009.png'));
      expect(Array.from(last)).toEqual([9]);

      const manifest = await readManifest(outDir);
      expect(manifest).not.toBeNull();
      expect(manifest?.url).toBe('http://localhost:3000');
      expect(manifest?.completed).toEqual([{ start: 0, end: 10 }]);

      // 3 chunks [0,4) [4,8) [8,10): chunk-start x3, frame x10, chunk-done x3.
      const types = events.map((event) => event.type);
      expect(types.filter((type) => type === 'chunk-start')).toHaveLength(3);
      expect(types.filter((type) => type === 'frame')).toHaveLength(10);
      expect(types.filter((type) => type === 'chunk-done')).toHaveLength(3);
      const frameEvents = events.filter((event) => event.type === 'frame');
      // Frames from parallel workers interleave: assert monotonic progress.
      const frameDones = frameEvents.map((event) => event.framesDone);
      for (let i = 1; i < frameDones.length; i++) {
        expect(frameDones[i]).toBeGreaterThan(frameDones[i - 1]);
      }
      expect(frameDones[frameDones.length - 1]).toBe(10);
      expect(frameEvents.every((event) => event.framesTotal === 10)).toBe(true);
      const lastChunkDone = events[events.length - 1] as Extract<RenderProgress, { type: 'chunk-done' }>;
      expect(lastChunkDone.chunk).toEqual({ start: 8, end: 10 });
      expect(lastChunkDone.framesDone).toBe(10);

      // No leftover temp manifests.
      expect(files.some((file) => file.includes('.tmp'))).toBe(false);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('forwards the flags to the launcher factory and closes the launcher', async () => {
    const outDir = await makeOutDir();
    try {
      const pool = makePool(() => healthyTab());
      const flags = ['--headless=new', '--test-flag'];
      await runRenderJob(
        { url: 'http://localhost:3000', start: 0, end: 2, outDir, concurrency: 1, chunkSize: 2, flags },
        () => Promise.resolve(pool.launcher),
      );
      expect(pool.factoryFlags[0]).toEqual(flags);
      expect(pool.closes()).toBe(1);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe('runRenderJob — resume from manifest [BF-024]', () => {
  it('skips manifest-covered chunks and only captures the missing tail', async () => {
    const outDir = await makeOutDir();
    try {
      await writeRenderManifest(join(outDir, DEFAULT_MANIFEST_FILENAME), {
        version: MANIFEST_VERSION,
        url: 'http://localhost:3000',
        start: 0,
        end: 10,
        completed: [
          { start: 0, end: 4 },
          { start: 4, end: 6 },
        ],
      });
      const pool = makePool(() => healthyTab());
      const events: RenderProgress[] = [];
      const result = await runRenderJob(
        {
          url: 'http://localhost:3000',
          start: 0,
          end: 10,
          outDir,
          concurrency: 1,
          chunkSize: 4,
          onProgress: (progress) => events.push(progress),
        },
        () => Promise.resolve(pool.launcher),
      );

      expect(result.framesResumed).toBe(6);
      expect(result.framesRendered).toBe(4);
      expect(pool.tabs[0]?.seeks).toEqual([6, 7, 8, 9]);
      const manifest = await readManifest(outDir);
      expect(manifest?.completed).toEqual([{ start: 0, end: 10 }]);
      // Progress counters include resumed frames.
      const frameEvents = events.filter((event) => event.type === 'frame');
      expect(frameEvents.map((event) => event.framesDone)).toEqual([7, 8, 9, 10]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('ignores a stale manifest (different url) and re-renders everything', async () => {
    const outDir = await makeOutDir();
    try {
      await writeRenderManifest(join(outDir, DEFAULT_MANIFEST_FILENAME), {
        version: MANIFEST_VERSION,
        url: 'http://localhost:9999',
        start: 0,
        end: 10,
        completed: [{ start: 0, end: 10 }],
      });
      const pool = makePool(() => healthyTab());
      const result = await runRenderJob(
        { url: 'http://localhost:3000', start: 0, end: 10, outDir, concurrency: 1 },
        () => Promise.resolve(pool.launcher),
      );
      expect(result.framesResumed).toBe(0);
      expect(result.framesRendered).toBe(10);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('ignores a corrupt manifest file and overwrites it with a valid one', async () => {
    const outDir = await makeOutDir();
    try {
      await writeFile(join(outDir, DEFAULT_MANIFEST_FILENAME), 'not json at all');
      const pool = makePool(() => healthyTab());
      const result = await runRenderJob(
        { url: 'http://localhost:3000', start: 0, end: 4, outDir, concurrency: 1 },
        () => Promise.resolve(pool.launcher),
      );
      expect(result.framesRendered).toBe(4);
      const manifest = await readManifest(outDir);
      expect(manifest?.completed).toEqual([{ start: 0, end: 4 }]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('renders every frame again with resume: false', async () => {
    const outDir = await makeOutDir();
    try {
      await writeRenderManifest(join(outDir, DEFAULT_MANIFEST_FILENAME), {
        version: MANIFEST_VERSION,
        url: 'http://localhost:3000',
        start: 0,
        end: 4,
        completed: [{ start: 0, end: 4 }],
      });
      const pool = makePool(() => healthyTab());
      const result = await runRenderJob(
        { url: 'http://localhost:3000', start: 0, end: 4, outDir, concurrency: 1, resume: false },
        () => Promise.resolve(pool.launcher),
      );
      expect(result.framesResumed).toBe(0);
      expect(result.framesRendered).toBe(4);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('launches no browser at all when the manifest covers every chunk', async () => {
    const outDir = await makeOutDir();
    try {
      await writeRenderManifest(join(outDir, DEFAULT_MANIFEST_FILENAME), {
        version: MANIFEST_VERSION,
        url: 'http://localhost:3000',
        start: 0,
        end: 4,
        completed: [{ start: 0, end: 4 }],
      });
      const pool = makePool(() => healthyTab());
      const result = await runRenderJob(
        { url: 'http://localhost:3000', start: 0, end: 4, outDir, concurrency: 1 },
        () => Promise.resolve(pool.launcher),
      );
      expect(pool.launches()).toBe(0);
      expect(result.framesRendered).toBe(0);
      expect(result.framesResumed).toBe(4);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe('runRenderJob — cancellation via AbortSignal [BF-024]', () => {
  it('stops the in-flight chunk, records the partial range and rejects with RenderJobAbortedError', async () => {
    const outDir = await makeOutDir();
    try {
      const controller = new AbortController();
      const pool = makePool(() => {
        const tab = healthyTab();
        const gotoFrame = tab.gotoFrame;
        // Frame 5 stalls long enough for the abort to close the tab.
        tab.gotoFrame = async (frame: number) => {
          if (frame === 5) {
            await delay(25);
            if (tab.closed || controller.signal.aborted) throw new Error('interrupted');
          }
          await gotoFrame(frame);
        };
        return tab;
      });

      const job = runRenderJob(
        {
          url: 'http://localhost:3000',
          start: 0,
          end: 10,
          outDir,
          concurrency: 1,
          chunkSize: 10,
          signal: controller.signal,
        },
        () => Promise.resolve(pool.launcher),
      );
      await delay(5);
      controller.abort();

      const error = typedError(await job.then(
        () => {
          throw new Error('expected the job to reject');
        },
        (rejection: unknown) => rejection,
      ));
      expect(error.name).toBe('RenderJobAbortedError');
      expect(error).toBeInstanceOf(RenderJobAbortedError);
      expect((error as RenderJobAbortedError).framesDone).toBe(5);
      expect((error as RenderJobAbortedError).framesTotal).toBe(10);
      expect(error.message).toContain('rerun the same render to resume');

      // No chunk beyond the interrupted one was ever claimed.
      expect(pool.tabs[0]?.seeks).toEqual([0, 1, 2, 3, 4]);
      const manifest = await readManifest(outDir);
      expect(manifest?.completed).toEqual([{ start: 0, end: 5 }]);
      // The launcher was shut down.
      expect(pool.closes()).toBe(1);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('stops scheduling later chunks after an abort', async () => {
    const outDir = await makeOutDir();
    try {
      const controller = new AbortController();
      const pool = makePool(() => {
        const tab = healthyTab();
        const gotoFrame = tab.gotoFrame;
        tab.gotoFrame = async (frame: number) => {
          if (frame === 1) {
            await delay(25);
            if (tab.closed || controller.signal.aborted) throw new Error('interrupted');
          }
          await gotoFrame(frame);
        };
        return tab;
      });

      const job = runRenderJob(
        {
          url: 'http://localhost:3000',
          start: 0,
          end: 10,
          outDir,
          concurrency: 1,
          chunkSize: 2,
          signal: controller.signal,
        },
        () => Promise.resolve(pool.launcher),
      );
      await delay(5);
      controller.abort();

      await job.then(
        () => {
          throw new Error('expected the job to reject');
        },
        (rejection: unknown) => {
          expect(rejection).toBeInstanceOf(RenderJobAbortedError);
        },
      );
      // Only the first chunk was started; chunks [2,10) were never seeked.
      expect(pool.tabs[0]?.seeks.every((frame) => frame < 2)).toBe(true);
      expect(pool.tabs[0]?.seeks).not.toContain(2);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('rejects immediately without launching a browser when the signal is already aborted', async () => {
    const outDir = await makeOutDir();
    try {
      const pool = makePool(() => healthyTab());
      const controller = new AbortController();
      controller.abort();
      await expect(
        runRenderJob(
          {
            url: 'http://localhost:3000',
            start: 0,
            end: 4,
            outDir,
            signal: controller.signal,
          },
          () => Promise.resolve(pool.launcher),
        ),
      ).rejects.toBeInstanceOf(RenderJobAbortedError);
      expect(pool.launches()).toBe(0);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe('runRenderJob — chunk failure + retry', () => {
  it('records the partial range and retries the chunk from the completed offset on a fresh tab', async () => {
    const outDir = await makeOutDir();
    try {
      const pool = makePool((launch: number) => {
        if (launch === 0) {
          const tab = healthyTab();
          const gotoFrame = tab.gotoFrame;
          tab.gotoFrame = async (frame: number) => {
            if (frame === 2) throw new Error(`boom at ${frame}`);
            await gotoFrame(frame);
          };
          return tab;
        }
        return healthyTab();
      });

      const result = await runRenderJob(
        {
          url: 'http://localhost:3000',
          start: 0,
          end: 10,
          outDir,
          concurrency: 1,
          chunkSize: 4,
        },
        () => Promise.resolve(pool.launcher),
      );

      // Launch 0 failed at frame 2 of chunk [0,4); launch 1 (the recycle)
      // retried from frame 2 and completed the rest of the render.
      expect(pool.launches()).toBe(2);
      expect(result.framesRendered).toBe(10);
      expect(pool.tabs[1]?.seeks).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
      const manifest = await readManifest(outDir);
      expect(manifest?.completed).toEqual([{ start: 0, end: 10 }]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('surfaces one aggregate error (with cause) when the retry fails again', async () => {
    const outDir = await makeOutDir();
    try {
      const pool = makePool(() => {
        const tab = healthyTab();
        const gotoFrame = tab.gotoFrame;
        tab.gotoFrame = async (frame: number) => {
          if (frame === 2) throw new Error(`boom at ${frame}`);
          await gotoFrame(frame);
        };
        return tab;
      });

      const error = typedError(await runRenderJob(
        {
          url: 'http://localhost:3000',
          start: 0,
          end: 10,
          outDir,
          concurrency: 1,
          chunkSize: 4,
        },
        () => Promise.resolve(pool.launcher),
      ).then(
        () => {
          throw new Error('expected the job to reject');
        },
        (rejection: unknown) => rejection,
      ));

      expect(error.message).toContain('runRenderJob: 1 of 3 chunk(s) failed');
      expect(error.message).toContain('boom at 2');
      expect((error as { cause?: unknown }).cause).toBeInstanceOf(Error);
      // The partial range [0,2) stays recorded for a resume.
      const manifest = await readManifest(outDir);
      expect(manifest?.completed).toEqual([{ start: 0, end: 2 }]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe('runRenderJob — validation', () => {
  const launcherFactory: LauncherFn = () => Promise.resolve(makePool(() => healthyTab()).launcher);

  it('rejects an empty url', async () => {
    const outDir = await makeOutDir();
    try {
      await expect(
        runRenderJob({ url: '', start: 0, end: 2, outDir }, launcherFactory),
      ).rejects.toThrow(RangeError);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('rejects invalid ranges, concurrency, outDir and chunkSize', async () => {
    const outDir = await makeOutDir();
    try {
      await expect(
        runRenderJob({ url: 'http://x', start: 0, end: 0, outDir }, launcherFactory),
      ).rejects.toThrow(RangeError);
      await expect(
        runRenderJob({ url: 'http://x', start: -1, end: 2, outDir }, launcherFactory),
      ).rejects.toThrow(RangeError);
      await expect(
        runRenderJob(
          { url: 'http://x', start: 0, end: 2, outDir, concurrency: 0 },
          launcherFactory,
        ),
      ).rejects.toThrow(RangeError);
      await expect(
        runRenderJob({ url: 'http://x', start: 0, end: 2, outDir: '' }, launcherFactory),
      ).rejects.toThrow(RangeError);
      await expect(
        runRenderJob(
          { url: 'http://x', start: 0, end: 2, outDir, chunkSize: 0 },
          launcherFactory,
        ),
      ).rejects.toThrow(RangeError);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe('render manifest helpers [BF-024]', () => {
  it('readRenderManifest returns null for missing files', async () => {
    const outDir = await makeOutDir();
    try {
      expect(await readRenderManifest(join(outDir, 'absent.json'))).toBeNull();
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('readRenderManifest normalizes, clamps and merges completed ranges', async () => {
    const outDir = await makeOutDir();
    try {
      const manifestPath = join(outDir, DEFAULT_MANIFEST_FILENAME);
      await writeFile(
        manifestPath,
        JSON.stringify({
          version: MANIFEST_VERSION,
          url: 'http://localhost:3000',
          start: 0,
          end: 10,
          completed: [
            { start: 6, end: 20 },
            { start: 0, end: 4 },
            { start: 4, end: 5 },
          ],
        }),
      );
      const manifest = await readRenderManifest(manifestPath);
      expect(manifest?.completed).toEqual([
        { start: 0, end: 5 },
        { start: 6, end: 10 },
      ]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('readRenderManifest rejects malformed structures', async () => {
    const outDir = await makeOutDir();
    try {
      const manifestPath = join(outDir, DEFAULT_MANIFEST_FILENAME);
      await writeFile(manifestPath, JSON.stringify({ version: 99, url: 'http://x', start: 0, end: 4, completed: [] }));
      expect(await readRenderManifest(manifestPath)).toBeNull();
      await writeFile(manifestPath, JSON.stringify({ version: MANIFEST_VERSION, url: 'http://x', start: 0, end: 4, completed: [{ start: 'x', end: 2 }] }));
      expect(await readRenderManifest(manifestPath)).toBeNull();
      await writeFile(manifestPath, '"a string"');
      expect(await readRenderManifest(manifestPath)).toBeNull();
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('writeRenderManifest round-trips through readRenderManifest', async () => {
    const outDir = await makeOutDir();
    try {
      const manifestPath = join(outDir, DEFAULT_MANIFEST_FILENAME);
      const manifest = {
        version: MANIFEST_VERSION,
        url: 'http://localhost:3000',
        start: 0,
        end: 4,
        completed: [{ start: 0, end: 4 }],
      };
      await writeRenderManifest(manifestPath, manifest);
      expect(await readRenderManifest(manifestPath)).toEqual(manifest);
      const files = await readdir(outDir);
      expect(files.every((file) => !file.includes('.tmp'))).toBe(true);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
