import { describe, it, expect, beforeEach } from 'vitest';
import { FrameHistory } from '../src/frameHistory';

describe('FrameHistory (BF-241 ring buffer)', () => {
  let history: FrameHistory;

  beforeEach(() => {
    history = new FrameHistory(5);
  });

  it('records rendered frames and points the cursor at the newest', () => {
    history.push(0);
    history.push(1);
    history.push(2);
    expect(history.entries()).toEqual([0, 1, 2]);
    expect(history.current).toBe(2);
    expect(history.size).toBe(3);
  });

  it('dedupes consecutive re-renders of the same frame', () => {
    history.push(0);
    history.push(0);
    history.push(0);
    expect(history.entries()).toEqual([0]);
    expect(history.size).toBe(1);
  });

  it('evicts the oldest entry beyond capacity (ring buffer)', () => {
    for (const frame of [0, 1, 2, 3, 4, 5]) history.push(frame);
    expect(history.entries()).toEqual([1, 2, 3, 4, 5]);
    expect(history.size).toBe(5);
    expect(history.current).toBe(5);
  });

  it('clamps capacity to at least 1', () => {
    const tiny = new FrameHistory(0);
    tiny.push(3);
    tiny.push(9);
    expect(tiny.entries()).toEqual([9]);
  });

  describe('time travel (scrub back/forward)', () => {
    beforeEach(() => {
      for (const frame of [0, 1, 2, 3]) history.push(frame);
    });

    it('steps back through already-rendered frames', () => {
      expect(history.back()).toBe(2);
      expect(history.current).toBe(2);
      expect(history.back()).toBe(1);
      expect(history.current).toBe(1);
    });

    it('returns null when stepping back past the oldest frame', () => {
      history.back();
      history.back();
      history.back();
      expect(history.current).toBe(0);
      expect(history.back()).toBeNull();
      expect(history.current).toBe(0);
    });

    it('steps forward again without re-render', () => {
      history.back();
      history.back();
      expect(history.forward()).toBe(2);
      expect(history.forward()).toBe(3);
      expect(history.forward()).toBeNull();
      expect(history.current).toBe(3);
    });

    it('reports canBack/canForward', () => {
      expect(history.canBack()).toBe(true);
      expect(history.canForward()).toBe(false);
      history.back();
      expect(history.canForward()).toBe(true);
    });

    it('a new render after time travel snaps the cursor to the newest frame', () => {
      history.back();
      history.back();
      history.push(4);
      expect(history.current).toBe(4);
      expect(history.entries()).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('jump (jump to first error frame)', () => {
    beforeEach(() => {
      for (const frame of [0, 10, 20, 30]) history.push(frame);
    });

    it('jumps to a previously rendered frame', () => {
      history.jump(10);
      expect(history.current).toBe(10);
      expect(history.size).toBe(4);
    });

    it('appends frames that were never rendered', () => {
      history.jump(99);
      expect(history.current).toBe(99);
      expect(history.entries()).toEqual([0, 10, 20, 30, 99]);
    });

    it('supports the jump-to-first-error-frame flow end to end', () => {
      history.back();
      history.back();
      history.jump(20); // capture.firstErrorFrame
      expect(history.current).toBe(20);
    });
  });

  it('clear() empties the buffer', () => {
    history.push(1);
    history.clear();
    expect(history.entries()).toEqual([]);
    expect(history.current).toBeNull();
    expect(history.canBack()).toBe(false);
  });

  it('is empty before any frame is pushed', () => {
    expect(history.current).toBeNull();
    expect(history.size).toBe(0);
    expect(history.back()).toBeNull();
    expect(history.forward()).toBeNull();
  });
});
