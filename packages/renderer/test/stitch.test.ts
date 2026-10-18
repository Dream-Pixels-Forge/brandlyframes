import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import {
  buildStitchArgs,
  CODEC_PROFILES,
  DEFAULT_FRAME_PATTERN,
  DEFAULT_STITCH_FPS,
  FFmpegNotFoundError,
  resolveFramePattern,
  stitchFrames,
  type SpawnFn,
  type StitchCodec,
} from '../src/index';

/**
 * FFmpeg stitching of captured frames into videos [BF-021].
 *
 * `buildStitchArgs` / `CODEC_PROFILES` / `resolveFramePattern` are the pure
 * layer (deterministic ffmpeg argv per codec); `stitchFrames` is the spawn
 * wrapper. All spawn tests inject a mock `spawnFn` — no real FFmpeg runs.
 */
describe('stitch [BF-021]', () => {
  describe('CODEC_PROFILES', () => {
    it('exposes exactly the seven BF-021 codecs', () => {
      expect(Object.keys(CODEC_PROFILES).sort()).toEqual([
        'gif',
        'h264',
        'h265',
        'png-sequence',
        'prores',
        'vp8',
        'vp9',
      ]);
    });

    it('maps each codec to its FFmpeg encoder and canonical extension', () => {
      expect(CODEC_PROFILES.h264).toMatchObject({ encoder: 'libx264', extension: 'mp4' });
      expect(CODEC_PROFILES.h265).toMatchObject({ encoder: 'libx265', extension: 'mp4' });
      expect(CODEC_PROFILES.vp8).toMatchObject({ encoder: 'libvpx', extension: 'webm' });
      expect(CODEC_PROFILES.vp9).toMatchObject({ encoder: 'libvpx-vp9', extension: 'webm' });
      expect(CODEC_PROFILES.prores).toMatchObject({ encoder: 'prores_ks', extension: 'mov' });
      expect(CODEC_PROFILES.gif).toMatchObject({ encoder: 'gif', extension: 'gif' });
      expect(CODEC_PROFILES['png-sequence']).toMatchObject({
        encoder: 'png',
        extension: 'png',
      });
    });

    it('pins default pixel formats only where the encoder needs one', () => {
      expect(CODEC_PROFILES.h264.pixelFormat).toBe('yuv420p');
      expect(CODEC_PROFILES.h265.pixelFormat).toBe('yuv420p');
      expect(CODEC_PROFILES.vp8.pixelFormat).toBe('yuv420p');
      expect(CODEC_PROFILES.vp9.pixelFormat).toBe('yuv420p');
      expect(CODEC_PROFILES.prores.pixelFormat).toBe('yuv444p10le');
      expect(CODEC_PROFILES.gif.pixelFormat).toBeUndefined();
      expect(CODEC_PROFILES['png-sequence'].pixelFormat).toBeUndefined();
    });

    it('carries per-codec extra flags (mp4 faststart, ProRes 4444 profile)', () => {
      expect(CODEC_PROFILES.h264.extraArgs).toEqual(['-movflags', '+faststart']);
      expect(CODEC_PROFILES.h265.extraArgs).toEqual(['-movflags', '+faststart']);
      expect(CODEC_PROFILES.prores.extraArgs).toEqual(['-profile:v', '4444']);
      expect(CODEC_PROFILES.vp8.extraArgs).toBeUndefined();
      expect(CODEC_PROFILES.vp9.extraArgs).toBeUndefined();
      expect(CODEC_PROFILES.gif.extraArgs).toBeUndefined();
      expect(CODEC_PROFILES['png-sequence'].extraArgs).toBeUndefined();
    });
  });

  describe('resolveFramePattern', () => {
    it('appends the default PNG pattern to a directory input', () => {
      expect(resolveFramePattern('/render/frames')).toBe('/render/frames/frame-%06d.png');
    });

    it('normalizes a trailing slash', () => {
      expect(resolveFramePattern('/render/frames/')).toBe('/render/frames/frame-%06d.png');
    });

    it('passes through explicit %d and %0Nd patterns', () => {
      expect(resolveFramePattern('/f/img-%04d.jpg')).toBe('/f/img-%04d.jpg');
      expect(resolveFramePattern('/f/chunk-1/%d.png')).toBe('/f/chunk-1/%d.png');
    });

    it('uses frame-%06d.png as the default directory pattern', () => {
      expect(DEFAULT_FRAME_PATTERN).toBe('frame-%06d.png');
    });
  });

  describe('buildStitchArgs — per-codec arg building', () => {
    it('builds the exact default h264 argv (dir input, fps 30, faststart, yuv420p)', () => {
      expect(buildStitchArgs('/frames', { output: '/out/video.mp4' })).toEqual([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-framerate',
        '30',
        '-i',
        '/frames/frame-%06d.png',
        '-c:v',
        'libx264',
        '-movflags',
        '+faststart',
        '-pix_fmt',
        'yuv420p',
        '/out/video.mp4',
      ]);
    });

    it('defaults fps to 30', () => {
      expect(DEFAULT_STITCH_FPS).toBe(30);
    });

    it.each([
      [
        'h264',
        ['-c:v', 'libx264', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '/o/out.mp4'],
      ],
      [
        'h265',
        ['-c:v', 'libx265', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '/o/out.mp4'],
      ],
      ['vp8', ['-c:v', 'libvpx', '-pix_fmt', 'yuv420p', '/o/out.webm']],
      ['vp9', ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '/o/out.webm']],
      [
        'prores',
        [
          '-c:v',
          'prores_ks',
          '-profile:v',
          '4444',
          '-pix_fmt',
          'yuv444p10le',
          '/o/out.mov',
        ],
      ],
      ['gif', ['-c:v', 'gif', '/o/out.gif']],
      ['png-sequence', ['-c:v', 'png', '/o/out-%06d.png']],
    ] as ReadonlyArray<[StitchCodec, string[]]>)(
      'emits the exact codec tail for %s',
      (codec, tail) => {
        const args = buildStitchArgs('/f', { codec, output: tail[tail.length - 1] as string });
        const codecIndex = args.indexOf('-c:v');
        expect(args.slice(codecIndex)).toEqual(tail);
      },
    );
  });

  describe('buildStitchArgs — options passthrough', () => {
    it('builds the full argv with every option set at once', () => {
      expect(
        buildStitchArgs('frames/img-%04d.jpg', {
          fps: 60,
          crf: 20,
          scale: '1920:-2',
          pixelFormat: 'yuv420p',
          colorSpace: 'bt709',
          frameRange: { start: 5, end: 10 },
          output: '/o/out.mp4',
        }),
      ).toEqual([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-framerate',
        '60',
        '-start_number',
        '5',
        '-i',
        'frames/img-%04d.jpg',
        '-c:v',
        'libx264',
        '-crf',
        '20',
        '-movflags',
        '+faststart',
        '-pix_fmt',
        'yuv420p',
        '-vf',
        'scale=1920:-2',
        '-colorspace',
        'bt709',
        '-frames:v',
        '5',
        '/o/out.mp4',
      ]);
    });

    it('emits an explicit fps', () => {
      const args = buildStitchArgs('/f', { fps: 24, output: '/o/out.mp4' });
      expect(args.slice(4, 6)).toEqual(['-framerate', '24']);
    });

    it('places crf right after the codec selection', () => {
      const args = buildStitchArgs('/f', { crf: 18, output: '/o/out.mp4' });
      const codecIndex = args.indexOf('-c:v');
      expect(args.slice(codecIndex + 2, codecIndex + 4)).toEqual(['-crf', '18']);
    });

    it('passes bitrate through as -b:v', () => {
      const args = buildStitchArgs('/f', { bitrate: '5M', output: '/o/out.mp4' });
      const codecIndex = args.indexOf('-c:v');
      expect(args.slice(codecIndex + 2, codecIndex + 4)).toEqual(['-b:v', '5M']);
    });

    it('rejects crf and bitrate together', () => {
      expect(() =>
        buildStitchArgs('/f', { crf: 18, bitrate: '5M', output: '/o/out.mp4' }),
      ).toThrow(/mutually exclusive/);
    });

    it('passes scale through as the scale filter', () => {
      const args = buildStitchArgs('/f', { scale: '1280:-2', output: '/o/out.mp4' });
      expect(args).toContain('-vf');
      expect(args[args.indexOf('-vf') + 1]).toBe('scale=1280:-2');
    });

    it('lets pixelFormat override the codec profile default', () => {
      const args = buildStitchArgs('/f', { pixelFormat: 'yuv422p10le', output: '/o/out.mp4' });
      expect(args).toContain('-pix_fmt');
      expect(args[args.indexOf('-pix_fmt') + 1]).toBe('yuv422p10le');
      expect(args).not.toContain('yuv420p');
    });

    it('maps colorSpace to -colorspace', () => {
      const args = buildStitchArgs('/f', { colorSpace: 'bt709', output: '/o/out.mp4' });
      expect(args).toContain('-colorspace');
      expect(args[args.indexOf('-colorspace') + 1]).toBe('bt709');
    });

    it('maps frameRange to -start_number (input) and -frames:v count (output)', () => {
      const args = buildStitchArgs('/f', {
        frameRange: { start: 10, end: 42 },
        output: '/o/out.mp4',
      });
      const startNumberIndex = args.indexOf('-start_number');
      expect(startNumberIndex).toBeGreaterThan(-1);
      expect(args[startNumberIndex + 1]).toBe('10');
      expect(args.indexOf('-i')).toBeGreaterThan(startNumberIndex);
      expect(args).toContain('-frames:v');
      expect(args[args.indexOf('-frames:v') + 1]).toBe('32');
    });
  });

  describe('buildStitchArgs — validation', () => {
    it('rejects an empty input', () => {
      expect(() => buildStitchArgs('', { output: '/o/out.mp4' })).toThrow(/non-empty/);
    });

    it('rejects an empty output', () => {
      expect(() => buildStitchArgs('/f', { output: '' })).toThrow(/non-empty/);
    });

    it('rejects an unknown codec', () => {
      expect(() =>
        buildStitchArgs('/f', { output: '/o/out.mp4', codec: 'mpeg2' as unknown as StitchCodec }),
      ).toThrow(/unknown codec/);
    });

    it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects fps %s without building args',
      (fps) => {
        expect(() => buildStitchArgs('/f', { fps, output: '/o/out.mp4' })).toThrow(/fps/);
      },
    );

    it('accepts fractional fps (NTSC-style rates) and passes it through', () => {
      const args = buildStitchArgs('/f', { fps: 29.97, output: '/o/out.mp4' });
      expect(args.slice(4, 6)).toEqual(['-framerate', '29.97']);
    });

    it.each([-1, 64, 2.5])('rejects crf %s', (crf) => {
      expect(() => buildStitchArgs('/f', { crf, output: '/o/out.mp4' })).toThrow(/crf/);
    });

    it.each(['bitrate', 'scale', 'pixelFormat', 'colorSpace'] as const)(
      'rejects an empty %s',
      (option) => {
        expect(() => buildStitchArgs('/f', { [option]: '', output: '/o/out.mp4' })).toThrow(
          new RegExp(option),
        );
      },
    );

    it('rejects an empty or invalid frameRange', () => {
      expect(() =>
        buildStitchArgs('/f', { frameRange: { start: 5, end: 5 }, output: '/o/out.mp4' }),
      ).toThrow(/frameRange/);
      expect(() =>
        buildStitchArgs('/f', { frameRange: { start: 1.5, end: 4 }, output: '/o/out.mp4' }),
      ).toThrow(/frameRange/);
    });

    it('requires a %d pattern output for png-sequence', () => {
      expect(() => buildStitchArgs('/f', { codec: 'png-sequence', output: '/o/frames.png' })).toThrow(
        /%d/,
      );
      expect(() =>
        buildStitchArgs('/f', { codec: 'png-sequence', output: '/o/frames-%06d.png' }),
      ).not.toThrow();
    });
  });

  describe('stitchFrames — spawn wrapper', () => {
    /** Minimal child-like handle: an EventEmitter plus stdout/stderr/stdin. */
    class MockChild extends EventEmitter {
      readonly stdout = new EventEmitter();
      readonly stderr = new EventEmitter();
      readonly stdin = { end: vi.fn() };
    }

    const makeSpawnFn = (child: MockChild): ReturnType<typeof vi.fn<SpawnFn>> =>
      vi.fn((_command: string, _args: readonly string[]) => child);

    it('spawns ffmpeg with exactly the buildStitchArgs argv and resolves on exit 0', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);
      const options = { output: '/out/video.mp4' };

      const promise = stitchFrames('/frames', { ...options, spawnFn });
      child.emit('close', 0);

      await expect(promise).resolves.toBeUndefined();
      expect(spawnFn).toHaveBeenCalledTimes(1);
      const call = spawnFn.mock.calls[0];
      expect(call?.[0]).toBe('ffmpeg');
      expect(call?.[1]).toEqual(buildStitchArgs('/frames', options));
    });

    it('rejects with stderr in the message when ffmpeg exits non-zero', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = stitchFrames('/frames', { output: '/out/video.mp4', spawnFn });
      child.stderr.emit('data', Buffer.from('Error part 1. '));
      child.stderr.emit('data', Buffer.from('Error part 2.'));
      child.emit('close', 1);

      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/exited with code 1/);
      expect((error as Error).message).toMatch(/Error part 1\. Error part 2\./);
    });

    it('rejects with the exit code when ffmpeg is killed by a signal (code null)', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = stitchFrames('/frames', { output: '/out/video.mp4', spawnFn });
      child.emit('close', null, 'SIGKILL');

      const error = await promise.catch((e: unknown) => e);
      expect((error as Error).message).toMatch(/exited with code null/);
    });

    it('rejects with FFmpegNotFoundError (doctor hint) when spawn fails with ENOENT', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = stitchFrames('/frames', { output: '/out/video.mp4', spawnFn });
      child.emit('error', Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' }));

      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(FFmpegNotFoundError);
      expect((error as Error).message).toMatch(/brandlyframes doctor/);
    });

    it('chains the cause on non-ENOENT spawn failures', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = stitchFrames('/frames', { output: '/out/video.mp4', spawnFn });
      const eacces = Object.assign(new Error('spawn ffmpeg EACCES'), { code: 'EACCES' });
      child.emit('error', eacces);

      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(FFmpegNotFoundError);
      expect((error as Error).message).toMatch(/EACCES/);
      expect((error as { cause?: unknown }).cause).toBe(eacces);
    });

    it('validates synchronously and never spawns on invalid options', () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      expect(() => stitchFrames('', { output: '/o/out.mp4', spawnFn })).toThrow(RangeError);
      expect(() =>
        stitchFrames('/f', { crf: 18, bitrate: '5M', output: '/o/out.mp4', spawnFn }),
      ).toThrow(RangeError);
      expect(spawnFn).not.toHaveBeenCalled();
    });
  });
});
