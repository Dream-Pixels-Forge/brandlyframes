import { describe, expect, it } from 'vitest';
import { resolveFreezeFrame } from '../../src/timing/freeze-frames';

describe('resolveFreezeFrame', () => {
  it('a static override pins the frame regardless of the parent frame', () => {
    expect(resolveFreezeFrame(0, 42)).toBe(42);
    expect(resolveFreezeFrame(999, 42)).toBe(42);
  });

  it('a function override maps the parent frame', () => {
    expect(resolveFreezeFrame(5, (frame) => frame + 10)).toBe(15);
    expect(resolveFreezeFrame(5, () => 0)).toBe(0);
    expect(resolveFreezeFrame(7, (frame) => frame * frame)).toBe(49);
  });

  it('rejects a resolver that returns a non-integer', () => {
    expect(() => resolveFreezeFrame(5, () => 2.5)).toThrow(/Frozen frame must be a finite integer/);
    expect(() => resolveFreezeFrame(5, () => Number.NaN)).toThrow(/Frozen frame must be a finite integer/);
    expect(() => resolveFreezeFrame(5, () => Number.POSITIVE_INFINITY)).toThrow(/Frozen frame must be a finite integer/);
  });

  it('rejects a non-integer static override', () => {
    expect(() => resolveFreezeFrame(5, 2.5)).toThrow(/Frozen frame must be a finite integer/);
  });

  it('is deterministic: the same inputs always resolve to the same value', () => {
    for (let parentFrame = -10; parentFrame <= 300; parentFrame++) {
      const first = resolveFreezeFrame(parentFrame, (frame) => frame + 3);
      const second = resolveFreezeFrame(parentFrame, (frame) => frame + 3);
      expect(Object.is(second, first)).toBe(true);
    }
  });
});
