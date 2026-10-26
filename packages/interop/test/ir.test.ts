/**
 * BF-230/231: Composition IR validation tests.
 *
 * Verifies: validateComposition accepts a well-formed IR and rejects the
 * invariants every exporter relies on (positive fps, non-negative starts,
 * positive durations, known tracks, non-negative markers).
 */

import { describe, expect, it } from 'vitest';
import { validateComposition } from '../src/index.js';
import { makeComposition } from './helpers.js';

describe('validateComposition', () => {
  it('accepts a well-formed composition', () => {
    expect(() => validateComposition(makeComposition())).not.toThrow();
  });

  it('rejects non-positive fps', () => {
    expect(() => validateComposition(makeComposition({ fps: 0 }))).toThrow('fps must be positive');
    expect(() => validateComposition(makeComposition({ fps: -30 }))).toThrow(
      'fps must be positive',
    );
  });

  it('rejects negative clip start frames', () => {
    const ir = makeComposition();
    ir.clips[0]!.startFrame = -1;
    expect(() => validateComposition(ir)).toThrow(/non-negative startFrame/);
  });

  it('rejects non-positive clip durations', () => {
    const ir = makeComposition();
    ir.clips[1]!.durationInFrames = 0;
    expect(() => validateComposition(ir)).toThrow(/positive durationInFrames/);
  });

  it('rejects clips referencing unknown tracks', () => {
    const ir = makeComposition();
    ir.clips[0]!.track = 5;
    expect(() => validateComposition(ir)).toThrow(/unknown track 5/);
  });

  it('rejects negative marker frames', () => {
    const ir = makeComposition();
    ir.markers[0]!.frame = -4;
    expect(() => validateComposition(ir)).toThrow(/non-negative frame/);
  });
});
