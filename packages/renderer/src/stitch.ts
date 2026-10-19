/**
 * FFmpeg stitching of captured frames into videos [BF-021].
 *
 * Takes the numbered PNG/JPEG frame files produced by the capture path
 * (see `capture.ts`) and builds a deterministic ffmpeg argument array per
 * output codec. The pure layer ({@link CODEC_PROFILES},
 * {@link resolveFramePattern}, {@link buildStitchArgs}) is separated from
 * the spawn wrapper {@link stitchFrames}, which is injectable
 * ({@link SpawnFn}) so tests exercise arg construction and error mapping
 * without executing FFmpeg.
 *
 * Clean-room implementation.
 */
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { FrameRange } from './capture';
import { FFmpegNotFoundError, type SpawnFn } from './ffmpeg-decode';

/** Output codecs supported by the stitcher [BF-021]. */
export type StitchCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores' | 'gif' | 'png-sequence';

/** Per-codec profile: encoder, canonical container, default pixel format, extra flags. */
export interface StitchCodecProfile {
  /** FFmpeg video encoder emitted as `-c:v`. */
  readonly encoder: string;
  /** Canonical container extension for this codec (CLI default naming). */
  readonly extension: string;
  /** Pixel format pinned by default (`undefined` = leave to the encoder). */
  readonly pixelFormat?: string;
  /** Flags always emitted for this codec (muxer hints, encoder profile). */
  readonly extraArgs?: readonly string[];
}

/**
 * Codec profile matrix [BF-021]: h264/h265 → MP4 with `+faststart`,
 * vp8/vp9 → WebM, prores → MOV `prores_ks` profile 4444 (`yuv444p10le`,
 * alpha-ready for BF-023), gif and png-sequence encoder defaults.
 */
export const CODEC_PROFILES: Readonly<Record<StitchCodec, StitchCodecProfile>> = {
  h264: {
    encoder: 'libx264',
    extension: 'mp4',
    pixelFormat: 'yuv420p',
    extraArgs: ['-movflags', '+faststart'],
  },
  h265: {
    encoder: 'libx265',
    extension: 'mp4',
    pixelFormat: 'yuv420p',
    extraArgs: ['-movflags', '+faststart'],
  },
  vp8: { encoder: 'libvpx', extension: 'webm', pixelFormat: 'yuv420p' },
  vp9: { encoder: 'libvpx-vp9', extension: 'webm', pixelFormat: 'yuv420p' },
  prores: {
    encoder: 'prores_ks',
    extension: 'mov',
    pixelFormat: 'yuv444p10le',
    extraArgs: ['-profile:v', '4444'],
  },
  gif: { encoder: 'gif', extension: 'gif' },
  'png-sequence': { encoder: 'png', extension: 'png' },
};

/**
 * Alpha-capable pixel formats per codec, pinned when
 * {@link StitchOptions.transparentBackground} is set [BF-023].
 * Every other codec rejects the flag (see {@link buildStitchArgs}).
 */
export const ALPHA_PIXEL_FORMATS: Readonly<Record<'vp9' | 'prores', string>> = {
  vp9: 'yuva420p',
  prores: 'yuva444p10le',
};

/** Narrows to the codecs that can carry an alpha channel [BF-023]. */
const isAlphaCodec = (codec: StitchCodec): codec is keyof typeof ALPHA_PIXEL_FORMATS =>
  codec === 'vp9' || codec === 'prores';

/** Frame-file pattern assumed when the stitch input is a directory. */
export const DEFAULT_FRAME_PATTERN = 'frame-%06d.png';

/** Frames per second used when the `fps` option is omitted. */
export const DEFAULT_STITCH_FPS = 30;

/** True when `path` is already an image2 sequence pattern (`%d`/`%0Nd`). */
const isFramePattern = (path: string): boolean => /%(0\d+)?d/.test(path);

/**
 * Resolves the stitch input to an image2 sequence pattern: a path containing
 * `%d`/`%0Nd` passes through unchanged; a directory gets
 * {@link DEFAULT_FRAME_PATTERN} appended (the PNG naming of the capture
 * output). For JPEG frames pass an explicit pattern.
 *
 * @param inputDirOrPattern Directory of numbered frames or an explicit pattern
 * @returns The ffmpeg input pattern
 */
export function resolveFramePattern(inputDirOrPattern: string): string {
  return isFramePattern(inputDirOrPattern)
    ? inputDirOrPattern
    : join(inputDirOrPattern, DEFAULT_FRAME_PATTERN);
}

