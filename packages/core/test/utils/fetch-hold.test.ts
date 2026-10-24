import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAutoHold } from '../../src/utils/fetch-hold';
import { clearFrameHolds, getActiveHolds } from '../../src/runtime/holds';

describe('fetchAutoHold (BF-423)', () => {
  beforeEach(() => {
    clearFrameHolds();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('releases the hold when fetch resolves', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

    const promise = fetchAutoHold('https://example.com/asset.mp4');
    expect(getActiveHolds()).toHaveLength(1);

    await promise;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getActiveHolds()).toHaveLength(0);
  });

  it('releases the hold when fetch rejects and still propagates the error', async () => {
    const error = new Error('404 not found');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(error);

    await expect(fetchAutoHold('https://example.com/missing.mp4')).rejects.toThrow(error);
    expect(getActiveHolds()).toHaveLength(0);
  });

  it('names the hold `fetch <url>` so getActiveHolds reports it while pending', () => {
    let resolve!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>((res) => (resolve = res)),
    );

    fetchAutoHold('https://example.com/asset.mp4');

    const active = getActiveHolds();
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('fetch https://example.com/asset.mp4');

    resolve(new Response('ok'));
    return Promise.resolve().then(() => {
      expect(getActiveHolds()).toHaveLength(0);
    });
  });

  it('auto-expires at the holdFrame timeout without leaking the hold', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

    fetchAutoHold('https://example.com/slow.mp4', { timeoutInMilliseconds: 100 });

    expect(getActiveHolds()).toHaveLength(1);
    vi.advanceTimersByTime(99);
    expect(getActiveHolds()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getActiveHolds()).toHaveLength(0);
  });

  it('releases the hold and rethrows when fetch throws synchronously', () => {
    const error = new Error('invalid url');
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw error;
    });

    expect(() => fetchAutoHold('https://example.com/asset.mp4')).toThrow(error);
    expect(getActiveHolds()).toHaveLength(0);
  });
});
