/**
 * Loudness and audio hygiene (BF-427).
 *
 * Integrated loudness estimate, clipping detection, and A/V drift check.
 * Pure functions over PCM float buffers (-1..1). No network, no native
 * audio APIs — deterministic and testable.
 */

export interface LoudnessAnalysis {
  readonly integratedLufs: number;
  readonly truePeak: number;
}

export interface ClippingReport {
  readonly clipped: boolean;
  readonly clipCount: number;
  readonly maxSample: number;
}

export interface AvDriftReport {
  readonly driftMs: number;
  readonly hasDrift: boolean;
  readonly expectedAudioMs: number;
  readonly actualAudioMs: number;
}

/** Integrated loudness estimate (LUFS-ish) from a float PCM buffer. */
export function analyzeLoudness(buffer: Float32Array): LoudnessAnalysis {
  let sumSquares = 0;
  let truePeak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.abs(buffer[i]);
    sumSquares += s * s;
    if (s > truePeak) truePeak = s;
  }
  const meanSquare = buffer.length ? sumSquares / buffer.length : 0;
  // RMS -> dBFS, approximate LUFS (no K-weighting, a simplification).
  const integratedLufs = meanSquare > 0 ? 10 * Math.log10(meanSquare) : -Infinity;
  return { integratedLufs, truePeak };
}

/** Detect clipping: samples at or above 1.0 (full scale). */
export function detectClipping(buffer: Float32Array): ClippingReport {
  let clipCount = 0;
  let maxSample = 0;
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.abs(buffer[i]);
    if (s > maxSample) maxSample = s;
    if (s >= 1.0) clipCount++;
  }
  return { clipped: clipCount > 0, clipCount, maxSample };
}

/** Check A/V drift between expected audio duration and actual. */
export function checkAVDrift(
  expectedAudioMs: number,
  actualAudioMs: number,
  toleranceMs: number = 33 // ~1 frame at 30fps
): AvDriftReport {
  const driftMs = actualAudioMs - expectedAudioMs;
  return {
    driftMs,
    hasDrift: Math.abs(driftMs) > toleranceMs,
    expectedAudioMs,
    actualAudioMs,
  };
}
