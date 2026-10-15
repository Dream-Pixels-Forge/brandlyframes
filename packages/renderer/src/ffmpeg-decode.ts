/**
 * FFmpeg decode backend for the render path [BF-053].
 *
 * `brandlyframes render` runs headless: instead of WebCodecs / `<video>`,
 * frames are extracted by spawning a real FFmpeg process that selects ONE
 * exact frame (zero-based index) and writes it as PNG to stdout.
 *
 * The spawn step is injectable ({@link SpawnFn}) so tests exercise the full
 * arg construction and error mapping without executing FFmpeg.
 *
 * Clean-room implementation.
 */
import { spawn } from 'node:child_process';

/**
 * Minimal stream surface consumed from a spawned child's stdout/stderr:
 * a `data` listener that receives byte chunks.
 */
export interface SpawnedStream {
  /**
   * Registers a `data` listener.
   *
   * @param event - must be `'data'`
   * @param listener - receives a chunk of raw bytes
   */
  on(event: 'data', listener: (chunk: Uint8Array) => void): unknown;
}

/**
 * Spawn failure with an optional POSIX error code (e.g. `'ENOENT'`,
 * `'EACCES'`), mirroring Node's `ErrnoException` shape without depending on
 * Node type globals in the public API.
 */
export interface SpawnError extends Error {
  /** POSIX error code, if the failure carries one. */
  readonly code?: string;
}

/**
 * Minimal child-process handle required by {@link decodeFrameFFmpeg}.
 * `node:child_process`'s `ChildProcess` satisfies it structurally.
 */
export interface SpawnedProcessHandle {
  /** Raw encoded frame bytes arrive here. */
  readonly stdout: SpawnedStream;
  /** FFmpeg diagnostics arrive here. */
  readonly stderr: SpawnedStream;
  /** Stdin is not used (input is a file); closed defensively if present. */
  readonly stdin?: { end(): unknown } | null;
  /**
   * Registers a spawn/IPC error listener.
   *
   * @param event - must be `'error'`
   * @param listener - receives the spawn error (e.g. ENOENT)
   */
  on(event: 'error', listener: (error: SpawnError) => void): unknown;
  /**
   * Registers a process-exit listener.
   *
   * @param event - must be `'close'`
   * @param listener - receives the exit code and signal
   */
  on(event: 'close', listener: (code: number | null, signal: string | null) => void): unknown;
}

/**
 * Injectable spawn function: given a command and argv, returns a minimal
 * child-like handle. Defaults to `node:child_process.spawn`.
 */
export type SpawnFn = (command: string, args: readonly string[]) => SpawnedProcessHandle;

/** Options for {@link decodeFrameFFmpeg}. */
export interface DecodeFrameFFmpegOptions {
  /** Path (or URL) of the input video file. */
  input: string;
  /** Zero-based index of the exact frame to extract. */
  frameIndex: number;
  /** Optional spawn override for tests; defaults to `child_process.spawn`. */
  spawnFn?: SpawnFn;
}

/**
 * Error thrown when spawning FFmpeg fails with `ENOENT` — the binary is not
 * on `PATH`.
 */
export class FFmpegNotFoundError extends Error {
  /** Actionable message: FFmpeg missing, how to install, doctor hint. */
  constructor(message?: string) {
    super(
      message ??
        'FFmpeg binary was not found (spawn ENOENT). Install FFmpeg ' +
          '(https://ffmpeg.org/download.html) or run `brandlyframes doctor` ' +
          'for the zero-setup toolchain.',
    );
    this.name = 'FFmpegNotFoundError';
  }
}


/** Default spawn: real `child_process.spawn` (stdio pipes). */
const defaultSpawnFn: SpawnFn = (command, args) => spawn(command, args);

/**
 * Extracts ONE exact frame from a video file as PNG bytes via headless FFmpeg.
 *
 * Runs: `ffmpeg -hide_banner -loglevel error -i <input>
 * -vf select=eq(n\,<frameIndex>) -vsync 0 -vframes 1 -f image2pipe
 * -vcodec png pipe:1` and resolves with the concatenated PNG bytes read from
 * stdout.
 *
 * @param options - input path, frame index, optional injected spawn
 * @returns promise resolving to the PNG-encoded frame bytes
 * @throws {Error} synchronously if `frameIndex` is not a non-negative
 *   safe integer (nothing is spawned)
 * @rejects {FFmpegNotFoundError} if the spawn fails with `ENOENT`
 * @rejects {Error} on any other spawn error, or when FFmpeg exits non-zero
 *   (the message includes FFmpeg's stderr)
 */
export const decodeFrameFFmpeg = (options: DecodeFrameFFmpegOptions): Promise<Uint8Array> => {
  const { input, frameIndex } = options;
  if (!Number.isSafeInteger(frameIndex) || frameIndex < 0) {
    throw new Error(`frameIndex must be a non-negative safe integer, got ${frameIndex}`);
  }
  const spawnFn = options.spawnFn ?? defaultSpawnFn;
  const args: readonly string[] = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    input,
    '-vf',
    `select=eq(n\\,${frameIndex})`,
    '-vsync',
    '0',
    '-vframes',
    '1',
    '-f',
    'image2pipe',
    '-vcodec',
    'png',
    'pipe:1',
  ];
  return new Promise<Uint8Array>((resolve, reject) => {
    const child = spawnFn('ffmpeg', args);
    const chunks: Uint8Array[] = [];
    let stderrText = '';
    let settled = false;
    child.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderrText += Buffer.from(chunk).toString('utf8');
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      if (error.code === 'ENOENT') {
        reject(new FFmpegNotFoundError());
      } else {
        reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
      }
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) {
        const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const frame = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          frame.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(frame);
      } else {
        const stderr = stderrText.trim();
        reject(new Error(`FFmpeg exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
      }
    });
    child.stdin?.end();
  });
};
