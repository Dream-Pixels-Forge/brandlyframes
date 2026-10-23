import { describe, expect, it } from 'vitest';
import {
  analyzeAudioBuffer,
  getAudioAnalysis,
  getBeatAtFrame,
  getLoudnessAtFrame,
  getSpectrumAtFrame,
  type AudioBufferLike,
} from '../../src/hooks/audio-analysis';

/** Builds a synthetic AudioBufferLike from raw channel data (no network, no AudioContext). */
const makeBuffer = (channels: Float32Array[], sampleRate: number): AudioBufferLike => ({
  sampleRate,
  duration: channels[0].length / sampleRate,
  length: channels[0].length,
  numberOfChannels: channels.length,
  getChannelData: (channel: number) => channels[channel],
});

/** Deterministic sine generator. */
const sine = (freqHz: number, seconds: number, sampleRate: number, amplitude = 1): Float32Array => {
  const data = new Float32Array(Math.round(seconds * sampleRate));
  for (let i = 0; i < data.length; i++) {
    data[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return data;
};

/** Deterministic click track: one 100-sample full-scale burst every `periodFrames` frames. */
const clickTrack = (
  frames: number,
  periodFrames: number,
  sampleRate: number,
  fps: number,
): Float32Array => {
  const data = new Float32Array(Math.round(frames * (sampleRate / fps)));
  const burst = 100;
  for (let f = 0; f < frames; f += periodFrames) {
    const start = Math.floor((f * sampleRate) / fps);
    for (let i = 0; i < burst && start + i < data.length; i++) data[start + i] = 1;
  }
  return data;
};

describe('analyzeAudioBuffer (BF-130/131 engine)', () => {
  it('is deterministic: the same buffer analyzed twice yields identical results', () => {
    const buffer = makeBuffer([sine(440, 2, 44100)], 44100);
    const a = analyzeAudioBuffer(buffer, { fps: 30 });
    const b = analyzeAudioBuffer(buffer, { fps: 30 });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('measures loudness as RMS per composition frame (sine ≈ amplitude/√2)', () => {
    const amplitude = 0.8;
    const buffer = makeBuffer([sine(440, 2, 44100, amplitude)], 44100);
    const analysis = analyzeAudioBuffer(buffer, { fps: 30 });
    expect(analysis.fps).toBe(30);
    expect(analysis.durationInFrames).toBe(60);
    for (const loudness of analysis.loudness) {
      expect(loudness).toBeCloseTo(amplitude / Math.SQRT2, 2);
      expect(loudness).toBeGreaterThanOrEqual(0);
      expect(loudness).toBeLessThanOrEqual(1);
    }
  });

  it('reports neutral values for silence: zero loudness, zero spectrum, no beats', () => {
    const buffer = makeBuffer([new Float32Array(44100)], 44100);
    const analysis = analyzeAudioBuffer(buffer, { fps: 30 });
    expect(analysis.durationInFrames).toBe(30);
    expect(analysis.loudness).toEqual(new Array(30).fill(0));
    expect(analysis.spectrum.every((bands) => bands.every((band) => band === 0))).toBe(true);
    expect(analysis.beats).toEqual([]);
  });

  it('mixes down multi-channel audio (stereo average)', () => {
    const left = new Float32Array(44100).fill(0.4);
    const right = new Float32Array(44100).fill(0.8);
    const buffer = makeBuffer([left, right], 44100);
    const analysis = analyzeAudioBuffer(buffer, { fps: 30 });
    // RMS of a constant 0.6 signal is 0.6.
    expect(analysis.loudness[0]).toBeCloseTo(0.6, 5);
  });

  it('detects beats at click onsets within ±1 frame', () => {
    // 60 frames at 30fps, a click every 15 frames (0.5s) → beats at 0, 15, 30, 45.
    const buffer = makeBuffer([clickTrack(60, 15, 44100, 30)], 44100);
    const analysis = analyzeAudioBuffer(buffer, { fps: 30 });
    const expected = [0, 15, 30, 45];
    expect(analysis.beats).toHaveLength(expected.length);
    for (const [i, beat] of analysis.beats.entries()) {
      expect(Math.abs(beat.frame - expected[i])).toBeLessThanOrEqual(1);
      expect(beat.strength).toBeGreaterThan(0);
      expect(beat.strength).toBeLessThanOrEqual(1);
    }
  });

  it('does not detect beats in a steady tone (no onsets)', () => {
    const buffer = makeBuffer([sine(440, 2, 44100)], 44100);
    const analysis = analyzeAudioBuffer(buffer, { fps: 30 });
    expect(analysis.beats).toEqual([]);
  });

  it('places sine energy in the band containing its frequency', () => {
    const sampleRate = 44100;
    const freqHz = 440;
    const buffer = makeBuffer([sine(freqHz, 2, sampleRate)], sampleRate);
    const analysis = analyzeAudioBuffer(buffer, { fps: 30 });
    const bands = analysis.spectrum[0];
    expect(bands.length).toBe(32);
    const bandHz = (band: number): number =>
      // log-spaced band centers between 20Hz and Nyquist (mirrors the engine's spacing)
      20 * Math.pow(sampleRate / 2 / 20, (band + 0.5) / bands.length);
    const loudestBand = bands.reduce((best, value, band) => (value > bands[best] ? band : best), 0);
    expect(bandHz(loudestBand - 1)).toBeLessThan(freqHz);
    expect(bandHz(loudestBand + 1)).toBeGreaterThan(freqHz);
    // Energy is concentrated: the loudest band is near full scale, distant bands are quiet.
    expect(bands[loudestBand]).toBeGreaterThan(0.5);
    expect(bands[bands.length - 1]).toBeLessThan(0.1);
  });

  it('validates options', () => {
    const buffer = makeBuffer([sine(440, 0.1, 44100)], 44100);
    expect(() => analyzeAudioBuffer(buffer, { fps: 0 })).toThrow();
    expect(() => analyzeAudioBuffer(buffer, { fps: -30 })).toThrow();
    expect(() => analyzeAudioBuffer(buffer, { spectrumBands: 0 })).toThrow();
    expect(() => analyzeAudioBuffer(buffer, { beatWindowInFrames: 0 })).toThrow();
  });

  it('supports a custom spectrum band count and beat window', () => {
    const buffer = makeBuffer([sine(440, 1, 44100)], 44100);
    const analysis = analyzeAudioBuffer(buffer, { fps: 30, spectrumBands: 8, beatWindowInFrames: 4 });
    expect(analysis.spectrum[0].length).toBe(8);
    expect(analysis.beatWindowInFrames).toBe(4);
  });
});

describe('audio analysis cache (BF-131: parse once, sample per frame)', () => {
  it('returns the identical analysis object for the same buffer and fps', () => {
    const buffer = makeBuffer([sine(440, 1, 44100)], 44100);
    const a = getAudioAnalysis(buffer, { fps: 30 });
    const b = getAudioAnalysis(buffer, { fps: 30 });
    expect(b).toBe(a);
  });

  it('caches separately per fps and per buffer', () => {
    const bufferA = makeBuffer([sine(440, 1, 44100)], 44100);
    const bufferB = makeBuffer([sine(880, 1, 44100)], 44100);
    const at30 = getAudioAnalysis(bufferA, { fps: 30 });
    const at60 = getAudioAnalysis(bufferA, { fps: 60 });
    expect(at60).not.toBe(at30);
    expect(at60.fps).toBe(60);
    expect(getAudioAnalysis(bufferB, { fps: 30 })).not.toBe(at30);
    // Cached entries are still deterministic.
    expect(getAudioAnalysis(bufferA, { fps: 30 })).toEqual(at30);
  });
});

describe('per-frame accessors', () => {
  const buffer = makeBuffer([clickTrack(60, 15, 44100, 30)], 44100);
  const analysis = getAudioAnalysis(buffer, { fps: 30 });
  const beat = analysis.beats[0];

  it('getLoudnessAtFrame reads the loudness curve (0 outside the composition)', () => {
    expect(getLoudnessAtFrame(analysis, 0)).toBe(analysis.loudness[0]);
    expect(getLoudnessAtFrame(analysis, 59)).toBe(analysis.loudness[59]);
    expect(getLoudnessAtFrame(analysis, 60)).toBe(0);
    expect(getLoudnessAtFrame(analysis, -1)).toBe(0);
  });

  it('getSpectrumAtFrame reads the spectrum (empty outside the composition)', () => {
    expect(getSpectrumAtFrame(analysis, 0)).toEqual(analysis.spectrum[0]);
    expect(getSpectrumAtFrame(analysis, 60)).toEqual([]);
    expect(getSpectrumAtFrame(analysis, -1)).toEqual([]);
  });

  it('getBeatAtFrame keeps the beat active for its window, then null', () => {
    expect(beat).toBeDefined();
    expect(getBeatAtFrame(analysis, beat.frame)).toEqual(beat);
    // Default window of 2 frames: active on the beat frame and the next one.
    expect(getBeatAtFrame(analysis, beat.frame + 1)).toEqual(beat);
    expect(getBeatAtFrame(analysis, beat.frame + 2)).toBeNull();
    expect(getBeatAtFrame(analysis, -1)).toBeNull();
  });
});
