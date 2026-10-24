/**
 * Audio analysis engine (BF-131): decode-once, sample-per-frame.
 *
 * A composition's audio is analyzed once per (buffer, options) pair into an
 * {@link AudioAnalysis} — a per-frame loudness curve, per-frame spectrum band
 * magnitudes and detected beat onsets on the composition's fps grid. The
 * result is cached (see {@link getAudioAnalysis}) so hooks sample pre-computed
 * arrays per frame instead of re-analyzing: `frame -> pixels` stays a pure
 * lookup. Everything here is free of React/DOM/network and deterministic for
 * the same inputs — the buffer shape structurally matches the
 * `AudioBufferLike` interface from `@brandlyframes/media-utils` (core cannot
 * import media-utils: media-utils already depends on core).
 */

/** Subset of the Web Audio API `AudioBuffer` (matches media-utils' `AudioBufferLike`). */
export type AudioBufferLike = {
  /** The sample rate of the audio data (e.g. 44100). */
  readonly sampleRate: number;
  /** The duration of the audio in seconds. */
  readonly duration: number;
  /** The length of the audio buffer in sample frames. */
  readonly length: number;
  /** The number of discrete audio channels. */
  readonly numberOfChannels: number;
  /** Returns the Float32Array of PCM data for the (zero-indexed) channel. */
  getChannelData(channel: number): Float32Array;
};

/** A detected beat onset: the composition frame it starts on and its strength (0..1). */
export type Beat = {
  /** Composition frame the beat starts on. */
  readonly frame: number;
  /** Beat strength, the frame's loudness clamped to 0..1. */
  readonly strength: number;
};

/** Pre-computed, per-frame audio analysis on a composition's fps grid. */
export type AudioAnalysis = {
  /** Beat onsets, sorted by frame. */
  readonly beats: Beat[];
  /** Loudness (RMS, 0..1) per composition frame. */
  readonly loudness: number[];
  /** Spectrum band magnitudes (0..1) per composition frame. */
  readonly spectrum: number[][];
  /** Number of composition frames the analysis covers. */
  readonly durationInFrames: number;
  /** The fps grid the analysis was computed on. */
  readonly fps: number;
  /** How many frames a beat stays active after its onset (see {@link getBeatAtFrame}). */
  readonly beatWindowInFrames: number;
};

/** Options for {@link analyzeAudioBuffer}. */
export type AnalyzeAudioOptions = {
  /** Composition fps grid for per-frame values (default 30). */
  readonly fps?: number;
  /** Number of log-spaced spectrum bands, 20Hz→Nyquist (default 32). */
  readonly spectrumBands?: number;
  /** How many frames a beat stays active after its onset (default 2). */
  readonly beatWindowInFrames?: number;
};

const DEFAULT_FPS = 30;
const DEFAULT_SPECTRUM_BANDS = 32;
const DEFAULT_BEAT_WINDOW_IN_FRAMES = 2;
/** FFT size for the spectrum (power of two; frames are zero-padded up to it). */
const FFT_SIZE = 2048;
/** Lowest spectrum band edge, in Hz. */
const MIN_BAND_HZ = 20;
/** A frame quieter than this (RMS) can never be a beat. */
const SILENCE_FLOOR = 0.02;
/** A beat frame must exceed this multiple of the surrounding loudness mean. */
const BEAT_RATIO = 1.3;
/** Half-width (frames) of the loudness mean window used for onset detection. */
const BEAT_MEAN_HALF_WINDOW = 8;
/** Minimum gap (frames) between accepted beats. */
const MIN_BEAT_GAP_IN_FRAMES = 2;

/** Iterative in-place radix-2 FFT (Cooley–Tukey); lengths must be powers of two. */
const fft = (re: Float64Array, im: Float64Array): void => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const stepRe = Math.cos(angle);
    const stepIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * stepRe - curIm * stepIm;
        curIm = curRe * stepIm + curIm * stepRe;
        curRe = nextRe;
      }
    }
  }
};

/** Hann windows cached per size (windowing stabilizes per-frame spectra). */
const hannCache = new Map<number, Float64Array>();
const hannWindow = (size: number): Float64Array => {
  let window = hannCache.get(size);
  if (!window) {
    window = new Float64Array(size);
    for (let i = 0; i < size; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
    hannCache.set(size, window);
  }
  return window;
};

/** Averages all channels down to one mono curve. */
const mixdown = (buffer: AudioBufferLike): Float64Array => {
  const mono = new Float64Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) mono[i] += data[i];
  }
  if (buffer.numberOfChannels > 1) {
    for (let i = 0; i < mono.length; i++) mono[i] /= buffer.numberOfChannels;
  }
  return mono;
};

