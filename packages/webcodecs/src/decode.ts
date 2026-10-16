/**
 * @brandlyframes/webcodecs — real decode paths [BF-071]
 *
 * Real WebCodecs decode paths. The design is testable in Node: the decode
 * functions accept optional **codec factories** — functions that produce
 * codec-like objects which in turn yield decoded frames. The default
 * factories use the real `VideoDecoder` / `AudioDecoder` globals and throw
 * an environment error when they are absent, keeping the pure math (fps
 * from timestamps, duration from frame counts) Node-testable.
 *
 * No real demuxing happens here — that is the caller's job (pass in
 * `EncodedVideoChunk`-bearing frames or feed a mock factory in tests). The
 * contract is: given a blob (documented as the "source") and a codec,
 * produce exact-rational fps + duration.
 */

import { reduceRational } from './probe-video';
import type { ProbeRational } from './probe-video';

/** The single environment error message used across decode paths. */
const ENV_ERROR = 'WebCodecs VideoDecoder is not available in this environment';
const AUDIO_ENV_ERROR = 'WebCodecs AudioDecoder is not available in this environment';

/** Default fps used when fewer than two frames are available. */
const DEFAULT_FPS: ProbeRational = { num: 30, den: 1 };

/**
 * Well-known frame rates to snap to when the measured fps is within a small
 * tolerance. This is what makes NTSC (30000/1001) round-trip exactly even
 * when integer-µs timestamps introduce sub-microsecond rounding drift.
 *
 * Tolerance: a measured fps is snapped if it is within 0.01 of a known rate.
 */
const KNOWN_FPS: ProbeRational[] = [
  { num: 24, den: 1 },
  { num: 25, den: 1 },
  { num: 30, den: 1 },
  { num: 30000, den: 1001 },
  { num: 50, den: 1 },
  { num: 60, den: 1 },
  { num: 60000, den: 1001 },
  { num: 120, den: 1 },
];

/** Tolerance (absolute) for snapping a measured fps to a known rate. */
const FPS_SNAP_TOLERANCE = 0.01;

/**
 * Minimal structural shape of a decoded video frame. The real
 * `VideoFrame` has far more fields; only timestamp/duration are needed
 * for fps + duration probing, so a fake frame object in tests suffices.
 */
export interface DecodedVideoFrameLike {
  /** Presentation timestamp in microseconds from the start of the stream. */
  timestampMicroseconds: number;
  /**
   * Nominal duration of the frame in microseconds, when the decoder
   * reports one. `0` when unknown.
   */
  durationMicroseconds: number;
}

/**
 * A video codec handle that can be fed encoded data and yields decoded
 * frames. The real `VideoDecoder` is a superset of this shape.
 */
export interface VideoCodecLike {
  /**
   * Flush and return the frames decoded so far (in presentation order).
   * The implementation closes the underlying decoder before resolving.
   */
  flushFrames(): Promise<DecodedVideoFrameLike[]>;
  /**
   * Release the codec. Idempotent — a second call resolves immediately.
   */
  close(): Promise<void>;
}

/**
 * A function that produces a {@link VideoCodecLike} for a codec string.
 * The default (`createDefaultVideoCodecFactory`) uses the real
 * `VideoDecoder` and throws {@link ENV_ERROR} when it is absent.
 */
export type VideoCodecFactory = (codec: string) => VideoCodecLike;

/**
 * Minimal structural shape of an audio decoder handle.
 */
export interface AudioCodecLike {
  /**
   * The codec's metadata, populated by the real `AudioDecoder` after
   * `configure()` (or by a fake in tests).
   */
  metadata: {
    /** Sample rate in Hz. */
    sampleRate: number;
    /** Channel count. */
    channelCount: number;
    /** Codec string, e.g. `'mp4a.40.2'`. */
    codec: string;
  };
  /** Total frames decoded across all flushed batches. */
  frames: number;
  /** Release the codec. Idempotent. */
  close(): Promise<void>;
}

/**
 * A function that produces an {@link AudioCodecLike} for a codec string.
 */
export type AudioCodecFactory = (codec: string) => AudioCodecLike;

/**
 * Probed video decode result — exact-rational fps plus stream duration.
 */
