import { describe, expect, it } from 'vitest';
import { isLoopActive, resolveLoopFrame } from '../../src/timing/loop-frames';

describe('resolveLoopFrame', () => {
  it('resolves frame 0 at the start of the loop', () => {
    expect(resolveLoopFrame(0, 30)).toBe(0);
  });

  it('counts up within one iteration', () => {
    expect(resolveLoopFrame(1, 30)).toBe(1);
    expect(resolveLoopFrame(29, 30)).toBe(29);
  });

  it('resets the child frame to 0 when an iteration ends', () => {
    expect(resolveLoopFrame(30, 30)).toBe(0);
    expect(resolveLoopFrame(60, 30)).toBe(0);
  });

  it('wraps mid-iteration offsets across iterations', () => {
    expect(resolveLoopFrame(75, 30)).toBe(15);
    expect(resolveLoopFrame(25, 10)).toBe(5);
  });

  it('maps negative parent frames to a valid position (non-negative modulo contract)', () => {
    expect(resolveLoopFrame(-1, 10)).toBe(9);
    expect(resolveLoopFrame(-12, 10)).toBe(8);
  });

  it('is deterministic: the same parent frame always resolves to the same value', () => {
    for (let parentFrame = -40; parentFrame <= 400; parentFrame++) {
      const first = resolveLoopFrame(parentFrame, 7);
      const second = resolveLoopFrame(parentFrame, 7);
      expect(Object.is(second, first)).toBe(true);
    }
  });
});

describe('isLoopActive', () => {
  it('is active for any frame when unbounded (no `times`)', () => {
    expect(isLoopActive(0, 10)).toBe(true);
    expect(isLoopActive(1000, 10)).toBe(true);
  });

  it('with `times`, is active through the last frame of the last iteration', () => {
    expect(isLoopActive(0, 10, 2)).toBe(true);
    expect(isLoopActive(19, 10, 2)).toBe(true);
  });

  it('with `times`, is inactive from times * durationInFrames onwards', () => {
    expect(isLoopActive(20, 10, 2)).toBe(false);
    expect(isLoopActive(100, 10, 2)).toBe(false);
  });

  it('a single-iteration loop is inactive after its first iteration', () => {
    expect(isLoopActive(9, 10, 1)).toBe(true);
    expect(isLoopActive(10, 10, 1)).toBe(false);
  });

  it('is deterministic', () => {
    for (let parentFrame = -10; parentFrame <= 200; parentFrame++) {
      const first = isLoopActive(parentFrame, 10, 3);
      const second = isLoopActive(parentFrame, 10, 3);
      expect(Object.is(second, first)).toBe(true);
    }
  });
});