/** Options for frame stitching (see {@link buildStitchArgs} / {@link stitchFrames}). */
export interface StitchOptions {
  /** Output codec (default `'h264'`). */
  codec?: StitchCodec;
  /** Input sequence frame rate (default {@link DEFAULT_STITCH_FPS}). */
  fps?: number;
  /**
   * Constant-quality CRF (lossy codecs: h264/h265/vp8/vp9); mutually
   * exclusive with {@link bitrate}.
   */
  crf?: number;
  /** Target bitrate, e.g. `'5M'` or `'5000k'`; mutually exclusive with {@link crf}. */
  bitrate?: string;
  /** Output size for the scale filter, e.g. `'1280:-2'` (half-width-even). */
  scale?: string;
  /** Output pixel format (overrides the codec profile default). */
  pixelFormat?: string;
  /** Output color space metadata, e.g. `'bt709'` (`-colorspace`). */
  colorSpace?: string;
  /**
   * Render on a transparent background (alpha channel) [BF-023]. Only the
   * codecs in {@link ALPHA_PIXEL_FORMATS} support it — `vp9` pins
   * `yuva420p` (WebM alpha) and `prores` pins `yuva444p10le` (ProRes 4444
   * alpha). Mutually exclusive with {@link pixelFormat}.
   */
  transparentBackground?: boolean;
  /** Half-open input frame range `[start, end)` to encode (default: all). */
  frameRange?: FrameRange;
  /** Output file path — for `'png-sequence'`, a `%d` image pattern. */
  output: string;
}

/**
 * Builds the deterministic ffmpeg argv that stitches the numbered frame
 * files in `inputDirOrPattern` into `options.output` [BF-021]. Pure — no
 * process is spawned; run it via {@link stitchFrames}.
 *
 * Layout: global flags, `-framerate` (input), optional `-start_number`,
 * `-i <pattern>`, codec + quality + profile flags, pixel format, filters,
 * color space, optional `-frames:v`, output path.
 *
 * @param inputDirOrPattern Directory of numbered frames or an explicit
 *   image2 pattern (see {@link resolveFramePattern})
 * @param options Codec, fps, quality, scale, pixel format, color space,
 *   transparent background (alpha), frame range and output path
 * @returns The full ffmpeg argv (command is always `'ffmpeg'`)
 * @throws {RangeError} synchronously on invalid options — nothing is built
 *   (including alpha-incapable codecs with `transparentBackground`)
 */
export function buildStitchArgs(inputDirOrPattern: string, options: StitchOptions): string[] {
  if (inputDirOrPattern.length === 0) {
    throw new RangeError('buildStitchArgs: inputDirOrPattern must be a non-empty path or %d pattern');
  }
  if (options.output.length === 0) {
    throw new RangeError('buildStitchArgs: output must be a non-empty path');
  }
  const codec = options.codec ?? 'h264';
  const profile = (CODEC_PROFILES as Record<string, StitchCodecProfile | undefined>)[codec];
  if (profile === undefined) {
    throw new RangeError(
      `buildStitchArgs: unknown codec '${String(codec)}' (expected one of: ${Object.keys(CODEC_PROFILES).join(', ')})`,
    );
  }
  const fps = options.fps ?? DEFAULT_STITCH_FPS;
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError(`buildStitchArgs: fps must be a finite number > 0, got ${options.fps}`);
  }
  if (options.crf !== undefined) {
    if (!Number.isInteger(options.crf) || options.crf < 0 || options.crf > 63) {
      throw new RangeError(`buildStitchArgs: crf must be an integer in [0, 63], got ${options.crf}`);
    }
    if (options.bitrate !== undefined) {
      throw new RangeError('buildStitchArgs: crf and bitrate are mutually exclusive');
    }
  }
  const nonEmpty = (name: 'bitrate' | 'scale' | 'pixelFormat' | 'colorSpace', value: string): void => {
    if (value.length === 0) {
      throw new RangeError(`buildStitchArgs: ${name} must be a non-empty string`);
    }
  };
  if (options.bitrate !== undefined) nonEmpty('bitrate', options.bitrate);
  if (options.scale !== undefined) nonEmpty('scale', options.scale);
  if (options.pixelFormat !== undefined) nonEmpty('pixelFormat', options.pixelFormat);
  if (options.colorSpace !== undefined) nonEmpty('colorSpace', options.colorSpace);
  if (
    options.transparentBackground !== undefined &&
    typeof options.transparentBackground !== 'boolean'
  ) {
    throw new RangeError('buildStitchArgs: transparentBackground must be a boolean when provided');
  }
  if (options.transparentBackground === true) {
    if (!isAlphaCodec(codec)) {
      throw new RangeError(
        `buildStitchArgs: transparentBackground is not supported by codec '${codec}' — h264/MP4 ` +
          'has no alpha channel; alpha output requires vp9 ' +
          `(WebM, ${ALPHA_PIXEL_FORMATS.vp9}) or prores (MOV ProRes 4444, ` +
          `${ALPHA_PIXEL_FORMATS.prores}). Run 'brandlyframes doctor' to verify the ` +
          'installed FFmpeg supports alpha encoding.',
      );
    }
    if (options.pixelFormat !== undefined) {
      throw new RangeError(
        'buildStitchArgs: pixelFormat and transparentBackground are mutually exclusive — ' +
          `transparentBackground pins '${ALPHA_PIXEL_FORMATS[codec]}' for ${codec}`,
      );
    }
  }
  const range = options.frameRange;
  if (range !== undefined) {
    const { start, end } = range;
    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
      throw new RangeError(
        `buildStitchArgs: frameRange must be a half-open integer range [start, end) with end > start, got [${start}, ${end})`,
      );
    }
  }
  if (codec === 'png-sequence' && !isFramePattern(options.output)) {
    throw new RangeError(
      `buildStitchArgs: png-sequence output must be a %d image pattern (e.g. out-%06d.png), got '${options.output}'`,
    );
  }

  const args: string[] = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps)];
  if (range !== undefined) args.push('-start_number', String(range.start));
  args.push('-i', resolveFramePattern(inputDirOrPattern));
  args.push('-c:v', profile.encoder);
  if (options.crf !== undefined) args.push('-crf', String(options.crf));
  if (options.bitrate !== undefined) args.push('-b:v', options.bitrate);
  if (profile.extraArgs !== undefined) args.push(...profile.extraArgs);
  const pixelFormat =
    options.pixelFormat ??
    (options.transparentBackground === true && isAlphaCodec(codec)
      ? ALPHA_PIXEL_FORMATS[codec]
      : profile.pixelFormat);
  if (pixelFormat !== undefined) args.push('-pix_fmt', pixelFormat);
  if (options.scale !== undefined) args.push('-vf', `scale=${options.scale}`);
  if (options.colorSpace !== undefined) args.push('-colorspace', options.colorSpace);
  if (range !== undefined) args.push('-frames:v', String(range.end - range.start));
  args.push(options.output);
  return args;
}

