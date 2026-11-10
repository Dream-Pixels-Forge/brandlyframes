/**
 * Deterministic WAV decoding + FFT spectrum + beat detection for
 * @brandlyframes/audio-reactive.
 *
 * No external deps: a hand-rolled 16-bit PCM WAV reader and a radix-2
 * Cooley-Tukey FFT (Bit-reversed order, iterative). All operations are
 * pure — same buffer + options → same output.
 */

// ---------------------------------------------------------------------------
// WAV reader (16-bit PCM, mono/stereo interleaved)
// ---------------------------------------------------------------------------

export interface WavData {
  /** Interleaved samples (stereo kept interleaved: [L0, R0, L1, R1, …]). */
  readonly samples: Float32Array;
  /** Sample rate in Hz. */
  readonly sampleRate: number;
  /** Number of channels (1 or 2). */
  readonly channels: number;
  /** Total frames (samples.length / channels). */
  readonly frameCount: number;
}

/**
 * Parse a RIFF/WAVE buffer into normalized (-1..1) float samples.
 * Supports 16-bit PCM only (the common case for test fixtures).
 *
 * @throws if the buffer is not a valid 16-bit PCM WAV.
 */
export const decodeWav = (buffer: Uint8Array | ArrayBuffer): WavData => {
  const b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ascii = (o: number, n: number): string => {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(b[o + i]);
    return s;
  };
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE') {
    throw new Error('decodeWav: not a RIFF/WAVE file');
  }
  let off = 12;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let dataOff = -1;
  let dataLen = 0;
  while (off + 8 <= b.length) {
    const id = ascii(off, 4);
    const len = view.getUint32(off + 4, true);
    if (id === 'fmt ') {
      channels = view.getUint16(off + 10, true);
      sampleRate = view.getUint32(off + 12, true);
      bits = view.getUint16(off + 22, true);
    } else if (id === 'data') {
      dataOff = off + 8;
      dataLen = len;
    }
    off += 8 + len + (len & 1); // data blocks are word-aligned
  }
  if (bits !== 16) throw new Error(`decodeWav: unsupported bit depth ${bits} (need 16)`);
  if (channels < 1 || channels > 2) throw new Error(`decodeWav: unsupported channel count ${channels}`);
  if (dataOff < 0) throw new Error('decodeWav: no data chunk found');
  const nSamples = Math.min(Math.floor(dataLen / 2), Math.floor((b.length - dataOff) / 2));
  const samples = new Float32Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    samples[i] = view.getInt16(dataOff + i * 2, true) / 32768;
  }
  return { samples, sampleRate, channels, frameCount: Math.floor(nSamples / channels) };
};

// ---------------------------------------------------------------------------
// FFT (radix-2 iterative Cooley-Tukey, in-place)
// ---------------------------------------------------------------------------

/**
 * In-place real FFT. `re`/`im` must have a length that is a power of two.
 * Deterministic.
 */