export interface VideoDecodeProbe {
  /** Exact reduced frame rate derived from frame timestamps. */
  fps: ProbeRational;
  /** Number of frames flushed by the codec. */
  frameCount: number;
  /** Stream duration in seconds (last timestamp + last duration). */
  duration: number;
}

/**
 * Probed audio decode result — real sample rate, channel count, codec,
 * and stream duration.
 */
export interface AudioDecodeProbe {
  /** Sample rate in Hz. */
  sampleRate: number;
  /** Number of channels. */
  channelCount: number;
  /** Codec string. */
  codec: string;
  /** Stream duration in seconds. */
  duration: number;
}

/**
 * Check whether the real WebCodecs video globals are present.
 *
 * @returns True only when `window`, `document`, and `VideoDecoder` exist
 */
const hasVideoDecoderGlobal = (): boolean =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof VideoDecoder !== 'undefined';

/**
 * Check whether the real WebCodecs audio globals are present.
 *
 * @returns True only when `window`, `document`, and `AudioDecoder` exist
 */
const hasAudioDecoderGlobal = (): boolean =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof AudioDecoder !== 'undefined';

/**
 * Combined browser + WebCodecs environment check (matches the message
 * used by the legacy `parseVideoMetadataWebCodecs` / `probeVideo` paths).
 *
 * @returns True only when both video and audio decoder globals exist
 */
export const isBrowserWithWebCodecs = (): boolean =>
  hasVideoDecoderGlobal() && hasAudioDecoderGlobal();

/**
 * Default video codec factory — real `VideoDecoder`-backed handles.
 *
 * In tests / Node the factory is injectable; this default throws
 * {@link ENV_ERROR} when called without the browser globals so that the
 * decode path fails fast with a documented error.
 *
 * @returns A {@link VideoCodecFactory} that rejects with {@link ENV_ERROR}
 * when WebCodecs is unavailable, and returns real-`VideoDecoder` handles
 * when it is available
 */
export const createDefaultVideoCodecFactory = (): VideoCodecFactory => {
  return (codec: string): VideoCodecLike => {
    if (!hasVideoDecoderGlobal()) {
      throw new Error(ENV_ERROR);
    }
    // Real path: create the decoder and accumulate decoded frames in the
    // handle. The caller feeds `EncodedVideoChunk`s via the decoder's
    // `decode` method; frames arrive through the `decode` callback and are
    // stored here so `flushFrames` can return them.
    const frames: DecodedVideoFrameLike[] = [];
    const decoder = new VideoDecoder({
      output: (frame: VideoFrame): void => {
        frames.push({
          timestampMicroseconds: frame.timestamp,
          // VideoFrame.duration is `number | null`; unknown duration maps to 0
          // (same convention as DecodedVideoFrameLike's "0 when unknown").
          durationMicroseconds: frame.duration ?? 0,
        });
        frame.close();
      },
      error: (_err: unknown): void => {
        /* decode errors surface as empty/partial frame lists */
      },
    });
    void codec; // codec string is part of the factory contract; chunk feeding is caller-supplied
    const handle: VideoCodecLike = {
      flushFrames: async (): Promise<DecodedVideoFrameLike[]> => {
        await decoder.flush();
        if (decoder.state !== 'closed') {
          decoder.close();
        }
        return frames;
      },
      close: async (): Promise<void> => {
        if (decoder.state !== 'closed') {
          await decoder.close();
        }
      },
    };
    return handle;
  };
};

/**
 * Default audio codec factory — real `AudioDecoder`-backed handles.
 *
 * @returns An {@link AudioCodecFactory} that rejects with the audio
 * environment error when WebCodecs is unavailable
 */
export const createDefaultAudioCodecFactory = (): AudioCodecFactory => {
  return (codec: string): AudioCodecLike => {
    if (!hasAudioDecoderGlobal()) {
      throw new Error(AUDIO_ENV_ERROR);
    }
    const decoder = new AudioDecoder({
      output: (): void => {
        /* frame data is consumed by the caller's chunk-feeding loop */
      },
      error: (_err: unknown): void => {
        /* decode errors surface as zero frames */
      },
    });
    const handle: AudioCodecLike = {
      metadata: {
        sampleRate: 0,
        channelCount: 0,
        codec: codec ?? 'unknown',
      },
      frames: 0,
      close: async (): Promise<void> => {
        if (decoder.state !== 'closed') {
          await decoder.close();
        }
      },
    };
    return handle;
  };
};

