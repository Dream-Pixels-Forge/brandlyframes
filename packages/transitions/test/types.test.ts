/**
 * Transitions types tests — [BF-070]
 */

import { describe, it, expect } from 'vitest';
import {
  createProgress,
  linear,
  easeIn,
  easeOut,
  easeInOut,
  type EasingFn,
} from '../src/types';

describe('createProgress', () => {
  it('creates valid progress values', () => {
    expect(createProgress(0)).toBe(0);
    expect(createProgress(0.5)).toBe(0.5);
    expect(createProgress(1)).toBe(1);
  });

  it('throws on invalid values', () => {
    expect(() => createProgress(-0.1)).toThrow('TransitionProgress must be in [0, 1]');
    expect(() => createProgress(1.1)).toThrow('TransitionProgress must be in [0, 1]');
    expect(() => createProgress(NaN)).toThrow('TransitionProgress must be in [0, 1]');
    expect(() => createProgress(Infinity)).toThrow('TransitionProgress must be in [0, 1]');
  });
});

describe('easing functions', () => {
  const testEasing = (fn: EasingFn, name: string) => {
    it(`${name} returns 0 at t=0`, () => {
      expect(fn(0)).toBe(0);
    });

    it(`${name} returns 1 at t=1`, () => {
      expect(fn(1)).toBe(1);
    });

    it(`${name} returns values in [0, 1] for t in [0, 1]`, () => {
      for (let t = 0; t <= 1; t += 0.1) {
        const result = fn(t);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }
    });
  };

  testEasing(linear, 'linear');
  testEasing(easeIn, 'easeIn');
  testEasing(easeOut, 'easeOut');
  testEasing(easeInOut, 'easeInOut');

  it('easeIn accelerates from zero', () => {
    expect(easeIn(0.25)).toBeLessThan(linear(0.25));
    expect(easeIn(0.5)).toBeLessThan(linear(0.5));
  });

  it('easeOut decelerates to zero', () => {
    expect(easeOut(0.25)).toBeGreaterThan(linear(0.25));
    expect(easeOut(0.5)).toBeGreaterThan(linear(0.5));
  });

  it('easeInOut is symmetric', () => {
    // easeInOut(0.25) should equal easeInOut(0.75)
    // easeInOut(t) for t<0.5 is 2*t^2, for t>=0.5 is 1 - 2*(1-t)^2
    // easeInOut(0.25) = 2*(0.25)^2 = 0.125
    // easeInOut(0.75) = 1 - 2*(0.25)^2 = 0.875
    // These are not symmetric in value, but the shape is symmetric
    // The test should check the shape property: easeInOut(t) + easeInOut(1-t) = 1
    expect(easeInOut(0.25) + easeInOut(0.75)).toBeCloseTo(1, 10);
    expect(easeInOut(0.1) + easeInOut(0.9)).toBeCloseTo(1, 10);
    expect(easeInOut(0.5)).toBe(0.5);
  });
});