export const fft = (re: Float32Array, im: Float32Array): void => {
  const n = re.length;
  if ((n & (n - 1)) !== 0) throw new Error('fft: length must be a power of two');
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Spectrum framing
// ---------------------------------------------------------------------------

/**
 * Next power of two ≥ n (for FFT window sizing).
 */
export const nextPow2 = (n: number): number => {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
};

export interface SpectrumFrameOptions {
  /** FFT window size (power of two). Default 1024. */
  readonly windowSize?: number;
  /** Hop between successive frames, in samples. Default = windowSize/2. */
  readonly hop?: number;
  /** Number of frequency bins to keep (from the lower half of the FFT).
   *  Default 64. */
  readonly bins?: number;
  /** Apply a Hann window before the FFT. Default true. */
  readonly window?: boolean;
}

/**
 * Compute a per-frame magnitude spectrum from interleaved PCM samples.
 * Returns one row per frame; each row has `bins` values in [0,1]
 * (normalised by the window's peak magnitude, so a full-scale sine shows
 * near 1.0 in its bin).
 *
 * Pure + deterministic.
 */
export const spectrumFrames = (
  wav: WavData,
  options: SpectrumFrameOptions = {},
): number[][] => {
  const { windowSize = 1024, hop, bins = 64, window = true } = options;
  const h = hop ?? windowSize / 2;
  const w = nextPow2(windowSize);
  // Mixdown to mono (averaging channels) so the spectrum is channel-agnostic.
  const mono = wav.channels === 1 ? wav.samples : monoMixdown(wav.samples, wav.channels);
  const hann = window
    ? (() => {
        const a = new Float32Array(w);
        for (let i = 0; i < w; i++) a[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (w - 1)));
        return a;
      })()
    : undefined;
  const nFrames = Math.max(1, Math.floor((mono.length - w) / h) + 1);
  const out: number[][] = [];
  for (let f = 0; f < nFrames; f++) {
    const start = f * h;
    const re = new Float32Array(w);
    const im = new Float32Array(w);
    for (let i = 0; i < w; i++) {
      const s = mono[start + i] ?? 0;
      re[i] = (hann ? s * hann[i]! : s) as number;
    }
    fft(re, im);
    // Magnitude of the first `bins` positive-frequency bins, normalised by
    // the max magnitude in this frame (robust to overall gain).
    const half = w / 2;
    const useBins = Math.min(bins, half);
    let peak = 0;
    for (let k = 1; k <= useBins; k++) {
      const m = Math.hypot(re[k], im[k]);
      if (m > peak) peak = m;
    }
    const row = new Array<number>(useBins);
    for (let k = 0; k < useBins; k++) {
      const m = k === 0 ? 0 : Math.hypot(re[k], im[k]);
      row[k] = peak > 0 ? m / peak : 0;
    }
    out.push(row);
  }
  return out;
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

// ---------------------------------------------------------------------------
// Beat detection (spectral-flux style, deterministic)
// ---------------------------------------------------------------------------

export interface BeatDetectionOptions {
  /** Minimum seconds between two beats (refractory period). Default 0.25. */
  readonly minBeatGapSec?: number;
  /** Flux multiplier threshold. Default 1.4. */
  readonly threshold?: number;
  /** Look-back frames for the baseline. Default 8. */
  readonly baseline?: number;
}

/**
 * Detect beats from a pre-computed spectrum. Uses positive spectral flux
 * (sum of magnitude increases vs. a rolling baseline) and a refractory
 * period. Pure + deterministic.
 *
 * @param spectrum - rows of magnitude bins (from {@link spectrumFrames})
 * @param sampleRate - the source sample rate
 * @param fps - target composition fps (beats are timestamped in frames)
 * @param hop - the spectrum's hop (samples/frame); default = windowSize/2
 * @returns beats sorted by frame, each with a strength in [0,1]
 */
export const detectBeats = (
  spectrum: readonly number[][],
  sampleRate: number,
  fps: number,
  hop: number,
  options: BeatDetectionOptions = {},
): { readonly frame: number; readonly strength: number }[] => {
  const { minBeatGapSec = 0.25, threshold = 1.4, baseline = 8 } = options;

  // Positive flux per spectrum row.
  const flux: number[] = [];
  let prev: number[] | null = null;
  for (const row of spectrum) {
    if (prev === null) {
      flux.push(0);
      prev = row;
      continue;
    }
    let f = 0;
    for (let k = 0; k < row.length; k++) {
      const d = row[k]! - prev[k]!;
      if (d > 0) f += d;
    }
    flux.push(f);
    prev = row;
  }

  // Refractory period expressed in spectrum-row space: one row covers
  // `hop / sampleRate` seconds → `hop * fps / sampleRate` comp-frames.
  const rowsPerSec = sampleRate / hop;
  const minGapRows = Math.max(1, Math.round(minBeatGapSec * rowsPerSec));

  const beats: { frame: number; strength: number }[] = [];
  let lastBeatRow = -minGapRows;
  let maxFlux = 0;
  for (let i = 1; i < flux.length; i++) {
    // Rolling baseline: mean of the prior `baseline` flux values.
    let base = 0;
    let count = 0;
    for (let j = Math.max(0, i - baseline); j < i; j++) {
      base += flux[j]!;
      count++;
    }
    base = count > 0 ? base / count : 0;
    const v = flux[i]!;
    if (v > Math.max(base * threshold, 0.02) && i - lastBeatRow >= minGapRows) {
      // One spectrum row is `hop` samples = hop/sampleRate seconds.
      const compFrame = Math.floor(((i * hop) / sampleRate) * fps);
      beats.push({ frame: compFrame, strength: v });
      maxFlux = Math.max(maxFlux, v);
      lastBeatRow = i;
    }
  }
  // Rescale strengths to [0.5, 1] so the strongest beat = 1.0.
  for (const b of beats) {
    b.strength = 0.5 + 0.5 * (b.strength / Math.max(maxFlux, 1e-6));
  }
  beats.sort((a, b) => a.frame - b.frame);
  return beats;
};

// ---------------------------------------------------------------------------
// Synthetic test fixture — a deterministic WAV buffer
// ---------------------------------------------------------------------------

/**
 * Build a minimal 16-bit PCM WAV buffer in memory: a sine wave of
 * `frequency` Hz at `amplitude` (0..1) for `seconds`, at `sampleRate`.
 * Used by tests so CI never needs a real audio file.
 */
export const makeWav = (
  frequency: number,
  seconds: number,
  sampleRate = 44100,
  amplitude = 0.5,
): Uint8Array => {
  const nFrames = Math.floor(seconds * sampleRate);
  const nSamples = nFrames; // mono
  const dataSize = nSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const b = new Uint8Array(buf);
  const view = new DataView(buf);
  const writeStr = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i);
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < nSamples; i++) {
    const t = i / sampleRate;
    const s = Math.round(Math.sin(2 * Math.PI * frequency * t) * amplitude * 32767);
    view.setInt16(44 + i * 2, s, true);
  }
  return b;
};

/**
 * Build a WAV with periodic amplitude "hits" — a beat-like signal for
 * beat-detection tests: a 100 Hz tone, amplitude gated at `beatsPerSec`.
 */
export const makeBeatedWav = (
  frequency: number,
  seconds: number,
  beatsPerSec: number,
  sampleRate = 44100,
): Uint8Array => {
  const nFrames = Math.floor(seconds * sampleRate);
  const nSamples = nFrames;
  const dataSize = nSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const b = new Uint8Array(buf);
  const view = new DataView(buf);
  const writeStr = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i);
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  const beatPeriod = 1 / beatsPerSec;
  for (let i = 0; i < nSamples; i++) {
    const t = i / sampleRate;
    // Envelope: a short decay after each beat onset (every beatPeriod sec).
    const phase = t % beatPeriod;
    const env = Math.exp(-phase * 12) * 0.9 + 0.05; // decaying click + floor
    const s = Math.round(Math.sin(2 * Math.PI * frequency * t) * env * 32767);
    view.setInt16(44 + i * 2, s, true);
  }
  return b;
};
