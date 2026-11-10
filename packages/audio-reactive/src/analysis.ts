/**
 * File-based audio analysis for @brandlyframes/audio-reactive.
 *
 * `analyzeAudio` decodes a WAV file from disk (or a raw 16-bit PCM WAV
 * buffer), computes a per-frame magnitude spectrum and a beat list, and
 * returns a single {@link AudioAnalysis} — the object the fx / frames
 * audio-reactive layers consume.
 *
 * Deterministic: same file + same options → same analysis. No live audio
 * in CI; tests use the synthetic `makeWav` / `makeBeatedWav` fixtures.
 */

import { readFileSync } from 'node:fs';
import {
  decodeWav,
  detectBeats,
  spectrumFrames,
  type BeatDetectionOptions,
  type SpectrumFrameOptions,
} from './wav';

/** A single detected beat: composition frame + relative strength [0.5,1]. */
export interface Beat {
  readonly frame: number;
  readonly strength: number;
}

/** Per-frame loudness, normalised to [0,1]. */
export type LoudnessTrack = readonly number[];

/** Per-frame magnitude spectrum (one row per composition frame). */
export type SpectrumTrack = readonly (readonly number[])[];

/** The full audio analysis: everything a reactive visual needs. */
export interface AudioAnalysis {
  /** Detected beats, sorted by frame. */
  readonly beats: readonly Beat[];
  /** Per-frame loudness [0,1], length = `durationInFrames`. */
  readonly loudness: LoudnessTrack;
  /** Per-frame spectrum rows, length = `durationInFrames`. */
  readonly spectrum: SpectrumTrack;
  /** Total composition length in frames. */
  readonly durationInFrames: number;
  /** The fps the analysis was quantised to. */
  readonly fps: number;
  /** Source sample rate in Hz. */
  readonly sampleRate: number;
}

export interface AnalyzeAudioOptions {
  /** Composition fps. Default 30. */
  readonly fps?: number;
  /** Spectrum options (windowSize, bins, hop…). */
  readonly spectrum?: SpectrumFrameOptions;
  /** Beat-detection options. */
  readonly beats?: BeatDetectionOptions;
}

/**
 * Analyze a WAV file at `path` (or a raw WAV `buffer`) into an
 * {@link AudioAnalysis}.
 *
 * @param src - a file path, or a `Uint8Array`/`ArrayBuffer` of WAV bytes
 * @param options - fps, spectrum, beats options
 * @returns a deterministic, frame-quantised analysis
 */
export const analyzeAudio = (
  src: string | Uint8Array | ArrayBuffer,
  options: AnalyzeAudioOptions = {},
): AudioAnalysis => {
  const fps = options.fps ?? 30;
  const specOpts = options.spectrum ?? {};
  const buf: Uint8Array | ArrayBuffer =
    typeof src === 'string' ? readFileSync(src) : src;
  const wav = decodeWav(buf);

  // Spectrum rows are quantised at the spectrum hop; we then resample them
  // onto the composition frame grid (fps) so `spectrum[frame]` is always
  // defined for 0..durationInFrames.
  const specWindow = nextPow2Of(specOpts.windowSize ?? 1024);
  const specHop = specOpts.hop ?? specWindow / 2;
  const specRows = spectrumFrames(wav, {
    ...specOpts,
    windowSize: specWindow,
    hop: specHop,
  });
  const bins = (specRows[0]?.length ?? 0);

  // Duration in composition frames.
  const durationSec = wav.frameCount / wav.sampleRate;
  const durationInFrames = Math.max(1, Math.round(durationSec * fps));

  // Map each composition frame to the spectrum row covering it.
  const specRowsPerSec = wav.sampleRate / specHop;
  const spectrum: number[][] = [];
  for (let f = 0; f < durationInFrames; f++) {
    const sec = f / fps;
    const row = Math.min(
      specRows.length - 1,
      Math.max(0, Math.round(sec * specRowsPerSec)),
    );
    const r = specRows[row];
    spectrum.push(r ? Array.from(r) : new Array(bins).fill(0));
  }

  // Per-frame loudness: RMS of the source samples in that frame's window.
  const mono = wav.channels === 1
    ? wav.samples
    : monoMixdown(wav.samples, wav.channels);
  const samplesPerFrame = wav.sampleRate / fps;
  const loudness: number[] = [];
  for (let f = 0; f < durationInFrames; f++) {
    const start = Math.floor(f * samplesPerFrame);
    const end = Math.min(mono.length, Math.floor((f + 1) * samplesPerFrame));
    let sum = 0;
    const n = end - start;
    if (n > 0) {
      for (let i = start; i < end; i++) sum += (mono[i] ?? 0) ** 2;
      loudness.push(Math.sqrt(sum / n));
    } else {
      loudness.push(0);
    }
  }
  // Normalise loudness to [0,1].
  const maxLoud = Math.max(0.001, ...loudness);
  for (let i = 0; i < loudness.length; i++) loudness[i] = loudness[i]! / maxLoud;

  // Beats: detect on the spectrum rows, then the returned frames are
  // already in composition-frame space.
  const beats = detectBeats(specRows, wav.sampleRate, fps, specHop, options.beats);

  return {
    beats,
    loudness: loudness as LoudnessTrack,
    spectrum: spectrum as SpectrumTrack,
    durationInFrames,
    fps,
    sampleRate: wav.sampleRate,
  };
};

/**
 * Look up the strongest beat at or immediately before `frame`.
 * Returns `null` if no beat has been detected up to `frame`.
 */
export const getBeatAtFrame = (
  analysis: AudioAnalysis,
  frame: number,
): Beat | null => {
  if (analysis.beats.length === 0) return null;
  // Beats are sorted by frame. Binary-search the last beat <= frame.
  let lo = 0;
  let hi = analysis.beats.length - 1;
  let result: Beat | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = analysis.beats[mid]!;
    if (b.frame <= frame) {
      result = b;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const nextPow2Of = (n: number): number => {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
};

const monoMixdown = (samples: Float32Array, channels: number): Float32Array => {
  const n = Math.floor(samples.length / channels);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += samples[i * channels + c] ?? 0;
    out[i] = sum / channels;
  }
  return out;
};
