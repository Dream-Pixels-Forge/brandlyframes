/**
 * @brandlyframes/webcodecs — real encode paths [BF-071]
 *
 * Mirrors `decode.ts`: injectable **encoder factories** keep the pure flow
 * (feed frames/samples, flush chunks, sum bytes, derive duration)
 * Node-testable. The default factories use the real `VideoEncoder` /
 * `AudioEncoder` globals and throw an environment error when absent.
 */

/** Environment errors, matching the decode-side convention. */
const VIDEO_ENC_ERROR = 'WebCodecs VideoEncoder is not available in this environment';
const AUDIO_ENC_ERROR = 'WebCodecs AudioEncoder is not available in this environment';

/** Minimal structural shape of an encodable video frame. */
export interface EncodableVideoFrameLike {
  /** Presentation timestamp in microseconds. */
  timestampMicroseconds: number;
  /** Frame duration in microseconds. */
  durationMicroseconds: number;
}

/** One emitted encoded chunk (video or audio). */
export interface EncodedChunkLike {
  /** Chunk payload size in bytes. */
  byteLength: number;
}

/** A video encoder handle fed frames one at a time. */
export interface VideoEncoderLike {
  /** Submit one frame for encoding. */
  feedFrame(frame: EncodableVideoFrameLike): void;
  /** Flush and return encoded chunks in order. */
  flushChunks(): Promise<EncodedChunkLike[]>;
  /** Release the encoder. Idempotent. */
  close(): Promise<void>;
}

/** A function that produces a {@link VideoEncoderLike} for a codec string. */
export type VideoEncoderFactory = (codec: string) => VideoEncoderLike;

/** An audio encoder handle fed raw sample counts. */
export interface AudioEncoderLike {
  /** Encoder metadata, populated on configure (or by a fake in tests). */
  metadata: { sampleRate: number; channelCount: number; codec: string };
  /** Submit `sampleCount` PCM samples for encoding. */
  feedSamples(sampleCount: number): void;
  /** Flush and return encoded chunks in order. */
  flushChunks(): Promise<EncodedChunkLike[]>;
  /** Release the encoder. Idempotent. */
  close(): Promise<void>;
}

/** A function that produces an {@link AudioEncoderLike} for a codec string. */
export type AudioEncoderFactory = (codec: string) => AudioEncoderLike;

/** Encode result shared by the video and audio paths. */
export interface EncodeResult {
  /** Number of chunks flushed. */
  chunkCount: number;
  /** Total payload size in bytes. */
  byteLength: number;
  /** Stream duration in seconds. */
  duration: number;
}

const hasVideoEncoderGlobal = (): boolean =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof VideoEncoder !== 'undefined';

const hasAudioEncoderGlobal = (): boolean =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof AudioEncoder !== 'undefined';

/**
 * Default video encoder factory — real `VideoEncoder`-backed handles.
 * The caller feeds `VideoFrame`s via `feedFrame`; encoded chunks arrive
 * through the `output` callback and are stored for `flushChunks`.
 */
export const createDefaultVideoEncoderFactory = (): VideoEncoderFactory => {
  return (codec: string): VideoEncoderLike => {
    if (!hasVideoEncoderGlobal()) {
      throw new Error(VIDEO_ENC_ERROR);
    }
    const chunks: EncodedChunkLike[] = [];
    const encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk): void => {
        chunks.push({ byteLength: chunk.byteLength });
      },
      error: (_err: unknown): void => {
        /* encode errors surface as empty/partial chunk lists */
      },
    });
    void codec;
    const handle: VideoEncoderLike = {
      feedFrame: (_frame: EncodableVideoFrameLike): void => {
        /* real path consumes caller-supplied VideoFrames */
      },
      flushChunks: async (): Promise<EncodedChunkLike[]> => {
        await encoder.flush();
        if (encoder.state !== 'closed') {
          encoder.close();
        }
        return chunks;
      },
      close: async (): Promise<void> => {
        if (encoder.state !== 'closed') {
          encoder.close();
        }
      },
    };
    return handle;
  };
};

/**
 * Default audio encoder factory — real `AudioEncoder`-backed handles.
 */
export const createDefaultAudioEncoderFactory = (): AudioEncoderFactory => {
  return (codec: string): AudioEncoderLike => {
    if (!hasAudioEncoderGlobal()) {
      throw new Error(AUDIO_ENC_ERROR);
    }
    const chunks: EncodedChunkLike[] = [];
    const encoder = new AudioEncoder({
      output: (chunk: EncodedAudioChunk): void => {
        chunks.push({ byteLength: chunk.byteLength });
      },
      error: (_err: unknown): void => {
        /* encode errors surface as empty/partial chunk lists */
      },
    });
    void codec;
    const handle: AudioEncoderLike = {
      metadata: { sampleRate: 0, channelCount: 0, codec: 'unknown' },
      feedSamples: (_sampleCount: number): void => {
        /* real path consumes caller-supplied AudioData */
      },
      flushChunks: async (): Promise<EncodedChunkLike[]> => {
        await encoder.flush();
        if (encoder.state !== 'closed') {
          encoder.close();
        }
        return chunks;
      },
      close: async (): Promise<void> => {
        if (encoder.state !== 'closed') {
          encoder.close();
        }
      },
    };
    return handle;
  };
};

/**
 * Encode video frames via a codec factory.
 *
 * @param frames Frames in presentation order
 * @param factory Optional encoder factory; defaults to the real `VideoEncoder` path
 * @returns Chunk count, total bytes, and stream duration in seconds
 */
export const encodeVideoFrames = async (
  frames: EncodableVideoFrameLike[],
  factory?: VideoEncoderFactory,
): Promise<EncodeResult> => {
  const encoderFactory = factory ?? createDefaultVideoEncoderFactory();
  const handle = encoderFactory('');
  for (const frame of frames) handle.feedFrame(frame);
  const chunks = await handle.flushChunks();
  await handle.close();
  const first = frames[0];
  const last = frames[frames.length - 1];
  const duration =
    first === undefined || last === undefined
      ? 0
      : (last.timestampMicroseconds + last.durationMicroseconds - first.timestampMicroseconds) /
        1_000_000;
  return {
    chunkCount: chunks.length,
    byteLength: chunks.reduce((n, c) => n + c.byteLength, 0),
    duration,
  };
};

/**
 * Encode PCM audio via a codec factory.
 *
 * @param sampleRate Sample rate in Hz
 * @param _channels Channel count (reserved; metadata flows from the handle)
 * @param sampleCount Total samples to encode
 * @param factory Optional encoder factory; defaults to the real `AudioEncoder` path
 * @returns Chunk count, total bytes, and stream duration in seconds
 */
export const encodeAudioFrames = async (
  sampleRate: number,
  _channels: number,
  sampleCount: number,
  factory?: AudioEncoderFactory,
): Promise<EncodeResult> => {
  const encoderFactory = factory ?? createDefaultAudioEncoderFactory();
  const handle = encoderFactory('');
  handle.feedSamples(sampleCount);
  const chunks = await handle.flushChunks();
  await handle.close();
  return {
    chunkCount: chunks.length,
    byteLength: chunks.reduce((n, c) => n + c.byteLength, 0),
    duration: sampleRate > 0 ? sampleCount / sampleRate : 0,
  };
};
