/**
 * RED phase — capture.ts [BF-422]
 *
 * Streaming capture + memory budget. The browser launcher is injected
 * (fake tabs, no real Chrome): onFrame hands every frame to a sink and
 * the returned array stays empty; maxFramesInMemory bounds frames held
 * in memory when no sink is provided.
 */

import { describe, it, expect } from 'vitest';
import { captureChunk, captureParallel } from '../src/capture';
import type { BrowserLauncherLike, BrowserTabLike } from '../src/capture';

interface FakeTab extends BrowserTabLike {
  /** Frames successfully seeked, in order. */
  readonly seeks: number[];
  /** Whether close() was called. */
  closed: boolean;
}

interface FakePool {
  readonly launcher: BrowserLauncherLike;
  /** Tabs in launch order (index = launch number). */
  readonly tabs: FakeTab[];
  launches: () => number;
}

const makePool = (): FakePool => {
  const tabs: FakeTab[] = [];
  let launches = 0;
  const launcher: BrowserLauncherLike = {
    launchTab: async (url, flags) => {
      void flags;
      const tab: FakeTab = {
        url,
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
      tabs.push(tab);
      launches += 1;
      return tab;
    },
    close: async () => {
      /* fake */
    },
  };
  return { launcher, tabs, launches: () => launches };
};

describe('captureChunk streaming (onFrame)', () => {
  it('hands every frame to onFrame and returns an empty array', async () => {
    const { launcher } = makePool();
    const frames: number[] = [];
    const payloads: Uint8Array[] = [];
    const pngs = await captureChunk(
      {
        url: 'http://localhost:3000',
        start: 0,
        end: 5,
        onFrame: (frame, png) => {
          frames.push(frame);
          payloads.push(png);
        },
      },
      async () => launcher,
    );
    expect(pngs).toEqual([]);
    expect(frames).toEqual([0, 1, 2, 3, 4]);
    expect(payloads.map((png) => png[0])).toEqual([0, 1, 2, 3, 4]);
    for (const png of payloads) expect(png).toBeInstanceOf(Uint8Array);
  });
});

describe('captureParallel streaming (onFrame)', () => {
  it('streams every frame to onFrame across parallel tabs and returns an empty array', async () => {
    const { launcher, tabs } = makePool();
    const frames: number[] = [];
    const pngs = await captureParallel(
      {
        url: 'http://localhost:3000',
        start: 0,
        end: 12,
        chunkSize: 4,
        concurrency: 3,
        onFrame: (frame) => {
          frames.push(frame);
        },
      },
      async () => launcher,
    );
    expect(pngs).toEqual([]);
    expect(frames.slice().sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    const seen = tabs.flatMap((tab) => tab.seeks).slice().sort((a, b) => a - b);
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(tabs).toHaveLength(3);
  });
});

describe('maxFramesInMemory', () => {
  it('captureChunk holds exactly N frames without throwing', async () => {
    const { launcher } = makePool();
    const pngs = await captureChunk(
      { url: 'http://localhost:3000', start: 0, end: 2, maxFramesInMemory: 2 },
      async () => launcher,
    );
    expect(pngs).toHaveLength(2);
  });

  it('captureChunk throws RangeError when more than N frames held without a sink', async () => {
    const { launcher } = makePool();
    await expect(
      captureChunk(
        { url: 'http://localhost:3000', start: 0, end: 5, maxFramesInMemory: 2 },
        async () => launcher,
      ),
    ).rejects.toThrow(RangeError);
  });

  it('captureParallel surfaces the memory-budget RangeError as a chunk failure', async () => {
    const { launcher } = makePool();
    const error = await captureParallel(
      {
        url: 'http://localhost:3000',
        start: 0,
        end: 6,
        chunkSize: 2, // 2 frames held per chunk > maxFramesInMemory
        concurrency: 1,
        maxFramesInMemory: 1,
      },
      async () => launcher,
    ).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error & { cause?: unknown }).message).toMatch(/memory budget/i);
    expect((error as Error & { cause?: unknown }).cause).toBeInstanceOf(RangeError);
  });

  it('maxFramesInMemory is not enforced when a streaming sink is provided', async () => {
    const { launcher } = makePool();
    const frames: number[] = [];
    const pngs = await captureParallel(
      {
        url: 'http://localhost:3000',
        start: 0,
        end: 10,
        maxFramesInMemory: 1,
        onFrame: (frame) => {
          frames.push(frame);
        },
      },
      async () => launcher,
    );
    expect(pngs).toEqual([]);
    expect(frames.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('non-streaming capture still accumulates every frame', async () => {
    const { launcher } = makePool();
    const pngs = await captureChunk({ url: 'http://localhost:3000', start: 0, end: 4 }, async () => launcher);
    expect(pngs).toHaveLength(4);
    expect(pngs.map((png) => png[0])).toEqual([0, 1, 2, 3]);
  });
});