/** First sample index of composition frame `f` on the buffer's sample grid. */
const frameStart = (frame: number, samplesPerFrame: number): number =>
  Math.floor(frame * samplesPerFrame);

/** RMS loudness (clamped 0..1) per composition frame. */
const computeLoudness = (
  mono: Float64Array,
  durationInFrames: number,
  samplesPerFrame: number,
): number[] => {
  const loudness: number[] = [];
  for (let frame = 0; frame < durationInFrames; frame++) {
    const start = frameStart(frame, samplesPerFrame);
    const end = Math.min(mono.length, frameStart(frame + 1, samplesPerFrame));
    let sumSquares = 0;
    for (let i = start; i < end; i++) sumSquares += mono[i] * mono[i];
    const rms = end > start ? Math.sqrt(sumSquares / (end - start)) : 0;
    loudness.push(Math.min(1, rms));
  }
  return loudness;
};

/** Spectrum band magnitudes (0..1) per composition frame, log-spaced 20Hz→Nyquist. */
const computeSpectrum = (
  mono: Float64Array,
  sampleRate: number,
  durationInFrames: number,
  samplesPerFrame: number,
  bands: number,
): number[][] => {
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const window = hannWindow(FFT_SIZE);
  const binCount = FFT_SIZE / 2;
  const binHz = sampleRate / FFT_SIZE;
  const minBin = Math.max(1, Math.floor(MIN_BAND_HZ / binHz));
  const maxBin = Math.min(binCount - 1, Math.max(minBin, Math.ceil(sampleRate / 2 / binHz)));
  // Log-spaced band edges: band b covers bins [edges[b], edges[b+1]).
  const edges: number[] = [];
  for (let b = 0; b <= bands; b++) {
    const edge = Math.round(minBin * Math.pow(maxBin / minBin, b / bands));
    edges.push(Math.max(Math.min(edge, maxBin + 1), (edges[b - 1] ?? minBin - 1) + 1));
  }
  edges[bands] = maxBin + 1;
  // Full-scale sine peak after Hann windowing ≈ FFT_SIZE/4 → normalize by it.
  const normalize = FFT_SIZE / 4;

  const spectrum: number[][] = [];
  for (let frame = 0; frame < durationInFrames; frame++) {
    const start = frameStart(frame, samplesPerFrame);
    const end = Math.min(mono.length, start + FFT_SIZE, frameStart(frame + 1, samplesPerFrame));
    re.fill(0);
    im.fill(0);
    for (let i = start; i < end; i++) re[i - start] = mono[i] * window[i - start];
    fft(re, im);
    const frameBands: number[] = [];
    for (let b = 0; b < bands; b++) {
      let peak = 0;
      for (let bin = edges[b]; bin < edges[b + 1]; bin++) {
        const magnitude = Math.hypot(re[bin], im[bin]);
        if (magnitude > peak) peak = magnitude;
      }
      frameBands.push(Math.min(1, peak / normalize));
    }
    spectrum.push(frameBands);
  }
  return spectrum;
};

/** Energy-onset beat detection on the loudness curve: local maxima above the local mean. */
const detectBeats = (loudness: number[]): Beat[] => {
  const beats: Beat[] = [];
  for (let frame = 0; frame < loudness.length; frame++) {
    const value = loudness[frame];
    if (value < SILENCE_FLOOR) continue;
    let sum = 0;
    let count = 0;
    for (let g = Math.max(0, frame - BEAT_MEAN_HALF_WINDOW); g <= Math.min(loudness.length - 1, frame + BEAT_MEAN_HALF_WINDOW); g++) {
      if (g !== frame) {
        sum += loudness[g];
        count++;
      }
    }
    if (value < BEAT_RATIO * (count > 0 ? sum / count : 0)) continue;
    if (frame > 0 && loudness[frame - 1] > value) continue;
    if (frame < loudness.length - 1 && loudness[frame + 1] > value) continue;
    if (beats.length > 0 && frame - beats[beats.length - 1].frame < MIN_BEAT_GAP_IN_FRAMES) continue;
    beats.push({ frame, strength: Math.min(1, value) });
  }
  return beats;
};