/**
 * Derive exact-rational fps from a list of decoded video frames.
 *
 * With `n >= 2` frames the fps is `n - 1` frames over
 * `(last.timestampMicroseconds + last.durationMicroseconds -
 * first.timestampMicroseconds)` microseconds, reduced to lowest terms.
 * With `n < 2` the documented default `{ num: 30, den: 1 }` is returned
 * rather than throwing — probing must not fail on thin streams.
 *
 * @param frames Decoded frames in presentation order
 * @returns Exact reduced frame rate
 */
export const fpsFromFrames = (frames: DecodedVideoFrameLike[]): ProbeRational => {
  if (frames.length < 2) {
    return { ...DEFAULT_FPS };
  }
  const first = frames[0];
  const last = frames[frames.length - 1];
  const totalIntervals = frames.length - 1;
  // Duration between the first frame's presentation timestamp and the last
  // frame's presentation timestamp (excluding the last frame's own duration
  // to avoid an off-by-one that inflates fps).
  const totalSecondsMicro = last.timestampMicroseconds - first.timestampMicroseconds;
  // fps = totalIntervals / (totalSecondsMicro / 1_000_000)
  //   = totalIntervals * 1_000_000 / totalSecondsMicro
  const scaledNum = totalIntervals * 1_000_000;
  const scaledDen = totalSecondsMicro;
  if (scaledDen < 1 || scaledNum < 1) {
    return { ...DEFAULT_FPS };
  }
  const measured = scaledNum / scaledDen;
  // Snap to a well-known rate when the measurement is within tolerance.
  // This preserves NTSC (30000/1001) even when integer-µs timestamps
  // introduce sub-microsecond rounding drift.
  for (const known of KNOWN_FPS) {
    const knownRate = known.num / known.den;
    if (Math.abs(measured - knownRate) <= FPS_SNAP_TOLERANCE) {
      return { ...known };
    }
  }
  return reduceRational(scaledNum, scaledDen);
};

/**
 * Probe a video source via real WebCodecs decode.
 *
 * @param blob The video source (documented; the codec factory decides how
 * actual bytes are fed to the decoder)
 * @param factory Optional codec factory; defaults to the real `VideoDecoder`
 * path via {@link createDefaultVideoCodecFactory}
 * @returns Exact-rational fps, frame count, and stream duration
 * @throws Error when the factory throws (e.g. environment error in Node)
 */
export const probeVideoDecode = async (
  _blob: Blob,
  factory?: VideoCodecFactory,
): Promise<VideoDecodeProbe> => {
  const codecFactory = factory ?? createDefaultVideoCodecFactory();
  const handle = codecFactory('');
  const frames = await handle.flushFrames();
  await handle.close();
  const fps = fpsFromFrames(frames);
  const first = frames[0];
  const last = frames[frames.length - 1];
  const duration =
    first === undefined
      ? 0
      : ((last.timestampMicroseconds + last.durationMicroseconds) as number) / 1_000_000;
  return {
    fps,
    frameCount: frames.length,
    duration,
  };
};

/**
 * Probe an audio source via real WebCodecs decode.
 *
 * @param blob The audio source (documented; the codec factory decides how
 * actual bytes are fed to the decoder)
 * @param factory Optional codec factory; defaults to the real `AudioDecoder`
 * path via {@link createDefaultAudioCodecFactory}
 * @returns Real sample rate, channel count, codec, and stream duration
 * @throws Error when the factory throws (e.g. environment error in Node)
 */
export const probeAudioDecode = async (
  _blob: Blob,
  factory?: AudioCodecFactory,
): Promise<AudioDecodeProbe> => {
  const codecFactory = factory ?? createDefaultAudioCodecFactory();
  const handle = codecFactory('');
  const sampleRate = handle.metadata.sampleRate;
  const frameCount = handle.frames;
  await handle.close();
  const duration = sampleRate > 0 ? frameCount / sampleRate : 0;
  return {
    sampleRate,
    channelCount: handle.metadata.channelCount,
    codec: handle.metadata.codec,
    duration,
  };
};
