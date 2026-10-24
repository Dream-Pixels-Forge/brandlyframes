/**
 * capture.ts [BF-422] — automatic retry with lower concurrency on OOM.
 *
 * When the captureParallel pool drains with failures, the failed chunks are
 * retried once at `Math.max(1, Math.floor(concurrency / 2))` before the
 * aggregated error is surfaced. The browser launcher is injected (fake tabs,
 * no real Chrome).
 */

import { describe, it, expect } from 'vitest';
import { captureParallel } from '../src/capture';
import type { BrowserLauncherLike, BrowserTabLike } from '../src/capture';

interface FakeTab extends BrowserTabLike {
  readonly seeks: number[];
  closed: boolean;
  gotoFrame: (frame: number) => Promise<void>;
  screenshotPng: () => Promise<Uint8Array>;
  close: () => Promise<void>;
}

/** Builds a fake launcher whose tabs fail according to `onGotoFrame`. */
const makeLauncher = (
  onGotoFrame: (frame: number, tabIndex: number) => Promise<void>,
): { launcher: BrowserLauncherLike; tabLaunches: () => number } => {
  let tabIndex = 0;
  let tabLaunches = 0;
  const launcher: BrowserLauncherLike = {
    launchTab: async (_url, _flags) => {
      void _flags;
      tabLaunches += 1;
      const index = tabIndex++;
      const tab: FakeTab = {
        url: 'http://localhost:3000',
        seeks: [],
        closed: false,
        gotoFrame: async (frame: number) => {
          await onGotoFrame(frame, index);
          tab.seeks.push(frame);
        },
        screenshotPng: async (): Promise<Uint8Array> =>
          new Uint8Array([tab.seeks[tab.seeks.length - 1] ?? 0]),
        close: async () => {
          tab.closed = true;
        },
      };
      return tab;
    },
    close: async () => {
      /* fake browser close */
    },
  };
  return { launcher, tabLaunches: () => tabLaunches };
};

describe('captureParallel OOM retry (BF-422)', () => {
  it('retries failed chunks once at lower concurrency and recovers', async () => {
    // Fail the first 4 tab launches (primary: 2 initial + 2 recycle), succeed
    // from launch 5 onward (retry at concurrency 1, fresh tabs).
    const { launcher, tabLaunches } = makeLauncher(async () => {
      if (tabLaunches() <= 4) throw new Error(`OOM at launch ${tabLaunches()}`);
    });

    const pngs = await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 4, chunkSize: 2, concurrency: 2 },
      async () => launcher,
    );
    expect(pngs.map((png) => png[0])).toEqual([0, 1, 2, 3]);
    // Primary: 4 launches (both chunks fail after recycle). Retry: 2 launches
    // at concurrency 1 (one fresh tab per failed chunk).
    expect(tabLaunches()).toBe(6);
  });

  it('surfaces the original aggregated error when the retry also fails', async () => {
    // Every launch fails.
    const { launcher } = makeLauncher(async () => {
      throw new Error('boom');
    });

    const error = await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 4, chunkSize: 2, concurrency: 2 },
      async () => launcher,
    ).then(() => undefined, (e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    const err = error as Error & { cause?: unknown };
    expect(err.message).toMatch(/captureParallel.*2 of 2 chunk/i);
    // Cause chain: original first failure, wrapped by captureFramesOnTab.
    expect(err.cause).toBeInstanceOf(Error);
    const cause = err.cause as Error & { cause?: unknown };
    expect(cause!.message).toMatch(/frame 0/);
    expect((cause as Error & { cause?: unknown }).cause!.message).toBe('boom');
  });

  it('keeps retry concurrency at a minimum of 1', async () => {
    // Every launch fails; concurrency 1, retry at max(1, floor(1/2)) = 1.
    const { launcher } = makeLauncher(async () => {
      throw new Error('boom');
    });

    const error = await captureParallel(
      { url: 'http://localhost:3000', start: 0, end: 4, chunkSize: 2, concurrency: 1 },
      async () => launcher,
    ).then(() => undefined, (e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    const err = error as Error & { cause?: unknown };
    expect(err.message).toMatch(/captureParallel.*2 of 2 chunk/i);
    expect(err.cause).toBeInstanceOf(Error);
  });
});
