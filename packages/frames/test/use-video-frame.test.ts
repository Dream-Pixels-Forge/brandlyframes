import { describe, it, expect, vi } from 'vitest';
import {
  mountVideoFrameEffect,
  planPrefetchFrames,
  type VideoFrameLoader,
} from '../src/index';

/**
 * useVideoFrame pixel access + prefetch [BF-058].
 *
 * Framework-free core (`mountVideoFrameEffect`) mirrors the `mountFontEffect`
 * precedent: hold → load → release, testable in Node with injected
 * loader/hold/release. `planPrefetchFrames` is the pure N-ahead planner.
 */

const frame = (sourceFrame: number) => ({
  src: 'clip://mock',
  sourceFrame,
  width: 1920,
  height: 1080,
  bitmap: { mock: `bitmap-${sourceFrame}` },
});

describe('planPrefetchFrames [BF-058]', () => {
  it('returns the next N frames ahead, clamped to length', () => {
    expect(planPrefetchFrames(0, 10, 3)).toEqual([1, 2, 3]);
    expect(planPrefetchFrames(8, 10, 3)).toEqual([9]);
    expect(planPrefetchFrames(9, 10, 3)).toEqual([]);
  });

  it('returns empty for ahead=0', () => {
    expect(planPrefetchFrames(5, 10, 0)).toEqual([]);
  });

  it('skips cached frames (backpressure: never re-request hot frames)', () => {
    const isCached = (f: number): boolean => f === 2;
    expect(planPrefetchFrames(0, 10, 3, isCached)).toEqual([1, 3]);
  });

  it('throws for invalid current/length/ahead', () => {
    expect(() => planPrefetchFrames(-1, 10, 2)).toThrow();
    expect(() => planPrefetchFrames(0, 0, 2)).toThrow();
    expect(() => planPrefetchFrames(0, 10, -1)).toThrow();
    expect(() => planPrefetchFrames(1.5, 10, 2)).toThrow();
  });
});

describe('mountVideoFrameEffect [BF-058]', () => {
  it('holds before load, delivers the frame, releases on success', async () => {
    const order: string[] = [];
    const loader: VideoFrameLoader = async (_src, f) => {
      order.push('load');
      return frame(f);
    };
    const hold = vi.fn(() => {
      order.push('hold');
      return 1;
    });
    const release = vi.fn(() => {
      order.push('release');
    });
    const onReady = vi.fn();

    mountVideoFrameEffect('clip://mock', 7, { loader, hold, release, onReady });
    expect(hold).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0]?.[0]).toMatchObject({ sourceFrame: 7 });
    expect(release).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['hold', 'load', 'release']);
  });

  it('releases and reports errors without hanging the frame', async () => {
    const loader: VideoFrameLoader = async () => {
      throw new Error('decode failed: unsupported codec');
    };
    const hold = vi.fn(() => 1);
    const release = vi.fn();
    const onError = vi.fn();

    mountVideoFrameEffect('clip://mock', 3, { loader, hold, release, onError });
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(String(onError.mock.calls[0]?.[0])).toContain('unsupported codec');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('cleanup releases the hold and suppresses late callbacks', async () => {
    let resolveLoad!: (v: ReturnType<typeof frame>) => void;
    const loader: VideoFrameLoader = () =>
      new Promise((resolve) => {
        resolveLoad = resolve;
      });
    const hold = vi.fn(() => 1);
    const release = vi.fn();
    const onReady = vi.fn();
    const onError = vi.fn();

    const cleanup = mountVideoFrameEffect('clip://mock', 5, {
      loader,
      hold,
      release,
      onReady,
      onError,
    });
    cleanup();
    expect(release).toHaveBeenCalledTimes(1);
    resolveLoad(frame(5));
    await Promise.resolve();
    await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    // Late settle must not release twice.
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('throws synchronously for invalid src/sourceFrame/loader (never leaks a hold)', () => {
    const hold = vi.fn(() => 1);
    const release = vi.fn();
    const loader: VideoFrameLoader = async (_s, f) => frame(f);
    expect(() => mountVideoFrameEffect('', 0, { loader, hold, release })).toThrow();
    expect(() => mountVideoFrameEffect('clip://mock', -1, { loader, hold, release })).toThrow();
    expect(() =>
      mountVideoFrameEffect('clip://mock', 0, {
        loader: undefined as unknown as VideoFrameLoader,
        hold,
        release,
      }),
    ).toThrow();
    expect(hold).not.toHaveBeenCalled();
  });
});