/**
 * Analyzes decoded audio into per-frame loudness, spectrum bands and beat
 * onsets on the fps grid — pure and deterministic for the same inputs.
 */
export const analyzeAudioBuffer = (
  buffer: AudioBufferLike,
  options?: AnalyzeAudioOptions,
): AudioAnalysis => {
  const fps = options?.fps ?? DEFAULT_FPS;
  const spectrumBands = options?.spectrumBands ?? DEFAULT_SPECTRUM_BANDS;
  const beatWindowInFrames = options?.beatWindowInFrames ?? DEFAULT_BEAT_WINDOW_IN_FRAMES;
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(`analyzeAudioBuffer: fps must be a positive finite number, received ${fps}.`);
  }
  if (!Number.isInteger(spectrumBands) || spectrumBands < 1) {
    throw new Error(
      `analyzeAudioBuffer: spectrumBands must be a positive integer, received ${spectrumBands}.`,
    );
  }
  if (!Number.isInteger(beatWindowInFrames) || beatWindowInFrames < 1) {
    throw new Error(
      `analyzeAudioBuffer: beatWindowInFrames must be a positive integer, received ${beatWindowInFrames}.`,
    );
  }
  const samplesPerFrame = buffer.sampleRate / fps;
  const durationInFrames = Math.ceil(buffer.length / samplesPerFrame);
  const mono = mixdown(buffer);
  const loudness = computeLoudness(mono, durationInFrames, samplesPerFrame);
  const spectrum = computeSpectrum(
    mono,
    buffer.sampleRate,
    durationInFrames,
    samplesPerFrame,
    spectrumBands,
  );
  return {
    beats: detectBeats(loudness),
    loudness,
    spectrum,
    durationInFrames,
    fps,
    beatWindowInFrames,
  };
};

/**
 * The per-(buffer, options) analysis cache (BF-131): the same buffer passed to
 * the audio hooks is parsed once and every frame read is an O(1) array lookup.
 * Keyed per buffer (WeakMap, so buffers can be garbage-collected) and per
 * serialized options.
 */
const analysisCache = new WeakMap<AudioBufferLike, Map<string, AudioAnalysis>>();

const cacheKey = (options?: AnalyzeAudioOptions): string =>
  `${options?.fps ?? DEFAULT_FPS}|${options?.spectrumBands ?? DEFAULT_SPECTRUM_BANDS}|${
    options?.beatWindowInFrames ?? DEFAULT_BEAT_WINDOW_IN_FRAMES
  }`;

/** Cached {@link analyzeAudioBuffer}: parse once per buffer+options, sample per frame. */
export const getAudioAnalysis = (
  buffer: AudioBufferLike,
  options?: AnalyzeAudioOptions,
): AudioAnalysis => {
  const key = cacheKey(options);
  let byOptions = analysisCache.get(buffer);
  if (!byOptions) {
    byOptions = new Map();
    analysisCache.set(buffer, byOptions);
  }
  let analysis = byOptions.get(key);
  if (!analysis) {
    analysis = analyzeAudioBuffer(buffer, options);
    byOptions.set(key, analysis);
  }
  return analysis;
};

const EMPTY_SPECTRUM: readonly number[] = [];

/** Loudness at a composition frame; `0` outside the analyzed range. */
export const getLoudnessAtFrame = (analysis: AudioAnalysis, frame: number): number =>
  analysis.loudness[frame] ?? 0;

/** Spectrum bands at a composition frame; empty outside the analyzed range. */
export const getSpectrumAtFrame = (analysis: AudioAnalysis, frame: number): readonly number[] =>
  analysis.spectrum[frame] ?? EMPTY_SPECTRUM;

/**
 * The beat active at a composition frame: the most recent beat whose onset is
 * at or before the frame and still inside its window (`beatWindowInFrames`
 * frames, default 2 — the onset frame plus one). `null` outside every window.
 */
export const getBeatAtFrame = (analysis: AudioAnalysis, frame: number): Beat | null => {
  let active: Beat | null = null;
  for (const beat of analysis.beats) {
    if (beat.frame > frame) break;
    active = beat;
  }
  return active !== null && frame < active.frame + analysis.beatWindowInFrames ? active : null;
};