/** Options for {@link stitchFrames}: stitch options plus an injectable spawn. */
export interface StitchFramesOptions extends StitchOptions {
  /** Optional spawn override for tests; defaults to `child_process.spawn`. */
  spawnFn?: SpawnFn;
}

/** Default spawn: real `child_process.spawn` (stdio pipes). */
const defaultSpawnFn: SpawnFn = (command, args) => spawn(command, args);

/**
 * Stitches the numbered frame files in `inputDirOrPattern` into
 * `options.output` by spawning FFmpeg with the deterministic argv from
 * {@link buildStitchArgs} [BF-021]. The output is overwritten (`-y`).
 *
 * Runs e.g.: `ffmpeg -hide_banner -loglevel error -y -framerate 30
 * -i <pattern> -c:v libx264 -movflags +faststart -pix_fmt yuv420p <output>`.
 *
 * @param inputDirOrPattern Directory of numbered frames or an explicit
 *   image2 pattern (see {@link resolveFramePattern})
 * @param options Stitch options plus optional injected spawn
 * @returns promise resolving once FFmpeg exits 0
 * @throws {RangeError} synchronously on invalid options (nothing is spawned)
 * @rejects {FFmpegNotFoundError} if the spawn fails with `ENOENT`
 * @rejects {Error} on any other spawn error (with `cause`), or when FFmpeg
 *   exits non-zero (the message includes FFmpeg's stderr)
 */
export const stitchFrames = (
  inputDirOrPattern: string,
  options: StitchFramesOptions,
): Promise<void> => {
  const args = buildStitchArgs(inputDirOrPattern, options);
  const spawnFn = options.spawnFn ?? defaultSpawnFn;
  return new Promise<void>((resolve, reject) => {
    const child = spawnFn('ffmpeg', args);
    let stderrText = '';
    let settled = false;
    child.stderr.on('data', (chunk) => {
      stderrText += Buffer.from(chunk).toString('utf8');
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      if (error.code === 'ENOENT') {
        reject(new FFmpegNotFoundError());
      } else {
        reject(new Error(`Failed to spawn FFmpeg: ${error.message}`, { cause: error }));
      }
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolve();
      } else {
        const stderr = stderrText.trim();
        reject(
          new Error(`stitchFrames: FFmpeg exited with code ${code}${stderr ? `: ${stderr}` : ''}`),
        );
      }
    });
    child.stdin?.end();
  });
};
