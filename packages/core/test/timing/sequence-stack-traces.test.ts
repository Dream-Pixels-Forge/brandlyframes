import { describe, expect, it } from 'vitest';
import { formatSequenceTrace } from '../../src/timing';

describe('formatSequenceTrace', () => {
  it('formats a single sequence scope', () => {
    const trace = formatSequenceTrace([{ name: 'Intro', from: 30, durationInFrames: 60 }]);
    expect(trace).toContain('Intro');
    expect(trace).toContain('30');
    expect(trace).toContain('89');
  });

  it('formats nested scopes outermost to innermost separated by arrows', () => {
    const trace = formatSequenceTrace([
      { name: 'Intro', from: 0, durationInFrames: 90 },
      { name: 'Logo', from: 0, durationInFrames: 30 },
    ]);
    expect(trace).toContain('Intro');
    expect(trace).toContain('Logo');
    expect(trace).toContain('→');
  });

  it('includes the current frame when provided', () => {
    const trace = formatSequenceTrace(
      [{ name: 'Intro', from: 0, durationInFrames: 90 }],
      45,
    );
    expect(trace).toContain('45');
  });

  it('returns a helpful message for an empty scope stack', () => {
    const trace = formatSequenceTrace([]);
    expect(trace).toContain('no active sequence');
  });

  it('is deterministic: same input yields same output', () => {
    const scopes = [{ name: 'A', from: 0, durationInFrames: 10 }];
    expect(formatSequenceTrace(scopes)).toBe(formatSequenceTrace(scopes));
  });

  it('computes the end frame as from + durationInFrames - 1', () => {
    const trace = formatSequenceTrace([{ name: 'Clip', from: 5, durationInFrames: 20 }]);
    expect(trace).toContain('5');
    expect(trace).toContain('24');
  });
});
