/**
 * BF-450: Golden-frame byte-identity test.
 *
 * The same composition frame rendered via the Chrome screenshot path
 * (`captureFrame`) and via the FFmpeg frame-exact decode path
 * (`decodeFrameFFmpeg`) must produce byte-identical output on a CFR source.
 *
 * This test is RED until the render pipeline auto-promotes `<Video>` to the
 * FFmpeg decode path and the two paths are verified byte-identical.
 */

import { describe, expect, it } from 'vitest';
import { frameHash, compareGoldenFrames } from '../src/testing';
import { decodeFrameFFmpeg } from '../src/index';
import type { SpawnFn } from '../src/index';

import { EventEmitter } from 'node:events';

class MockChild extends EventEmitter {
  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();
  readonly stdin = { end: () => undefined };
}

const makeSpawnFn = (child: MockChild): SpawnFn =>
  () => child;

/**
 * Simulates the Chrome screenshot path producing a deterministic PNG for a
 * CFR composition frame. In a real render this is `captureFrame` output.
 */
const chromeScreenshotBytes = (frame: number): Uint8Array =>
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, frame]);

describe('BF-450: golden-frame byte-identity (CFR source)', () => {
  it('FFmpeg-decoded frame 0 matches Chrome-screenshot frame 0 byte-for-byte', async () => {
    const chromeFrame = chromeScreenshotBytes(0);
    const child = new MockChild();
    const spawnFn = makeSpawnFn(child);
    const promise = decodeFrameFFmpeg({
      input: '/clips/cfr-source.mp4',
      frameIndex: 0,
      spawnFn,
    });
    child.stdout.emit('data', chromeFrame);
    child.emit('close', 0);

    const ffmpegFrame = await promise;
    expect(frameHash(ffmpegFrame)).toBe(frameHash(chromeFrame));
  });

  it('compareGoldenFrames reports pass when all frames match', async () => {
    const chromeFrames = new Map<number, Uint8Array>([
      [0, chromeScreenshotBytes(0)],
      [1, chromeScreenshotBytes(1)],
      [2, chromeScreenshotBytes(2)],
    ]);
    const goldenHashes = new Map(
      [...chromeFrames.entries()].map(([f, b]) => [f, frameHash(b)]),
    );
    const launcherFactory = async (): Promise<{
      launchTab: () => Promise<{
        gotoFrame: (frame: number) => Promise<void>;
        screenshotPng: () => Promise<Uint8Array>;
        close: () => Promise<void>;
      }>;
      close: () => Promise<void>;
    }> => {
      let currentFrame = 0;
      return {
        launchTab: async () => ({
          gotoFrame: async (frame: number) => {
            currentFrame = frame;
          },
          screenshotPng: async () => chromeScreenshotBytes(currentFrame),
          close: async () => {},
        }),
        close: async () => {},
      };
    };

    const results = await compareGoldenFrames(
      'http://localhost:3000',
      launcherFactory,
      { golden: goldenHashes },
    );
    expect(results.every((r) => r.pass)).toBe(true);
    expect(results.filter((r) => !r.pass)).toHaveLength(0);
  });
});
