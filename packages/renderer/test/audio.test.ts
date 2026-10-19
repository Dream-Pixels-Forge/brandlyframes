import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import {
  buildMixArgs,
  DEFAULT_MIX_FPS,
  FFmpegNotFoundError,
  mixAudio,
  type AudioTrackInput,
  type SpawnFn,
} from '../src/index';

/**
 * FFmpeg audio mixing with per-track volume curves [BF-022].
 *
 * `buildMixArgs` is the pure layer (deterministic ffmpeg argv + filtergraph
 * per track); `mixAudio` is the spawn wrapper. All spawn tests inject a mock
 * `spawnFn` — no real FFmpeg runs.
 */
describe('mixAudio [BF-022]', () => {
  describe('buildMixArgs — arg building', () => {
    it('builds the exact minimal argv for one plain track', () => {
      expect(buildMixArgs([{ src: '/a/voice.mp3' }], { output: '/out/mix.m4a' })).toEqual([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        '/a/voice.mp3',
        '-filter_complex',
        '[0:a]asetpts=PTS-STARTPTS[mix]',
        '-map',
        '[mix]',
        '/out/mix.m4a',
      ]);
    });

    it('defaults the mix fps to 30', () => {
      expect(DEFAULT_MIX_FPS).toBe(30);
    });

    it('emits a constant volume as a plain volume filter', () => {
      const args = buildMixArgs([{ src: '/a/v.mp3', volume: 0.8 }], { output: '/o/mix.wav' });
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,volume=0.8[mix]',
      );
    });

    it('builds a two-keyframe ramp as a piecewise-linear volume expression', () => {
      const args = buildMixArgs(
        [
          {
            src: '/a/v.mp3',
            volumeCurve: [
              { frame: 0, volume: 0 },
              { frame: 30, volume: 1 },
            ],
          },
        ],
        { output: '/o/mix.wav' },
      );
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,' +
          'volume=if(lt(t\\,1)\\,(0+(1-0)*(t-0)/(1-0))\\,1):eval=frame[mix]',
      );
    });

    it('nests the if-chain for three keyframes (ramp up, ramp down)', () => {
      const args = buildMixArgs(
        [
          {
            src: '/a/v.mp3',
            volumeCurve: [
              { frame: 0, volume: 0 },
              { frame: 30, volume: 1 },
              { frame: 60, volume: 0.5 },
            ],
          },
        ],
        { output: '/o/mix.wav' },
      );
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,' +
          'volume=if(lt(t\\,1)\\,(0+(1-0)*(t-0)/(1-0))\\,' +
          'if(lt(t\\,2)\\,(1+(0.5-1)*(t-1)/(2-1))\\,0.5)):eval=frame[mix]',
      );
    });

    it('holds the first keyframe volume before a curve that starts after frame 0', () => {
      const args = buildMixArgs(
        [
          {
            src: '/a/v.mp3',
            volumeCurve: [
              { frame: 30, volume: 0 },
              { frame: 60, volume: 1 },
            ],
          },
        ],
        { output: '/o/mix.wav' },
      );
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,' +
          'volume=if(lt(t\\,1)\\,0\\,if(lt(t\\,2)\\,(0+(1-0)*(t-1)/(2-1))\\,1)):eval=frame[mix]',
      );
    });

    it('emits a fade-in from the track start', () => {
      const args = buildMixArgs([{ src: '/a/v.mp3', fadeInFrames: 15 }], { output: '/o/mix.wav' });
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5[mix]',
      );
    });

    it('anchors the fade-out at duration minus fadeOut (track-local frames)', () => {
      const args = buildMixArgs(
        [{ src: '/a/v.mp3', fadeOutFrames: 15, durationInFrames: 60 }],
        { output: '/o/mix.wav' },
      );
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]atrim=end=2,asetpts=PTS-STARTPTS,afade=t=out:st=1.5:d=0.5[mix]',
      );
    });

    it('maps the offset to an all-channel adelay in milliseconds', () => {
      const args = buildMixArgs([{ src: '/a/v.mp3', offsetFrames: 30 }], { output: '/o/mix.wav' });
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,adelay=1000:all=1[mix]',
      );
    });

    it('keeps full frame-mapped precision for sub-second offsets', () => {
      const args = buildMixArgs([{ src: '/a/v.mp3', offsetFrames: 1 }], { output: '/o/mix.wav' });
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,adelay=33.333333333333336:all=1[mix]',
      );
    });

    it('maps every frame number through the given fps (24 fps)', () => {
      const args = buildMixArgs(
        [
          {
            src: '/a/v.mp3',
            fadeInFrames: 24,
            offsetFrames: 24,
            durationInFrames: 48,
          },
        ],
        { fps: 24, output: '/o/mix.wav' },
      );
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]atrim=end=2,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1,adelay=1000:all=1[mix]',
      );
    });

    it('builds the exact full argv with every per-track option set at once', () => {
      expect(
        buildMixArgs(
          [
            {
              src: '/a/voice.mp3',
              volume: 0.8,
              fadeInFrames: 15,
              fadeOutFrames: 15,
              offsetFrames: 30,
              durationInFrames: 60,
            },
          ],
          { fps: 30, output: '/out/mix.m4a' },
        ),
      ).toEqual([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        '/a/voice.mp3',
        '-filter_complex',
        '[0:a]atrim=end=2,asetpts=PTS-STARTPTS,volume=0.8,' +
          'afade=t=in:st=0:d=0.5,afade=t=out:st=1.5:d=0.5,adelay=1000:all=1[mix]',
        '-map',
        '[mix]',
        '/out/mix.m4a',
      ]);
    });
  });

  describe('buildMixArgs — multi-track mixing', () => {
    it('chains two tracks through amix with normalize disabled', () => {
      const args = buildMixArgs(
        [{ src: '/a/voice.mp3', volume: 1 }, { src: '/a/music.mp3', offsetFrames: 30 }],
        { fps: 30, output: '/out/mix.wav' },
      );
      expect(args.slice(0, 8)).toEqual([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        '/a/voice.mp3',
        '-i',
        '/a/music.mp3',
      ]);
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS,volume=1[a0];' +
          '[1:a]asetpts=PTS-STARTPTS,adelay=1000:all=1[a1];' +
          '[a0][a1]amix=inputs=2:normalize=0[mix]',
      );
      expect(args[args.indexOf('-map') + 1]).toBe('[mix]');
    });

    it('labels and mixes three tracks with amix inputs=3', () => {
      const args = buildMixArgs(
        [{ src: '/a/1.mp3' }, { src: '/a/2.mp3' }, { src: '/a/3.mp3' }],
        { output: '/out/mix.wav' },
      );
      expect(args[args.indexOf('-filter_complex') + 1]).toBe(
        '[0:a]asetpts=PTS-STARTPTS[a0];' +
          '[1:a]asetpts=PTS-STARTPTS[a1];' +
          '[2:a]asetpts=PTS-STARTPTS[a2];' +
          '[a0][a1][a2]amix=inputs=3:normalize=0[mix]',
      );
    });

    it('omits amix entirely for a single track', () => {
      const args = buildMixArgs([{ src: '/a/v.mp3' }], { output: '/o/mix.wav' });
      expect(args.join(' ')).not.toContain('amix');
    });
  });

  describe('buildMixArgs — validation', () => {
    it('rejects an empty inputs array', () => {
      expect(() => buildMixArgs([], { output: '/o/mix.wav' })).toThrow(/non-empty/);
    });

    it('rejects an empty output', () => {
      expect(() => buildMixArgs([{ src: '/a/v.mp3' }], { output: '' })).toThrow(/non-empty/);
    });

    it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects fps %s without building args',
      (fps) => {
        expect(() => buildMixArgs([{ src: '/a/v.mp3' }], { fps, output: '/o/mix.wav' })).toThrow(
          /fps/,
        );
      },
    );

    it('rejects an empty track src', () => {
      expect(() => buildMixArgs([{ src: '' }], { output: '/o/mix.wav' })).toThrow(/track 0/);
    });

    it.each([-0.5, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects a track volume of %s',
      (volume) => {
        expect(() =>
          buildMixArgs([{ src: '/a/v.mp3', volume }], { output: '/o/mix.wav' }),
        ).toThrow(/volume/);
      },
    );

    it('rejects volume together with volumeCurve on one track', () => {
      expect(() =>
        buildMixArgs(
          [{ src: '/a/v.mp3', volume: 0.5, volumeCurve: [{ frame: 0, volume: 1 }] }],
          { output: '/o/mix.wav' },
        ),
      ).toThrow(/mutually exclusive/);
    });

    it('rejects an empty volumeCurve', () => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', volumeCurve: [] }], { output: '/o/mix.wav' }),
      ).toThrow(/volumeCurve/);
    });

    it('rejects volumeCurve keyframes that are not strictly increasing', () => {
      expect(() =>
        buildMixArgs(
          [
            {
              src: '/a/v.mp3',
              volumeCurve: [
                { frame: 30, volume: 0 },
                { frame: 0, volume: 1 },
              ],
            },
          ],
          { output: '/o/mix.wav' },
        ),
      ).toThrow(/strictly increasing/);
      expect(() =>
        buildMixArgs(
          [
            {
              src: '/a/v.mp3',
              volumeCurve: [
                { frame: 0, volume: 0 },
                { frame: 0, volume: 1 },
              ],
            },
          ],
          { output: '/o/mix.wav' },
        ),
      ).toThrow(/strictly increasing/);
    });

    it.each([-1, 1.5])('rejects a volumeCurve keyframe frame of %s', (frame) => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', volumeCurve: [{ frame, volume: 1 }] }], {
          output: '/o/mix.wav',
        }),
      ).toThrow(/keyframe frame/);
    });

    it('rejects a keyframe volume that is negative', () => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', volumeCurve: [{ frame: 0, volume: -1 }] }], {
          output: '/o/mix.wav',
        }),
      ).toThrow(/keyframe volume/);
    });

    it.each([-1, 0, 1.5])('rejects fadeInFrames of %s', (fadeInFrames) => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', fadeInFrames }], { output: '/o/mix.wav' }),
      ).toThrow(/fadeInFrames/);
    });

    it.each([-1, 0, 1.5])('rejects fadeOutFrames of %s', (fadeOutFrames) => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', fadeOutFrames }], { output: '/o/mix.wav' }),
      ).toThrow(/fadeOutFrames/);
    });

    it('requires durationInFrames for a fade-out', () => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', fadeOutFrames: 15 }], { output: '/o/mix.wav' }),
      ).toThrow(/durationInFrames/);
    });

    it('rejects a fade-out longer than the track duration', () => {
      expect(() =>
        buildMixArgs(
          [{ src: '/a/v.mp3', fadeOutFrames: 5, durationInFrames: 4 }],
          { output: '/o/mix.wav' },
        ),
      ).toThrow(/must not exceed/);
    });

    it.each([-1, 1.5])('rejects offsetFrames of %s', (offsetFrames) => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', offsetFrames }], { output: '/o/mix.wav' }),
      ).toThrow(/offsetFrames/);
    });

    it.each([0, -1, 2.5])('rejects durationInFrames of %s', (durationInFrames) => {
      expect(() =>
        buildMixArgs([{ src: '/a/v.mp3', durationInFrames }], { output: '/o/mix.wav' }),
      ).toThrow(/durationInFrames/);
    });

    it('reports the offending track index in validation errors', () => {
      expect(() =>
        buildMixArgs([{ src: '/a/ok.mp3' }, { src: '/a/bad.mp3', volume: -2 }], {
          output: '/o/mix.wav',
        }),
      ).toThrow(/track 1/);
    });
  });

  describe('mixAudio — spawn wrapper', () => {
    /** Minimal child-like handle: an EventEmitter plus stdout/stderr/stdin. */
    class MockChild extends EventEmitter {
      readonly stdout = new EventEmitter();
      readonly stderr = new EventEmitter();
      readonly stdin = { end: vi.fn() };
    }

    const makeSpawnFn = (child: MockChild): ReturnType<typeof vi.fn<SpawnFn>> =>
      vi.fn((_command: string, _args: readonly string[]) => child);

    it('spawns ffmpeg with exactly the buildMixArgs argv and resolves on exit 0', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);
      const options = { output: '/out/mix.m4a' };

      const promise = mixAudio([{ src: '/a/voice.mp3' }], { ...options, spawnFn });
      child.emit('close', 0);

      await expect(promise).resolves.toBeUndefined();
      expect(spawnFn).toHaveBeenCalledTimes(1);
      const call = spawnFn.mock.calls[0];
      expect(call?.[0]).toBe('ffmpeg');
      expect(call?.[1]).toEqual(buildMixArgs([{ src: '/a/voice.mp3' }], options));
    });

    it('rejects with stderr in the message when ffmpeg exits non-zero', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = mixAudio([{ src: '/a/voice.mp3' }], { output: '/out/mix.m4a', spawnFn });
      child.stderr.emit('data', Buffer.from('Filter graph error. '));
      child.stderr.emit('data', Buffer.from('Detail.'));
      child.emit('close', 1);

      const error = await promise.catch((e: unknown) => e);
      expect((error as Error).message).toMatch(/mixAudio: FFmpeg exited with code 1/);
      expect((error as Error).message).toMatch(/Filter graph error\. Detail\./);
    });

    it('rejects with FFmpegNotFoundError (doctor hint) when spawn fails with ENOENT', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = mixAudio([{ src: '/a/voice.mp3' }], { output: '/out/mix.m4a', spawnFn });
      child.emit('error', Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' }));

      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(FFmpegNotFoundError);
      expect((error as Error).message).toMatch(/brandlyframes doctor/);
    });

    it('chains the cause on non-ENOENT spawn failures', async () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      const promise = mixAudio([{ src: '/a/voice.mp3' }], { output: '/out/mix.m4a', spawnFn });
      const eacces = Object.assign(new Error('spawn ffmpeg EACCES'), { code: 'EACCES' });
      child.emit('error', eacces);

      const error = await promise.catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(FFmpegNotFoundError);
      expect((error as Error).message).toMatch(/EACCES/);
      expect((error as { cause?: unknown }).cause).toBe(eacces);
    });

    it('validates synchronously and never spawns on invalid options', () => {
      const child = new MockChild();
      const spawnFn = makeSpawnFn(child);

      expect(() => mixAudio([], { output: '/o/mix.wav', spawnFn })).toThrow(RangeError);
      expect(() =>
        mixAudio([{ src: '/a/v.mp3', volume: -1 }], { output: '/o/mix.wav', spawnFn }),
      ).toThrow(RangeError);
      expect(() => mixAudio([{ src: '/a/v.mp3' }], { output: '', spawnFn })).toThrow(RangeError);
      expect(spawnFn).not.toHaveBeenCalled();
    });
  });

  it('keeps AudioTrackInput and VolumeKeyframe shapes importable', () => {
    const track: AudioTrackInput = {
      src: '/a/v.mp3',
      volumeCurve: [{ frame: 0, volume: 1 }],
    };
    expect(track.volumeCurve?.[0]?.volume).toBe(1);
  });
});
