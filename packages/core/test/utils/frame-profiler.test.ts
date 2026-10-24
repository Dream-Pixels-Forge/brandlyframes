/**
 * Frame profiler (BF-202): records per-frame render durations, reports
 * slowest frames first.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearFrameProfile,
  endFrameProfile,
  getFrameProfile,
  startFrameProfile,
} from '../../src/utils';

describe('frame profiler (BF-202)', () => {
  afterEach(() => {
    clearFrameProfile();
  });

  it('records a frame duration and reports it', () => {
    const start = startFrameProfile(5);
    endFrameProfile(5, start);
    const profile = getFrameProfile();
    const entries5 = profile.filter((e) => e.frame === 5);
    expect(entries5).toHaveLength(1);
    expect(entries5[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('reports slowest frames first', () => {
    const s1 = startFrameProfile(1);
    endFrameProfile(1, s1);
    const s2 = startFrameProfile(2);
    endFrameProfile(2, s2);
    const profile = getFrameProfile();
    expect(profile[0].durationMs).toBeGreaterThanOrEqual(profile[1].durationMs);
  });

  it('averages multiple samples for the same frame', () => {
    const s1 = startFrameProfile(3);
    endFrameProfile(3, s1);
    const s2 = startFrameProfile(3);
    endFrameProfile(3, s2);
    const profile = getFrameProfile();
    const entries3 = profile.filter((e) => e.frame === 3);
    expect(entries3).toHaveLength(1);
    expect(entries3[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('clearFrameProfile empties the profile', () => {
    const s = startFrameProfile(1);
    endFrameProfile(1, s);
    expect(getFrameProfile()).toHaveLength(1);
    clearFrameProfile();
    expect(getFrameProfile()).toHaveLength(0);
  });
});
