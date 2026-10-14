import { describe, expect, it } from 'vitest';
import { isSequenceVisible, resolveSequenceFrame } from '../../src/timing/sequence-frames';

describe('resolveSequenceFrame', () => {
  it('resolves frame 0 when the parent frame equals `from`', () => {
    expect(resolveSequenceFrame(10, 10)).toBe(0);
  });

  it('shifts the parent frame down by `from`', () => {
    expect(resolveSequenceFrame(0, 0)).toBe(0);
    expect(resolveSequenceFrame(15, 10)).toBe(5);
    expect(resolveSequenceFrame(119, 60)).toBe(59);
  });

  it('returns negative values while the parent frame is before `from` (pure math contract)', () => {
    expect(resolveSequenceFrame(3, 10)).toBe(-7);
  });

  it('supports negative `from` — the child frame runs ahead of the parent', () => {
    expect(resolveSequenceFrame(0, -5)).toBe(5);
    expect(resolveSequenceFrame(10, -5)).toBe(15);
  });

  it('is deterministic: the same parent frame always resolves to the same value', () => {
    for (let parentFrame = -10; parentFrame <= 300; parentFrame++) {
      const first = resolveSequenceFrame(parentFrame, 7);
      const second = resolveSequenceFrame(parentFrame, 7);
      expect(Object.is(second, first)).toBe(true);
    }
  });
});

describe('isSequenceVisible', () => {
  it('is visible on the first frame (`from`, inclusive)', () => {
    expect(isSequenceVisible(10, 10, 5)).toBe(true);
  });

  it('is invisible before `from`', () => {
    expect(isSequenceVisible(9, 10, 5)).toBe(false);
  });

  it('is visible on the last frame (from + durationInFrames - 1)', () => {
    expect(isSequenceVisible(14, 10, 5)).toBe(true);
  });

  it('is invisible at from + durationInFrames (end is exclusive)', () => {
    expect(isSequenceVisible(15, 10, 5)).toBe(false);
  });

  it('a single-frame sequence is visible only at `from`', () => {
    expect(isSequenceVisible(10, 10, 1)).toBe(true);
    expect(isSequenceVisible(11, 10, 1)).toBe(false);
  });

  it('negative `from` makes the sequence visible from parent frame 0', () => {
    expect(isSequenceVisible(0, -5, 10)).toBe(true);
    expect(isSequenceVisible(4, -5, 10)).toBe(true);
    expect(isSequenceVisible(5, -5, 10)).toBe(false);
  });

  it('is deterministic: the same inputs always resolve to the same visibility', () => {
    for (let parentFrame = -10; parentFrame <= 300; parentFrame++) {
      const first = isSequenceVisible(parentFrame, 7, 13);
      const second = isSequenceVisible(parentFrame, 7, 13);
      expect(Object.is(second, first)).toBe(true);
    }
  });
});
