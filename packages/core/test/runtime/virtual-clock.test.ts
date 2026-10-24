/**
 * Virtual clock tests (BF-420): setTimeout during render does not advance;
 * Date.now/performance.now are frame-based; timers fire on frame advance.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getVirtualClockFrame,
  installVirtualClock,
  isVirtualClockActive,
  setVirtualClockFrame,
  uninstallVirtualClock,
} from '../../src/runtime';

describe('virtual clock (BF-420)', () => {
  beforeEach(() => {
    uninstallVirtualClock();
    vi.useRealTimers();
  });

  afterEach(() => {
    uninstallVirtualClock();
    vi.useRealTimers();
  });

  it('is inactive by default', () => {
    expect(isVirtualClockActive()).toBe(false);
    expect(getVirtualClockFrame()).toBe(0);
  });

  it('installs and reports active', () => {
    installVirtualClock(10);
    expect(isVirtualClockActive()).toBe(true);
    expect(getVirtualClockFrame()).toBe(10);
    uninstallVirtualClock();
    expect(isVirtualClockActive()).toBe(false);
  });

  it('install is idempotent', () => {
    installVirtualClock(5);
    installVirtualClock(5);
    expect(isVirtualClockActive()).toBe(true);
    expect(getVirtualClockFrame()).toBe(5);
  });

  it('setTimeout callback does not fire until frame advances', () => {
    const cb = vi.fn();
    installVirtualClock(0);
    setTimeout(cb, 1000); // ~60 frames at 60fps
    expect(cb).not.toHaveBeenCalled();
    expect(getVirtualClockFrame()).toBe(0);
  });

  it('setTimeout callback fires when frame passes target', () => {
    const cb = vi.fn();
    installVirtualClock(0);
    setTimeout(cb, 1000); // target frame ~60
    expect(cb).not.toHaveBeenCalled();
    setVirtualClockFrame(60);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('clearTimeout cancels a pending timeout', () => {
    const cb = vi.fn();
    installVirtualClock(0);
    const id = setTimeout(cb, 1000);
    clearTimeout(id);
    setVirtualClockFrame(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('setInterval fires every N frames', () => {
    const cb = vi.fn();
    installVirtualClock(0);
    setInterval(cb, 1000); // every ~60 frames
    setVirtualClockFrame(59);
    expect(cb).not.toHaveBeenCalled();
    setVirtualClockFrame(60);
    expect(cb).toHaveBeenCalledTimes(1);
    setVirtualClockFrame(119);
    expect(cb).toHaveBeenCalledTimes(1);
    setVirtualClockFrame(120);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('clearInterval cancels a pending interval', () => {
    const cb = vi.fn();
    installVirtualClock(0);
    const id = setInterval(cb, 1000);
    clearInterval(id);
    setVirtualClockFrame(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('requestAnimationFrame fires on next frame', () => {
    if (!globalThis.requestAnimationFrame) return;
    const cb = vi.fn();
    installVirtualClock(0);
    requestAnimationFrame(cb);
    expect(cb).not.toHaveBeenCalled();
    setVirtualClockFrame(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('cancelAnimationFrame cancels a pending raf', () => {
    if (!globalThis.requestAnimationFrame) return;
    const cb = vi.fn();
    installVirtualClock(0);
    const id = requestAnimationFrame(cb);
    cancelAnimationFrame(id);
    setVirtualClockFrame(1);
    expect(cb).not.toHaveBeenCalled();
  });

  it('Date.now is frame-based, not wall-clock', () => {
    installVirtualClock(42);
    const t1 = Date.now();
    // Real time may pass between calls, but virtual time stays stable
    const t2 = Date.now();
    expect(t2).toBe(t1);
    expect(t2).toBeGreaterThan(0);
  });

  it('uninstall restores real timers', () => {
    installVirtualClock(0);
    setTimeout(() => {}, 1000);
    uninstallVirtualClock();
    expect(isVirtualClockActive()).toBe(false);
    // Real setTimeout should work again (Node returns a Timeout object)
    const cb = vi.fn();
    const realId = setTimeout(cb, 0);
    expect(realId).toBeDefined();
    clearTimeout(realId);
  });

  it('setVirtualClockFrame advances time', () => {
    installVirtualClock(0);
    expect(getVirtualClockFrame()).toBe(0);
    setVirtualClockFrame(30);
    expect(getVirtualClockFrame()).toBe(30);
    setVirtualClockFrame(10);
    expect(getVirtualClockFrame()).toBe(10);
  });
});
