/**
 * FFmpeg audio mixing for the render path [BF-022].
 *
 * Mixes one or more audio tracks into a single output file, with per-track
 * volume curves (constant volume or frame-anchored keyframes), fade in/out,
 * start offset and frame-mapped durations. Frames map to seconds through the
 * composition fps (`frames / fps`), so every timing option is expressed in
 * composition frames.
 *
 * The pure layer ({@link buildMixArgs}) is separated from the spawn wrapper
 * {@link mixAudio}, which is injectable ({@link SpawnFn}) so tests exercise
 * arg construction and error mapping without executing FFmpeg.
 *
 * Per-track filtergraph chain (only the needed filters are emitted):
 * `[i:a]atrim(end),asetpts=PTS-STARTPTS,volume,afade-in,afade-out,adelay[aN]`
 * — `t` inside volume expressions and fades is the track-local timestamp in
 * seconds (0 = the track's first audible sample, before the offset delay).
 *
 * Clean-room implementation.
 */
import { spawn } from 'node:child_process';
import { FFmpegNotFoundError, type SpawnFn } from './ffmpeg-decode.js';

/** Frames per second used when the `fps` option is omitted. */
export const DEFAULT_MIX_FPS = 30;

/** One keyframe of a per-track volume curve [BF-022]. */
export interface VolumeKeyframe {
  /**
   * Track-local composition frame this keyframe anchors to: `0` is the
   * track's first audible sample (before the track offset is applied).
   */
  readonly frame: number;
  /** Volume multiplier at this frame (>= 0). */
  readonly volume: number;
}

/** One audio track in a mix [BF-022]. */
export interface AudioTrackInput {
  /** Path to the audio file (anything FFmpeg demuxes: wav/mp3/aac/...). */
  readonly src: string;
  /**
   * Constant volume multiplier (>= 0). Mutually exclusive with
   * {@link volumeCurve}.
   */
  readonly volume?: number;
  /**
   * Volume keyframes, linearly interpolated between frames and held before
   * the first / after the last keyframe. Track-local frames (see
   * {@link VolumeKeyframe.frame}). Mutually exclusive with {@link volume}.
   */
  readonly volumeCurve?: readonly VolumeKeyframe[];
  /** Fade-in length in track-local frames (>= 1). Omit for no fade-in. */
  readonly fadeInFrames?: number;
  /**
   * Fade-out length in track-local frames (>= 1), ending at the track end —
   * requires {@link durationInFrames} (the end must be known).
   */
  readonly fadeOutFrames?: number;
  /** Silence before the track's first sample, in composition frames (>= 0, default 0). */
  readonly offsetFrames?: number;
  /**
   * Length of the source audio mixed, in composition frames (>= 1). Omit to
   * mix the full source.
   */
  readonly durationInFrames?: number;
}

/** Options for {@link buildMixArgs}. */
export interface MixAudioOptions {
  /** Composition fps used to map every frame number to seconds (default {@link DEFAULT_MIX_FPS}). */
  fps?: number;
  /** Output file path (audio encoder/format is chosen by the extension). */
  output: string;
}

/** Options for {@link mixAudio}: mix options plus an injectable spawn. */
export interface MixAudioSpawnOptions extends MixAudioOptions {
  /** Optional spawn override for tests; defaults to `child_process.spawn`. */
  spawnFn?: SpawnFn;
}

/** Seconds for `frames` at `fps` (frame-mapped, full double precision). */
const framesToSeconds = (frames: number, fps: number): number => frames / fps;

/**
 * Builds the piecewise-linear `volume` filter expression for a validated
 * keyframe list: linear ramps between keyframes, holding the first value
 * before and the last value after the curve. Commas are backslash-escaped
 * for the ffmpeg filtergraph parser; `t` is the track-local timestamp.
 */
