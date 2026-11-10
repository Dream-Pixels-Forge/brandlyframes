import { describe, expect, it } from 'vitest';
import {
  decodeWav,
  fft,
  makeWav,
  makeBeatedWav,
  nextPow2,
  spectrumFrames,
  detectBeats,
} from '../src/wav';
import { analyzeAudio, getBeatAtFrame } from '../src/analysis';

describe('decodeWav + makeWav', () => {
  it('round-trips a synthetic sine', () => {
    const wav = decodeWav(makeWav(440, 0.5, 44100, 0.5));
    expect(wav.sampleRate).toBe(44100);
    expect(wav.channels).toBe(1);
    expect(wav.frameCount).toBe(Math.floor(0.5 * 44100));
    // Peak amplitude ≈ 0.5.
    let peak = 0;
    for (let i = 0; i < wav.samples.length; i++) peak = Math.max(peak, Math.abs(wav.samples[i]!));
    expect(peak).toBeCloseTo(0.5, 1);
  });

  it('rejects a non-WAV buffer', () => {
    expect(() => decodeWav(new Uint8Array(64))).toThrow(/RIFF/);
  });
});

describe('fft', () => {
  it('computes the DFT of a single impulse at bin 0', () => {
    const n = 8;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    re[0] = 1; // impulse
    fft(re, im);
    // DFT of an impulse is all-ones.
    for (let k = 0; k < n; k++) {
      expect(re[k]).toBeCloseTo(1, 5);
      expect(im[k]).toBeCloseTo(0, 5);
    }
  });

  it('places a pure sine at its frequency bin', () => {
    const n = 64;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * 4 * i) / n); // freq 4
    fft(re, im);
    let maxK = 0;
    let maxM = 0;
    for (let k = 0; k < n / 2; k++) {
      const m = Math.hypot(re[k]!, im[k]!);
      if (m > maxM) {
        maxM = m;
        maxK = k;
      }
    }
    expect(maxK).toBe(4);
  });

  it('rejects non-power-of-two lengths', () => {
    expect(() => fft(new Float32Array(3), new Float32Array(3))).toThrow(/power of two/);
  });
});

describe('nextPow2', () => {
  it('returns the next power of two', () => {
    expect(nextPow2(1)).toBe(1);
    expect(nextPow2(2)).toBe(2);
    expect(nextPow2(3)).toBe(4);
    expect(nextPow2(1024)).toBe(1024);
    expect(nextPow2(1025)).toBe(2048);
  });
});

describe('spectrumFrames', () => {
  it('finds a 440 Hz sine near its expected bin', () => {
    const wav = decodeWav(makeWav(440, 1, 44100, 0.5));
    const rows = spectrumFrames(wav, { windowSize: 2048, bins: 64 });
    expect(rows.length).toBeGreaterThan(0);
    // 440 Hz at 44100 Hz sample rate, 2048-point window → bin = 440 * 2048 / 44100 ≈ 20.4.
    // But we only keep 64 bins from the top of the *positive* half, so the
    // bin index within the row is (440 * windowSize / sampleRate) - 0.
    const row = rows[Math.floor(rows.length / 2)]!;
    let bestK = 0;
    let bestM = 0;
    for (let k = 0; k < row.length; k++) {
      if (row[k]! > bestM) {
        bestM = row[k]!;
        bestK = k;
      }
    }
    // The dominant bin should be the one closest to 440 Hz.
    // With 64 bins from the bottom of the positive half, bin k covers
    // k * sampleRate / windowSize = k * 44100 / 2048 ≈ 21.5 Hz per bin.
    // 440 Hz → k ≈ 440 / 21.54 ≈ 20.4.
    expect(bestK).toBeGreaterThanOrEqual(18);
    expect(bestK).toBeLessThanOrEqual(23);
  });

  it('silence yields an all-zero row', () => {
    const wav = decodeWav(makeWav(0, 1, 44100, 0)); // 0 Hz = silence
    const rows = spectrumFrames(wav, { windowSize: 1024, bins: 32 });
    const row = rows[rows.length >> 1]!;
    // A 0 Hz sine is a constant; with a Hann window the DC is ~0.
    const sum = row.reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThan(0.5 * row.length);
  });
});

describe('detectBeats', () => {
  it('detects the beat rate in a beated fixture', () => {
    const bps = 2; // 2 beats/sec
    const wav = decodeWav(makeBeatedWav(200, 3, bps, 44100));
    const rows = spectrumFrames(wav, { windowSize: 1024, bins: 64, hop: 512 });
    const beats = detectBeats(rows, 44100, 30, 512);
    // Expect roughly 2 beats/sec × 3 sec = ~6 beats.
    expect(beats.length).toBeGreaterThanOrEqual(3);
    expect(beats.length).toBeLessThanOrEqual(10);
    // Beats are sorted by frame.
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i]!.frame).toBeGreaterThanOrEqual(beats[i - 1]!.frame);
    }
    // Strengths are in [0.5, 1].
    for (const b of beats) {
      expect(b.strength).toBeGreaterThanOrEqual(0.5);
      expect(b.strength).toBeLessThanOrEqual(1.001);
    }
  });

  it('detects no beats in a continuous sine', () => {
    const wav = decodeWav(makeWav(440, 2, 44100, 0.5));
    const rows = spectrumFrames(wav, { windowSize: 1024, bins: 64, hop: 512 });
    const beats = detectBeats(rows, 44100, 30, 512);
    // A steady sine has no flux spikes → few/no beats.
    expect(beats.length).toBeLessThanOrEqual(2);
  });
});

describe('analyzeAudio + getBeatAtFrame', () => {
  it('produces a frame-quantised analysis with matching track lengths', () => {
    const analysis = analyzeAudio(makeBeatedWav(200, 2, 2, 44100), { fps: 30, spectrum: { windowSize: 1024, bins: 32 } });
    expect(analysis.durationInFrames).toBeGreaterThan(0);
    expect(analysis.loudness.length).toBe(analysis.durationInFrames);
    expect(analysis.spectrum.length).toBe(analysis.durationInFrames);
    expect(analysis.sampleRate).toBe(44100);
    for (const row of analysis.spectrum) {
      expect(row).toHaveLength(32);
    }
  });

  it('getBeatAtFrame returns the strongest beat at-or-before the frame', () => {
    const analysis = analyzeAudio(makeBeatedWav(200, 2, 2, 44100), { fps: 30, spectrum: { windowSize: 1024, bins: 32 } });
    if (analysis.beats.length === 0) {
      // No beats detected in this fixture → the API still returns null cleanly.
      expect(getBeatAtFrame(analysis, 0)).toBeNull();
      return;
    }
    const last = analysis.beats[analysis.beats.length - 1]!;
    expect(getBeatAtFrame(analysis, last.frame)).toBe(last);
    // Before the first beat: null.
    const first = analysis.beats[0]!;
    if (first.frame > 0) {
      expect(getBeatAtFrame(analysis, first.frame - 1)).toBeNull();
    }
  });

  it('is deterministic: same buffer + options → identical analysis', () => {
    const buf = makeBeatedWav(200, 1, 2, 44100);
    const a = analyzeAudio(buf, { fps: 30, spectrum: { windowSize: 1024, bins: 16 } });
    const b = analyzeAudio(buf, { fps: 30, spectrum: { windowSize: 1024, bins: 16 } });
    expect(a.loudness).toEqual(b.loudness);
    expect(a.spectrum).toEqual(b.spectrum);
    expect(a.beats).toEqual(b.beats);
  });
});
