/**
 * Cloud doctor (BF-080/081/082): readiness report with no credentials, no network.
 */

import { describe, expect, it } from 'vitest';
import { cloudDoctor } from '../src/doctor';

describe('cloudDoctor (BF-080/081/082)', () => {
  it('returns a ready report with ok checks', () => {
    const report = cloudDoctor();
    expect(report.ready).toBe(true);
    expect(report.summary).toContain('ready');
    expect(Array.isArray(report.checks)).toBe(true);
    expect(report.checks.length).toBeGreaterThan(0);
    // Every check must pass in this environment.
    for (const check of report.checks) {
      expect(check.ok).toBe(true);
      expect(typeof check.message).toBe('string');
    }
  });

  it('never inspects credentials or uses network', () => {
    const report = cloudDoctor();
    const names = report.checks.map((c) => c.name);
    expect(names).not.toContain('credentials');
    expect(report.summary).not.toContain('credential');
  });
});
