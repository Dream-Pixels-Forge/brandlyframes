import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoHoldFrame } from '../../src/utils/auto-hold';
import { clearFrameHolds, getActiveHolds } from '../../src/runtime/holds';

describe('autoHoldFrame (BF-423)', () => {
  beforeEach(() => {
    clearFrameHolds();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('releases the hold when acquire resolves', async () => {
    let resolve!: () => void;
    const acquire = vi.fn(() => new Promise<void>((res) => (resolve = res)));
    autoHoldFrame('asset-a', acquire);

    expect(getActiveHolds()).toHaveLength(1);
    expect(getActiveHolds()[0].name).toBe('asset-a');

    resolve();
    // Flush the `.then()` microtask that releases the hold.
    await Promise.resolve();

    expect(getActiveHolds()).toHaveLength(0);
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it('releases the hold when acquire rejects (hold not leaked)', async () => {
    const error = new Error('404 not found');
    const acquire = vi.fn(() => Promise.reject(error));
    autoHoldFrame('asset-b', acquire);

    expect(getActiveHolds()).toHaveLength(1);
    await Promise.resolve();
    expect(getActiveHolds()).toHaveLength(0);
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it('auto-expires at the hold timeout without leaking', () => {
    const acquire = () => new Promise<void>(() => {
      // never settles — the hold's own timeout is the safety net
    });
    autoHoldFrame('slow-asset', acquire, { timeoutInMilliseconds: 500 });

    expect(getActiveHolds()).toHaveLength(1);
    vi.advanceTimersByTime(499);
    expect(getActiveHolds()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getActiveHolds()).toHaveLength(0);
  });

  it('names the hold so getActiveHolds reports it while pending', () => {
    const acquire = () => new Promise<void>(() => {});
    autoHoldFrame('img "hero.png"', acquire, { timeoutInMilliseconds: 5_000 });

    const active = getActiveHolds();
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('img "hero.png"');
    expect(active[0].timeoutInMilliseconds).toBe(5_000);
  });

  it('still releases the hold and rethrows when acquire throws synchronously', () => {
    const error = new Error('disk gone');
    const acquire = vi.fn(() => {
      throw error;
    });

    expect(() => autoHoldFrame('failing-asset', acquire)).toThrow(error);
    expect(getActiveHolds()).toHaveLength(0);
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it('does not double-release when acquire settles after the hold already expired', async () => {
    let resolve!: () => void;
    const acquire = vi.fn(() => new Promise<void>((res) => (resolve = res)));
    autoHoldFrame('asset-c', acquire, { timeoutInMilliseconds: 100 });

    vi.advanceTimersByTime(100); // hold auto-expired
    expect(getActiveHolds()).toHaveLength(0);

    resolve();
    await Promise.resolve(); // settle would try to release an expired handle — ignored
    expect(getActiveHolds()).toHaveLength(0);
  });
});
