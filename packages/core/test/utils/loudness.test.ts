/**
 * Loudness and audio hygiene (BF-427): loudness estimate, clipping detection,
 * A/V drift check. Pure functions over float PCM buffers.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeLoudness,
  checkAVDrift,
  detectClipping,
} from '../../src/utils';

describe('analyzeLoudness (BF-427)', () => {
  it('reports -Infinity for an empty buffer', () => {
    const result = analyzeLoudness(new Float32Array(0));
    expect(result.integratedLufs).toBe(-Infinity);
    expect(result.truePeak).toBe(0);
  });

  it('reports true peak and negative LUFS for a silent-ish buffer', () => {
    const buf = new Float32Array([0.1, -0.1, 0.1, -0.1]);
    const result = analyzeLoudness(buf);
    expect(result.truePeak).toBeCloseTo(0.1, 5);
    expect(result.integratedLufs).toBeLessThan(0);
  });
});

describe('detectClipping (BF-427)', () => {
  it('reports no clipping below full scale', () => {
    const buf = new Float32Array([0.5, -0.5, 0.9]);
    const report = detectClipping(buf);
    expect(report.clipped).toBe(false);
    expect(report.clipCount).toBe(0);
    expect(report.maxSample).toBeCloseTo(0.9, 5);
  });

  it('detects clipping at full scale', () => {
    const buf = new Float32Array([1.0, -1.0, 0.5]);
    const report = detectClipping(buf);
    expect(report.clipped).toBe(true);
    expect(report.clipCount).toBe(2);
    expect(report.maxSample).toBe(1);
  });
});

describe('checkAVDrift (BF-427)', () => {
  it('reports no drift within tolerance', () => {
    const report = checkAVDrift(1000, 1010);
    expect(report.hasDrift).toBe(false);
    expect(report.driftMs).toBe(10);
  });

  it('reports drift beyond tolerance', () => {
    const report = checkAVDrift(1000, 1050);
    expect(report.hasDrift).toBe(true);
    expect(report.driftMs).toBe(50);
    expect(report.expectedAudioMs).toBe(1000);
    expect(report.actualAudioMs).toBe(1050);
  });
});
