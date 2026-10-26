/**
 * Warm render server (BF-474): persistent pool interface + in-memory mock
 * with pre-launched workers, pre-loaded bundles, a priority queue and
 * autoscaling hooks. All timing is injectable — no real browsers.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  InMemoryWarmPool,
  WarmPoolDisposedError,
  type WarmWorker,
} from '../src/warm-pool';

describe('InMemoryWarmPool (BF-474)', () => {
  it('pre-launches minWarm idle workers with pre-loaded bundles', () => {
    const pool = new InMemoryWarmPool({ minWarm: 2, bundleId: 'bundle-1' });
    const stats = pool.stats();
    expect(stats.idle).toBe(2);
    expect(stats.busy).toBe(0);
    expect(stats.warm).toBe(2);
    const worker = pool.peekIdle();
    expect(worker?.bundleId).toBe('bundle-1');
  });

  it('acquire hands out a pre-warmed worker immediately; release returns it', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 1 });
    const worker = await pool.acquire();
    expect(worker.state).toBe('busy');
    expect(pool.stats().idle).toBe(0);
    pool.release(worker);
    expect(worker.state).toBe('idle');
    expect(pool.stats().idle).toBe(1);
  });

  it('serves higher priorities first from the queue', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 1, maxWarm: 1 });
    const busy = await pool.acquire();
    const order: string[] = [];
    const low = pool.acquire(1).then((w) => {
      order.push('low');
      return w;
    });
    const high = pool.acquire(10).then((w) => {
      order.push('high');
      return w;
    });
    await vi.waitFor(() => expect(pool.stats().queued).toBe(2));
    pool.release(busy);
    const highWorker = await high;
    expect(order).toEqual(['high']);
    pool.release(highWorker);
    await low;
    expect(order).toEqual(['high', 'low']);
  });

  it('serves same-priority waiters FIFO', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 1, maxWarm: 1 });
    const busy = await pool.acquire();
    const order: number[] = [];
    const first = pool.acquire(5).then((w) => {
      order.push(1);
      return w;
    });
    const second = pool.acquire(5).then((w) => {
      order.push(2);
      return w;
    });
    await vi.waitFor(() => expect(pool.stats().queued).toBe(2));
    pool.release(busy);
    const firstWorker = await first;
    expect(order).toEqual([1]);
    pool.release(firstWorker);
    await second;
    expect(order).toEqual([1, 2]);
  });

  it('queues when the pool is at maxWarm and all workers are busy', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 1, maxWarm: 1 });
    const w1 = await pool.acquire();
    let resolved = false;
    const pending = pool.acquire().then((w) => {
      resolved = true;
      return w;
    });
    expect(pool.stats().queued).toBe(1);
    await Promise.resolve();
    expect(resolved).toBe(false);
    pool.release(w1);
    const w2 = await pending;
    expect(resolved).toBe(true);
    expect(w2.id).toBe(w1.id);
  });

  it('scales up on demand and fires the autoscaling hook', async () => {
    const onScaleUp = vi.fn();
    const pool = new InMemoryWarmPool({ minWarm: 0, maxWarm: 3, hooks: { onScaleUp } });
    await pool.acquire(0);
    expect(onScaleUp).toHaveBeenCalledTimes(1);
    expect(pool.stats().warm).toBe(1);
  });

  it('never exceeds maxWarm', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 0, maxWarm: 2 });
    const a = await pool.acquire();
    const b = await pool.acquire();
    expect(pool.stats().warm).toBe(2);
    expect(pool.stats().queued).toBe(0);
    let thirdResolved = false;
    void pool.acquire().then((w) => {
      thirdResolved = true;
      return w;
    });
    await Promise.resolve();
    expect(thirdResolved).toBe(false);
    expect(pool.stats().queued).toBe(1);
    expect(pool.stats().warm).toBe(2);
    pool.release(a);
    pool.release(b);
  });

  it('scales down idle workers above minWarm and fires the hook', async () => {
    const onScaleDown = vi.fn();
    const pool = new InMemoryWarmPool({
      minWarm: 0,
      maxWarm: 2,
      hooks: { onScaleDown },
    });
    const a = await pool.acquire(0);
    const b = await pool.acquire(0);
    pool.release(a);
    pool.release(b);
    // Two idle workers, minWarm 0 → both scaled down.
    const downscaled = onScaleDown.mock.calls.flat() as string[][];
    expect(downscaled[0]!.length).toBeGreaterThan(0);
    expect(pool.stats().idle).toBe(0);
    for (const worker of [a, b]) {
      expect(worker.state).toBe('disposed');
    }
  });

  it('does not scale down to below minWarm', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 1, maxWarm: 2 });
    const a = await pool.acquire(0);
    const b = await pool.acquire(0);
    pool.release(a);
    pool.release(b);
    expect(pool.stats().idle).toBe(1);
  });

  it('stays in warming state until the injected launchFn resolves', async () => {
    let releaseLaunch: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseLaunch = resolve;
    });
    const pool = new InMemoryWarmPool({
      minWarm: 0,
      maxWarm: 1,
      launchFn: () => gate,
    });
    const pending = pool.acquire();
    await Promise.resolve();
    const warming = pool.stats();
    expect(warming.queued + warming.warm).toBeGreaterThan(0);
    releaseLaunch();
    const worker = await pending;
    expect(worker.state).toBe('busy');
  });

  it('preloads a bundle onto idle workers', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 1, bundleId: null });
    await pool.preloadBundle('comp-bundle-v2');
    expect(pool.peekIdle()?.bundleId).toBe('comp-bundle-v2');
  });

  it('dispose rejects queued waiters and disposes workers', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 1, maxWarm: 1 });
    const busy = await pool.acquire();
    const queued = pool.acquire();
    await pool.dispose();
    await expect(queued).rejects.toThrow(WarmPoolDisposedError);
    expect(busy.state).toBe('disposed');
    expect(pool.stats().warm).toBe(0);
    await expect(pool.acquire()).rejects.toThrow(WarmPoolDisposedError);
  });

  it('keeps worker ids unique across scale-ups', async () => {
    const pool = new InMemoryWarmPool({ minWarm: 0, maxWarm: 4 });
    const workers: WarmWorker[] = [];
    for (let i = 0; i < 3; i++) {
      workers.push(await pool.acquire());
    }
    const ids = new Set(workers.map((w) => w.id));
    expect(ids.size).toBe(3);
  });
});
