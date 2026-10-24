import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertNoLeakedHolds,
  clearFrameHolds,
  getLeakedHolds,
  holdFrame,
  releaseFrame,
} from '../../src/runtime';

describe('holdFrame leak detector (BF-423)', () => {
  beforeEach(() => {
    clearFrameHolds();
  });

  it('getLeakedHolds() returns unreleased holds with handle and name', () => {
    holdFrame('loading-font');
    holdFrame(); // anonymous
    const leaked = getLeakedHolds();
    expect(leaked).toHaveLength(2);
    expect(leaked[0].name).toBe('loading-font');
    expect(leaked[1].name).toBeNull();
    expect(leaked.every((h) => typeof h.handle === 'number')).toBe(true);
  });

  it('assertNoLeakedHolds() passes when nothing is leaked (no false positive)', () => {
    expect(() => assertNoLeakedHolds()).not.toThrow();
  });

  it('assertNoLeakedHolds() passes after every hold is released', () => {
    const first = holdFrame('first');
    const second = holdFrame('second');
    releaseFrame(first);
    releaseFrame(second);
    expect(() => assertNoLeakedHolds()).not.toThrow();
    expect(getLeakedHolds()).toHaveLength(0);
  });

  it('assertNoLeakedHolds() throws naming every unreleased hold by handle and name', () => {
    holdFrame('loading-font');
    holdFrame('fetching-data');
    expect(() => assertNoLeakedHolds()).toThrowError(/assertNoLeakedHolds/);
    expect(() => assertNoLeakedHolds()).toThrowError(/loading-font/);
    expect(() => assertNoLeakedHolds()).toThrowError(/fetching-data/);
    expect(() => assertNoLeakedHolds()).toThrowError(/handle/);
  });
});