const buildVolumeExpression = (keys: readonly VolumeKeyframe[], fps: number): string => {
  const times = keys.map((key) => String(framesToSeconds(key.frame, fps)));
  const volumes = keys.map((key) => String(key.volume));
  // Linear interpolation between keyframe i and i+1.
  const lerp = (i: number): string =>
    `(${volumes[i]}+(${volumes[i + 1]}-${volumes[i]})*(t-${times[i]})/(${times[i + 1]}-${times[i]}))`;
  let expression = volumes[keys.length - 1] as string;
  for (let i = keys.length - 2; i >= 0; i--) {
    expression = `if(lt(t\\,${times[i + 1]})\\,${lerp(i)}\\,${expression})`;
  }
  const first = keys[0] as VolumeKeyframe;
  if (first.frame > 0) {
    // Hold the first keyframe's volume until the curve starts.
    expression = `if(lt(t\\,${times[0]})\\,${volumes[0]}\\,${expression})`;
  }
  return expression;
};

/** Builds the per-track filtergraph chain (track-local filters, no label). */
const buildTrackChain = (track: AudioTrackInput, fps: number): string => {
  const filters: string[] = [];
  if (track.durationInFrames !== undefined) {
    filters.push(`atrim=end=${framesToSeconds(track.durationInFrames, fps)}`);
  }
  filters.push('asetpts=PTS-STARTPTS');
  if (track.volumeCurve !== undefined) {
    filters.push(`volume=${buildVolumeExpression(track.volumeCurve, fps)}:eval=frame`);
  } else if (track.volume !== undefined) {
    filters.push(`volume=${track.volume}`);
  }
  if (track.fadeInFrames !== undefined) {
    filters.push(`afade=t=in:st=0:d=${framesToSeconds(track.fadeInFrames, fps)}`);
  }
  if (track.fadeOutFrames !== undefined && track.durationInFrames !== undefined) {
    const start = framesToSeconds(track.durationInFrames - track.fadeOutFrames, fps);
    filters.push(`afade=t=out:st=${start}:d=${framesToSeconds(track.fadeOutFrames, fps)}`);
  }
  if (track.offsetFrames !== undefined) {
    filters.push(`adelay=${framesToSeconds(track.offsetFrames, fps) * 1000}:all=1`);
  }
  return filters.join(',');
};

/** Validates one track; `index` names the offending track in the message. */
const validateTrack = (track: AudioTrackInput, index: number): void => {
  const context = `track ${index}: `;
  if (typeof track.src !== 'string' || track.src.length === 0) {
    throw new RangeError(`buildMixArgs: ${context}src must be a non-empty path`);
  }
  if (track.volume !== undefined) {
    if (!Number.isFinite(track.volume) || track.volume < 0) {
      throw new RangeError(
        `buildMixArgs: ${context}volume must be a finite number >= 0, got ${track.volume}`,
      );
    }
    if (track.volumeCurve !== undefined) {
      throw new RangeError(`buildMixArgs: ${context}volume and volumeCurve are mutually exclusive`);
    }
  }
  if (track.volumeCurve !== undefined) {
    if (!Array.isArray(track.volumeCurve) || track.volumeCurve.length === 0) {
      throw new RangeError(`buildMixArgs: ${context}volumeCurve must be a non-empty keyframe array`);
    }
    let previousFrame = -1;
    for (const key of track.volumeCurve) {
      if (!Number.isInteger(key.frame) || key.frame < 0) {
        throw new RangeError(
          `buildMixArgs: ${context}volumeCurve keyframe frame must be an integer >= 0, got ${key.frame}`,
        );
      }
      if (key.frame <= previousFrame) {
        throw new RangeError(
          `buildMixArgs: ${context}volumeCurve keyframe frames must be strictly increasing, ` +
            `got ${key.frame} after ${previousFrame}`,
        );
      }
      previousFrame = key.frame;
      if (!Number.isFinite(key.volume) || key.volume < 0) {
        throw new RangeError(
          `buildMixArgs: ${context}volumeCurve keyframe volume must be a finite number >= 0, ` +
            `got ${key.volume}`,
        );
      }
    }
  }
  const validateInt = (name: string, value: number | undefined, min: number): void => {
    if (value !== undefined && (!Number.isInteger(value) || value < min)) {
      throw new RangeError(`buildMixArgs: ${context}${name} must be an integer >= ${min}, got ${value}`);
    }
  };
  validateInt('fadeInFrames', track.fadeInFrames, 1);
  validateInt('fadeOutFrames', track.fadeOutFrames, 1);
  validateInt('offsetFrames', track.offsetFrames, 0);
  validateInt('durationInFrames', track.durationInFrames, 1);
  if (track.fadeOutFrames !== undefined && track.durationInFrames === undefined) {
    throw new RangeError(
      `buildMixArgs: ${context}fadeOutFrames requires durationInFrames ` +
        '(the fade-out must end at a known track end)',
    );
  }
  if (
    track.fadeOutFrames !== undefined &&
    track.durationInFrames !== undefined &&
    track.fadeOutFrames > track.durationInFrames
  ) {
    throw new RangeError(
      `buildMixArgs: ${context}fadeOutFrames (${track.fadeOutFrames}) must not exceed ` +
        `durationInFrames (${track.durationInFrames})`,
    );
  }
};

