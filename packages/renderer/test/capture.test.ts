/**
 * RED phase — capture.ts [BF-020]
 *
 * Headless-Chromium frame capture + parallel-tab pool + frame-range
 * chunking. The browser launcher is injectable (LauncherFn) so tests
 * exercise arg construction and chunking without launching Chrome.
 */

import { describe, it, expect, vi } from 'vitest';
import { captureFrame, splitFrameRange, captureChunk, DEFAULT_CHROME_FLAGS } from '../src/capture';
import type { BrowserLauncherLike } from '../src/capture';

/** A fake launcher: each launched tab returns a deterministic PNG payload. */
const makeFakeLauncher = (payload = new Uint8Array([137, 80, 78, 71])): BrowserLauncherLike => ({
  launchTab: async (url: string, flags: string[]) => {
    void flags;
    return {
      url,
      gotoFrame: async (frame: number): Promise<void> => {
        if (frame < 0) throw new Error('frame out of range');
      },
      screenshotPng: async (): Promise<Uint8Array> => payload,
      close: async (): Promise<void> => {
        /* fake */
      },
    };
  },
  close: async (): Promise<void> => {
    /* fake */
  },
});

describe('DEFAULT_CHROME_FLAGS', () => {
  it('includes headless + no-sandbox + deterministic rendering flags', () => {
    expect(DEFAULT_CHROME_FLAGS).toContain('--headless=new');
    expect(DEFAULT_CHROME_FLAGS).toContain('--no-sandbox');
    expect(DEFAULT_CHROME_FLAGS).toContain('--disable-gpu');
  });
});

describe('splitFrameRange', () => {
  it('splits [0, 10) into chunks of 4', () => {
    expect(splitFrameRange(0, 10, 4)).toEqual([
      { start: 0, end: 4 },
      { start: 4, end: 8 },
      { start: 8, end: 10 },
    ]);
  });

  it('returns a single range when frames fit in one chunk', () => {
    expect(splitFrameRange(5, 8, 10)).toEqual([{ start: 5, end: 8 }]);
  });

  it('rejects invalid ranges', () => {
    expect(() => splitFrameRange(8, 8, 4)).toThrow(/empty/i);
    expect(() => splitFrameRange(10, 5, 4)).toThrow(/empty/i);
    expect(() => splitFrameRange(0, 10, 0)).toThrow(/chunk/i);
  });
});

describe('captureFrame', () => {
  it('opens a tab, seeks the frame, returns PNG bytes', async () => {
    const png = await captureFrame(
      { url: 'http://localhost:3000', frame: 42, width: 1920, height: 1080 },
      async () => makeFakeLauncher(),
    );
    expect(png[0]).toBe(137);
    expect(png[1]).toBe(80);
  });

  it('fails fast with a frame-indexed error for out-of-range frames', async () => {
    await expect(
      captureFrame({ url: 'http://localhost:3000', frame: -1 }, async () => makeFakeLauncher()),
    ).rejects.toThrow(/frame/i);
  });
});

describe('captureChunk', () => {
  it('captures every frame in the range in order', async () => {
    const spy = vi.fn();
    const pngs = await captureChunk(
      { url: 'http://localhost:3000', start: 0, end: 3, width: 640, height: 480 },
      async () => makeFakeLauncher(),
    );
    expect(spy).not.toHaveBeenCalled();
    expect(pngs).toHaveLength(3);
    for (const png of pngs) expect(png[0]).toBe(137);
  });
});
