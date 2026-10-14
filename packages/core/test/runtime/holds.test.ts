import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFrameHolds, getActiveHolds, holdFrame, releaseFrame } from '../../src/runtime';

describe('holdFrame / releaseFrame (BF-006)', () => {
  beforeEach(() => {
    clearFrameHolds();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers an active hold and reports it from the hold registry', () => {
    const handle = holdFrame('loading-font');
    const active = getActiveHolds();
    expect(active).toHaveLength(1);
    expect(active[0].handle).toBe(handle);
    expect(active[0].name).toBe('loading-font');
    expect(active[0].timeoutInMilliseconds).toBeNull();
  });

  it('supports anonymous holds (no name)', () => {
    const handle = holdFrame();
    expect(getActiveHolds()[0].name).toBeNull();
    releaseFrame(handle);
    expect(getActiveHolds()).toHaveLength(0);
  });

  it('releaseFrame removes exactly its own hold; other holds stay active', () => {
    const first = holdFrame('first');
    const second = holdFrame('second');
    releaseFrame(first);
    const active = getActiveHolds();
    expect(active).toHaveLength(1);
    expect(active[0].handle).toBe(second);
    expect(active[0].name).toBe('second');
  });

  it('handles are unique and increase monotonically', () => {
    const a = holdFrame('a');
    const b = holdFrame('b');
    expect(b).not.toBe(a);
    expect(b).toBeGreaterThan(a);
  });

  it('throws a helpful error when releasing an unknown or already-released hold', () => {
    expect(() => releaseFrame(999999)).toThrowError(/releaseFrame/);
    const handle = holdFrame('once');
    releaseFrame(handle);
    expect(() => releaseFrame(handle)).toThrowError(/already released/);
  });

  it('throws a helpful error on an invalid hold name', () => {
    expect(() => holdFrame('   ')).toThrowError(/holdFrame/);
    expect(() => holdFrame(42 as unknown as string)).toThrowError(/holdFrame/);
  });

  it('throws a helpful error on an invalid timeout', () => {
    expect(() => holdFrame('x', { timeoutInMilliseconds: 0 })).toThrowError(/timeoutInMilliseconds/);
    expect(() => holdFrame('x', { timeoutInMilliseconds: -100 })).toThrowError(
      /timeoutInMilliseconds/,
    );
    expect(() => holdFrame('x', { timeoutInMilliseconds: Number.NaN })).toThrowError(
      /timeoutInMilliseconds/,
    );
  });

  it('releases the hold deterministically when its timeout elapses', () => {
    vi.useFakeTimers();
    const handle = holdFrame('slow-asset', { timeoutInMilliseconds: 500 });
    vi.advanceTimersByTime(499);
    expect(getActiveHolds()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getActiveHolds()).toHaveLength(0);
    expect(() => releaseFrame(handle)).toThrowError(/already released/);
  });

  it('holds without a timeout never expire', () => {
    vi.useFakeTimers();
    holdFrame('patient');
    vi.advanceTimersByTime(60_000);
    expect(getActiveHolds()).toHaveLength(1);
  });
});
