/**
 * BF-201: Browser-side export via WebCodecs (no server).
 *
 * Browser-side media export using WebCodecs encoders. Encodes frames
 * client-side and muxes to MP4/WebM, triggering a browser download
 * without any server involvement.
 *
 * The pure muxers (`muxMp4`, `muxWebm`) are testable in Node. The export
 * functions require a browser with WebCodecs and throw a clear error
 * otherwise.
 */

import { muxMp4 } from './mp4-muxer.js';
import { muxWebm } from './webm-muxer.js';

export interface ExportVideoOptions {
  readonly frames: readonly {
    readonly timestampMicroseconds: number;
    readonly durationMicroseconds: number;
  }[];
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly codec: string;
  readonly onProgress?: (progress: number) => void;
}

export interface ExportAudioOptions {
  readonly sampleCount: number;
  readonly sampleRate: number;
  readonly channelCount: number;
  readonly codec: string;
}

export interface ExportResult {
  readonly backend: 'browser';
  readonly format: 'mp4' | 'webm';
  readonly byteLength: number;
}

export type Mp4Options = Parameters<typeof muxMp4>[0];
export type WebmOptions = Parameters<typeof muxWebm>[0];

const isBrowserWithWebCodecs = (): boolean =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof VideoEncoder !== 'undefined' &&
  typeof AudioEncoder !== 'undefined';

/**
 * Encode video frames via WebCodecs VideoEncoder, mux to MP4, then download.
 * Throws outside a browser environment.
 */
export const exportVideoBrowser = async (
  options: ExportVideoOptions,
): Promise<ExportResult> => {
  if (!isBrowserWithWebCodecs()) {
    throw new Error(
      'exportVideoBrowser requires a browser environment with window, document, VideoEncoder, and AudioEncoder globals',
    );
  }

  const { frames, width, height, fps, codec, onProgress } = options;
  const chunks: Uint8Array[] = [];

  const encoder = new VideoEncoder({
    output: (chunk: EncodedVideoChunk) => {
      chunks.push(chunk as unknown as Uint8Array);
      if (onProgress) {
        onProgress(chunk.byteLength / (width * height * 4));
      }
    },
    error: (e: unknown) => {
      throw new Error(`VideoEncoder error: ${e}`);
    },
  });

  encoder.configure({
    codec,
    width,
    height,
  } as VideoEncoderConfig);

  for (const frame of frames) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
    }
    const videoFrame = new VideoFrame(canvas, {
      timestamp: frame.timestampMicroseconds * 1000,
      duration: (frame.durationMicroseconds ?? Math.round(1_000_000 / fps)) * 1000,
    });
    encoder.encode(videoFrame);
    videoFrame.close();
  }

  await encoder.flush();
  encoder.close();

  const videoChunks = chunks.map((c) => ({
    type: 'key' as const,
    byteLength: c.length,
    data: c as Uint8Array,
  }));

  const mp4Bytes = muxMp4({
    videoChunks,
    audioChunks: [],
    width,
    height,
    timescale: fps,
    duration: Math.round(
      frames[frames.length - 1]?.timestampMicroseconds ?? 0,
    ),
  });

  const blob = new Blob([mp4Bytes as unknown as BlobPart], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.mp4';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    backend: 'browser',
    format: 'mp4',
    byteLength: mp4Bytes.length,
  };
};

/**
 * Encode audio via WebCodecs AudioEncoder, mux to WebM, then download.
 * Throws outside a browser environment.
 */
export const exportAudioBrowser = async (
  options: ExportAudioOptions,
): Promise<ExportResult> => {
  if (!isBrowserWithWebCodecs()) {
    throw new Error(
      'exportAudioBrowser requires a browser environment with window, document, VideoEncoder, and AudioEncoder globals',
    );
  }

  const { sampleCount, sampleRate, channelCount, codec } = options;
  const chunks: Uint8Array[] = [];

  const encoder = new AudioEncoder({
    output: (chunk: EncodedAudioChunk) => {
      chunks.push(chunk as unknown as Uint8Array);
    },
    error: (e: unknown) => {
      throw new Error(`AudioEncoder error: ${e}`);
    },
  });

  encoder.configure({
    codec,
    sampleRate,
    numberOfChannels: channelCount,
  });

  const samplesPerFrame = Math.ceil(sampleCount / Math.ceil(sampleRate / 30));
  let samplesRemaining = sampleCount;

  while (samplesRemaining > 0) {
    const samplesThisFrame = Math.min(samplesPerFrame, samplesRemaining);
    const audioBuffer = new ArrayBuffer(samplesThisFrame * channelCount * 2);
    const audioData = new AudioData({
      data: audioBuffer,
      format: 'f32',
      numberOfChannels: channelCount,
      numberOfFrames: samplesThisFrame,
      sampleRate,
      timestamp: 0,
    });
    encoder.encode(audioData);
    audioData.close();
    samplesRemaining -= samplesThisFrame;
  }

  await encoder.flush();
  encoder.close();

  const webmBytes = muxWebm({
    videoChunks: [],
    audioChunks: chunks.map((c) => ({
      type: 'key' as const,
      byteLength: c.length,
      data: c as Uint8Array,
    })),
    width: 0,
    height: 0,
    duration: sampleCount / sampleRate,
  });

  const blob = new Blob([webmBytes.buffer as unknown as BlobPart], { type: 'audio/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.webm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    backend: 'browser',
    format: 'webm',
    byteLength: webmBytes.length,
  };
};