/**
 * Builds the deterministic ffmpeg argv that mixes the given audio tracks
 * into `options.output` [BF-022]. Pure — no process is spawned; run it via
 * {@link mixAudio}.
 *
 * Layout: global flags, one `-i` per track, the `-filter_complex` graph
 * (per-track chains + `amix` when mixing more than one track, with
 * `normalize=0` so authored volumes are preserved), `-map [mix]`, output
 * path.
 *
 * @param inputs One or more audio tracks (see {@link AudioTrackInput})
 * @param options Output path and the fps used for frame→seconds mapping
 * @returns The full ffmpeg argv (command is always `'ffmpeg'`)
 * @throws {RangeError} synchronously on invalid options — nothing is built
 */
export function buildMixArgs(inputs: readonly AudioTrackInput[], options: MixAudioOptions): string[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new RangeError('buildMixArgs: inputs must be a non-empty array of audio tracks');
  }
  if (options.output.length === 0) {
    throw new RangeError('buildMixArgs: output must be a non-empty path');
  }
  const fps = options.fps ?? DEFAULT_MIX_FPS;
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError(`buildMixArgs: fps must be a finite number > 0, got ${options.fps}`);
  }
  inputs.forEach((track, index) => validateTrack(track, index));

  const multiple = inputs.length > 1;
  const segments = inputs.map((track, index) => {
    const label = multiple ? `a${index}` : 'mix';
    return `[${index}:a]${buildTrackChain(track, fps)}[${label}]`;
  });
  if (multiple) {
    const labels = inputs.map((_, index) => `[a${index}]`).join('');
    segments.push(`${labels}amix=inputs=${inputs.length}:normalize=0[mix]`);
  }
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    ...inputs.flatMap((track) => ['-i', track.src]),
    '-filter_complex',
    segments.join(';'),
    '-map',
    '[mix]',
    options.output,
  ];
}

/** Default spawn: real `child_process.spawn` (stdio pipes). */
const defaultSpawnFn: SpawnFn = (command, args) => spawn(command, args);

/**
 * Mixes the given audio tracks into `options.output` by spawning FFmpeg with
 * the deterministic argv from {@link buildMixArgs} [BF-022]. The output is
 * overwritten (`-y`).
 *
 * @param inputs One or more audio tracks (see {@link AudioTrackInput})
 * @param options Mix options plus optional injected spawn
 * @returns promise resolving once FFmpeg exits 0
 * @throws {RangeError} synchronously on invalid options (nothing is spawned)
 * @rejects {FFmpegNotFoundError} if the spawn fails with `ENOENT`
 * @rejects {Error} on any other spawn error (with `cause`), or when FFmpeg
 *   exits non-zero (the message includes FFmpeg's stderr)
 */
export const mixAudio = (
  inputs: readonly AudioTrackInput[],
  options: MixAudioSpawnOptions,
): Promise<void> => {
  const args = buildMixArgs(inputs, options);
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
        reject(new Error(`mixAudio: FFmpeg exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
      }
    });
    child.stdin?.end();
  });
};
