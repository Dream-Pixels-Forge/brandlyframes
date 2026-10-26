/**
 * BF-231: CMX3600 EDL export tests.
 *
 * Verifies the CMX3600 event structure (TITLE/FCM headers, numbered V/A cut
 * events, timecodes at the composition frame rate, FROM CLIP NAME comments)
 * and the round-trip parse of our own export. EDL is documented as lossy:
 * no markers, no track names, no sub-kinds, no media references, and the
 * frame rate must be supplied to the parser for non-30 fps timelines.
 */

import { describe, expect, it } from 'vitest';
import { exportEdl, parseEdl } from '../src/index.js';
import { makeComposition } from './helpers.js';

describe('exportEdl', () => {
  it('writes TITLE and NON-DROP FRAME headers', () => {
    const edl = exportEdl(makeComposition());
    expect(edl).toMatch(/^TITLE: Test Composition\n/);
    expect(edl).toContain('FCM: NON-DROP FRAME');
  });

  it('emits numbered V/A cut events with correct timecodes at 30 fps', () => {
    const edl = exportEdl(makeComposition());
    // Clip A: src 0-44 (45 frames), record 0-44
    expect(edl).toContain('001  V     C        00:00:00:00 00:00:01:14 00:00:00:00 00:00:01:14');
    // Clip B: record starts at frame 45 = 00:00:01:15, ends at 89 = 00:00:02:29
    expect(edl).toContain('002  V     C        00:00:00:00 00:00:01:14 00:00:01:15 00:00:02:29');
  });

  it('emits audio clips as A events', () => {
    const ir = makeComposition({
      clips: [
        {
          name: 'Music',
          kind: 'audio',
          track: 0,
          startFrame: 0,
          durationInFrames: 90,
          mediaReference: null,
        },
      ],
    });
    expect(exportEdl(ir)).toContain(
      '001  A     C        00:00:00:00 00:00:02:29 00:00:00:00 00:00:02:29',
    );
  });

  it('attaches FROM CLIP NAME comments to each event', () => {
    const edl = exportEdl(makeComposition());
    expect(edl).toContain('* FROM CLIP NAME: Clip A');
    expect(edl).toContain('* FROM CLIP NAME: Clip B');
  });

  it('computes timecodes at other integer frame rates', () => {
    const edl = exportEdl(makeComposition({ fps: 25 }));
    // 44 frames at 25 fps = 1s + 19f; record in 45 = 1s + 20f; record out 89 = 3s + 14f
    expect(edl).toContain('002  V     C        00:00:00:00 00:00:01:19 00:00:01:20 00:00:03:14');
  });

  it('drops markers (not representable in CMX3600)', () => {
    const edl = exportEdl(makeComposition());
    expect(edl).not.toContain('* MARKER');
  });

  it('throws on non-integer fps', () => {
    expect(() => exportEdl(makeComposition({ fps: 29.97 }))).toThrow(/integer fps/);
  });
});

describe('parseEdl — round-trip of our own export', () => {
  it('round-trips clip names, kinds and timing', () => {
    const ir = makeComposition();
    const parsed = parseEdl(exportEdl(ir));
    expect(parsed.clips.map((c) => c.name)).toEqual(['Clip A', 'Clip B']);
    expect(parsed.clips.map((c) => c.kind)).toEqual(['video', 'video']);
    expect(parsed.clips.map((c) => c.startFrame)).toEqual([0, 45]);
    expect(parsed.clips.map((c) => c.durationInFrames)).toEqual([45, 45]);
    expect(parsed.fps).toBe(30); // fps not carried by EDL; defaults to 30
    expect(parsed.name).toBe('Test Composition');
  });

  it('round-trips audio clips onto a separate track', () => {
    const ir = makeComposition({
      tracks: [{ name: 'Track 1' }, { name: 'Track 2' }],
      clips: [
        makeComposition().clips[0],
        {
          name: 'Music',
          kind: 'audio',
          track: 1,
          startFrame: 0,
          durationInFrames: 90,
          mediaReference: null,
        },
      ],
    });
    const parsed = parseEdl(exportEdl(ir));
    expect(parsed.tracks).toEqual([{ name: 'V1' }, { name: 'A1' }]);
    expect(parsed.clips.map((c) => c.kind)).toEqual(['video', 'audio']);
    expect(parsed.clips[1].startFrame).toBe(0);
    expect(parsed.clips[1].durationInFrames).toBe(90);
  });

  it('loses markers, media references and track names (documented)', () => {
    const parsed = parseEdl(exportEdl(makeComposition()));
    expect(parsed.markers).toEqual([]);
    expect(parsed.clips.every((c) => c.mediaReference === null)).toBe(true);
    expect(parsed.tracks).toEqual([{ name: 'V1' }]);
  });

  it('reconstructs non-30 fps timing when the rate is supplied explicitly', () => {
    const parsed = parseEdl(exportEdl(makeComposition({ fps: 25 })), 25);
    expect(parsed.fps).toBe(25);
    expect(parsed.clips[1].startFrame).toBe(45);
    expect(parsed.clips[1].durationInFrames).toBe(45);
  });

  it('never throws on malformed input and yields an empty composition', () => {
    const parsed = parseEdl('garbage without events\n*** random note');
    expect(parsed.clips).toEqual([]);
    expect(parsed.name).toBe('EDL Import');
    expect(parsed.fps).toBe(30);
  });
});
