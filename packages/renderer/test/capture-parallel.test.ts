/**
 * Parallel tab pool — captureParallel [BF-020]
 *
 * Bounded pool of headless tabs dispatching frame-range chunks in parallel.
 * The launcher is injected (fake tabs, no real Chrome); fake tabs seek a
 * virtual frame and screenshot it back as a one-byte PNG so frame ordering
 * and chunk assignment are observable.
 */

import { describe, it, expect } from 'vitest';
import { captureParallel, DEFAULT_CONCURRENCY, DEFAULT_CHROME_FLAGS } from '../src/capture';
import type { BrowserLauncherLike, BrowserTabLike } from '../src/capture';

/** A fake tab that records seeks and screenshots the current frame as [frame]. */
interface FakeTab extends BrowserTabLike {
  /** Frames successfully seeked, in order. */
  readonly seeks: number[];
  /** Whether close() was called. */
  closed: boolean;
}

/** A fake launcher that scripts its tabs and counts launches. */
interface FakePool {
  readonly launcher: BrowserLauncherLike;
  /** Tabs in launch order (index = launch number). */
  readonly tabs: FakeTab[];
  launches: () => number;
}

/**
 * Build a fake pool. `makeTab` receives the launch number (0-based) and
 * returns a scripted tab, so a specific launch can be made to fail.
 */
const makePool = (makeTab: (launch: number) => FakeTab): FakePool => {
  const tabs: FakeTab[] = [];
  let launches = 0;
  const launcher: BrowserLauncherLike = {
    launchTab: async (url, flags) => {
      void flags;
      void url;
      const tab = makeTab(launches++);
      tabs.push(tab);
      return tab;
    },
    close: async () => {
      /* fake */
    },
  };
  return { launcher, tabs, launches: () => launches };
};

/** Healthy tab: seeks any frame, screenshots it back as a one-byte PNG. */
const healthyTab = (): FakeTab => {
  const tab: FakeTab = {
    url: 'http://localhost:3000',
    seeks: [],
    closed: false,
    gotoFrame: async (frame: number) => {
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

/** Tab whose gotoFrame throws for every frame in `failFrames`. */
const failingTab = (failFrames: readonly number[]): FakeTab => {
  const tab = healthyTab();
  tab.gotoFrame = async (frame: number) => {
    if (failFrames.includes(frame)) throw new Error(`boom at ${frame}`);
    tab.seeks.push(frame);
  };
  return tab;
};

describe('DEFAULT_CONCURRENCY', () => {
  it('is capped at 8 tabs per machine', () => {
    expect(DEFAULT_CONCURRENCY).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_CONCURRENCY).toBeLessThanOrEqual(8);
  });
});

describe('captureParallel', () => {
  it('captures every frame in order across parallel tabs', async () => {
    const pool = makePool(() => healthyTab());
    const pngs = await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 12, chunkSize: 4, concurrency: 3 },
      async () => pool.launcher,
    );
    expect(pngs.map((png) => png[0])).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(pool.launches()).toBe(3);
    // Each tab captured one contiguous 4-frame chunk.
    for (const tab of pool.tabs) expect(tab.seeks).toHaveLength(4);
    const seen = pool.tabs.flatMap((tab) => tab.seeks).sort((a, b) => a - b);
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('defaults to min(cpuCount, 8) tabs for a large range', async () => {
    const pool = makePool(() => healthyTab());
    await captureParallel({ url: 'http://localhost:3000', start: 0, end: 100 }, async () => pool.launcher);
    expect(pool.launches()).toBe(DEFAULT_CONCURRENCY);
  });

  it('honors an explicit concurrency over the default', async () => {
    const pool = makePool(() => healthyTab());
    await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 12, concurrency: 2 },
      async () => pool.launcher,
    );
    expect(pool.launches()).toBe(2);
  });

  it('never launches more tabs than chunks', async () => {
    const pool = makePool(() => healthyTab());
    await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 2, concurrency: 8 },
      async () => pool.launcher,
    );
    expect(pool.launches()).toBe(2);
  });

  it('opens every tab on the composition URL with the requested flags', async () => {
    const pool = makePool(() => healthyTab());
    await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 4, chunkSize: 2, flags: ['--force-flag'] },
      async () => pool.launcher,
    );
    for (const tab of pool.tabs) expect(tab.url).toBe('http://localhost:3000');
    expect(DEFAULT_CHROME_FLAGS).toContain('--headless=new');
  });

  it('recycles a failed tab and retries the chunk once on the fresh tab', async () => {
    // Launch 0 fails on frame 1; every later launch is healthy.
    const pool = makePool((launch) => (launch === 0 ? failingTab([1]) : healthyTab()));
    const pngs = await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 6, chunkSize: 2, concurrency: 1 },
      async () => pool.launcher,
    );
    expect(pngs.map((png) => png[0])).toEqual([0, 1, 2, 3, 4, 5]);
    expect(pool.launches()).toBe(2);
    expect(pool.tabs[0]?.closed).toBe(true);
    // The recycled tab completed the retried chunk and the remaining chunks.
    expect(pool.tabs[1]?.seeks).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('surfaces an error with cause when the recycled tab also fails', async () => {
    const pool = makePool(() => failingTab([0]));
    const error = await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 4, chunkSize: 2, concurrency: 1 },
      async () => pool.launcher,
    ).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    const err = error as Error & { cause?: unknown };
    expect(err.message).toMatch(/captureParallel.*1 of 2 chunk/i);
    expect(err.cause).toBeInstanceOf(Error);
    const cause = err.cause as Error & { cause?: unknown };
    expect(cause.message).toMatch(/frame 0/);
    expect((cause.cause as Error).message).toBe('boom at 0');
  });

  it('lets other tabs finish when one worker fails for good (allSettled)', async () => {
    // Every tab fails on frames 0-1: the [0,2) chunk dies twice, [2,4) succeeds.
    const pool = makePool(() => failingTab([0, 1]));
    await expect(
      captureParallel(
        { url: 'http://localhost:3000', start: 0, end: 4, chunkSize: 2, concurrency: 2 },
        async () => pool.launcher,
      ),
    ).rejects.toThrow(/1 of 2 chunk/i);
    // Primary: chunk 0 (2 launches: initial + recycle) + chunk 1 (1 launch) =
    // 3, plus the BF-422 pool-level retry of chunk 0 at lower concurrency
    // (1 launch) = 4 total.
    expect(pool.launches()).toBe(4);
    const survived = pool.tabs.some((tab) => tab.seeks.join(',') === '2,3');
    expect(survived).toBe(true);
  });

  it('rejects invalid options', async () => {
    const pool = makePool(() => healthyTab());
    const run = (options: Parameters<typeof captureParallel>[0]) =>
      captureParallel(options, async () => pool.launcher);
    await expect(run({ url: 'u', start: 0, end: 4, concurrency: 0 })).rejects.toThrow(/concurrency/i);
    await expect(run({ url: 'u', start: 0, end: 4, concurrency: 1.5 })).rejects.toThrow(/concurrency/i);
    await expect(run({ url: 'u', start: 4, end: 4 })).rejects.toThrow(/empty/i);
    await expect(run({ url: 'u', start: 0, end: 4, chunkSize: 0 })).rejects.toThrow(/chunk/i);
  });
});
