import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import {
  decodeFrameFFmpeg,
  FFmpegNotFoundError,
  type SpawnFn,
} from '../src/index';

/**
 * FFmpeg decode backend for the render path [BF-053].
 *
 * `decodeFrameFFmpeg` spawns a headless FFmpeg process to extract ONE exact
 * frame (by zero-based frame index) from a video file as PNG bytes on
 * stdout. All tests inject a mock `spawnFn` — no real FFmpeg is executed.
 */
describe('decodeFrameFFmpeg [BF-053]', () => {
  /** Minimal child-like handle: an EventEmitter plus stdout/stderr/stdin. */
  class MockChild extends EventEmitter {
    readonly stdout = new EventEmitter();
    readonly stderr = new EventEmitter();
    readonly stdin = { end: vi.fn() };
  }

  /** Builds a mock spawnFn that records calls and returns the mock child. */
  const makeSpawnFn = (child: MockChild): ReturnType<typeof vi.fn<SpawnFn>> =>
    vi.fn((_command: string, _args: readonly string[]) => child);

  describe('argument construction', () => {
    it('spawns ffmpeg with the exact frame-select args for frameIndex 0', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 0, spawnFn });
      child.emit('close', 0);

      await promise;
      expect(spawnFn).toHaveBeenCalledTimes(1);
      expect(spawnFn).toHaveBeenCalledWith('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        '/clips/a.mp4',
        '-vf',
        'select=eq(n\\,0)',
        '-vsync',
        '0',
        '-vframes',
        '1',
        '-f',
        'image2pipe',
        '-vcodec',
        'png',
        'pipe:1',
      ]);
    });

    it('spawns ffmpeg with the exact frame-select args for frameIndex 42', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = decodeFrameFFmpeg({ input: '/clips/b.mp4', frameIndex: 42, spawnFn });
      child.emit('close', 0);

      await promise;
      expect(spawnFn).toHaveBeenCalledWith('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        '/clips/b.mp4',
        '-vf',
        'select=eq(n\\,42)',
        '-vsync',
        '0',
        '-vframes',
        '1',
        '-f',
        'image2pipe',
        '-vcodec',
        'png',
        'pipe:1',
      ]);
    });
  });

  describe('successful decode', () => {
    it('resolves with the PNG bytes read from stdout (data + close(0))', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);
      // PNG magic bytes split across two chunks, as a real pipe would deliver.
      const chunkA = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const chunkB = Buffer.from([0x0d, 0x0a, 0x1a, 0x0a]);

      const promise = decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 0, spawnFn });
      child.stdout.emit('data', chunkA);
      child.stdout.emit('data', chunkB);
      child.emit('close', 0);

      const result = await promise;
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });
  });

  describe('error handling', () => {
    it('rejects with FFmpegNotFoundError when spawn fails with ENOENT', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 0, spawnFn });
      const enoent = Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' });
      child.emit('error', enoent);

      await expect(promise).rejects.toBeInstanceOf(FFmpegNotFoundError);
    });

    it('FFmpegNotFoundError message is actionable: binary missing, install hint, brandlyframes doctor', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 0, spawnFn });
      const enoent = Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' });
      child.emit('error', enoent);

      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toMatch(/ffmpeg/i);
      expect(message).toMatch(/not found/i);
      expect(message).toMatch(/install/i);
      expect(message).toMatch(/brandlyframes doctor/);
    });

    it('rejects with a plain Error (not FFmpegNotFoundError) for non-ENOENT spawn errors', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 0, spawnFn });
      const eacces = Object.assign(new Error('spawn ffmpeg EACCES denied'), { code: 'EACCES' });
      child.emit('error', eacces);

      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(FFmpegNotFoundError);
      expect((error as Error).message).toMatch(/EACCES/);
    });

    it('rejects with an Error including stderr when ffmpeg closes with a non-zero exit code', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 9999, spawnFn });
      child.stderr.emit(
        'data',
        Buffer.from('[mov,mp4] moov atom not found\nError opening input file.\n', 'utf8'),
      );
      child.emit('close', 1);

      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(FFmpegNotFoundError);
      expect((error as Error).message).toMatch(/moov atom not found/);
      expect((error as Error).message).toMatch(/exit/i);
    });
  });

  describe('frameIndex validation', () => {
    it('throws for a negative frameIndex without spawning', () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      expect(() => decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: -1, spawnFn })).toThrow(
        /non-negative/,
      );
      expect(spawnFn).not.toHaveBeenCalled();
    });

    it('throws for a non-integer frameIndex without spawning', () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      expect(() =>
        decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 1.5, spawnFn }),
      ).toThrow(/integer/);
      expect(spawnFn).not.toHaveBeenCalled();
    });

    it('accepts safe integers', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = decodeFrameFFmpeg({ input: '/clips/a.mp4', frameIndex: 7, spawnFn });
      child.emit('close', 0);
      await expect(promise).resolves.toBeInstanceOf(Uint8Array);
    });
  });
});

