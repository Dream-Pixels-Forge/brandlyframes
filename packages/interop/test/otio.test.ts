/**
 * BF-231: OpenTimelineIO JSON export tests.
 *
 * Verifies the OTIO_JSON structure emitted for a CompositionIR (Timeline.1 /
 * Stack.1 / Track.1 / Clip.1 / Gap.1 / Marker.1 schemas) and the round-trip
 * parse of our own export back into the IR.
 */

import { describe, expect, it } from 'vitest';
import { exportOtio, parseOtio, type CompositionIR, type TimelineClip } from '../src/index.js';
import { makeComposition } from './helpers.js';

describe('exportOtio', () => {
  it('emits an OTIO Timeline with global start time at the composition rate', () => {
    const doc = JSON.parse(exportOtio(makeComposition())) as Record<string, unknown>;
    expect(doc['OTIO_SCHEMA']).toBe('Timeline.1');
    expect(doc['name']).toBe('Test Composition');
    const globalStart = doc['global_start_time'] as Record<string, unknown>;
    expect(globalStart['OTIO_SCHEMA']).toBe('RationalTime.1');
    expect(globalStart['rate']).toBe(30);
  });

  it('carries composition geometry and duration in metadata', () => {
    const doc = JSON.parse(exportOtio(makeComposition())) as Record<string, unknown>;
    const meta = doc['metadata'] as Record<string, unknown>;
    expect(meta['brandlyframes']).toMatchObject({
      id: 'comp-1',
      width: 1920,
      height: 1080,
      durationInFrames: 90,
    });
  });

  it('maps IR tracks to OTIO Video/Audio tracks', () => {
    const ir = makeComposition({
      tracks: [{ name: 'Overlay' }, { name: 'Narration' }],
      clips: [
        makeComposition().clips[0],
        {
          name: 'VO',
          kind: 'audio',
          track: 1,
          startFrame: 0,
          durationInFrames: 45,
          mediaReference: 'assets/vo.wav',
        },
      ],
    });
    const doc = JSON.parse(exportOtio(ir)) as {
      tracks: { children: Array<Record<string, unknown>> };
    };
    const trackA = doc.tracks.children[0]!;
    const trackB = doc.tracks.children[1]!;
    expect(trackA['OTIO_SCHEMA']).toBe('Track.1');
    expect(trackA['name']).toBe('Overlay');
    expect(trackA['kind']).toBe('Video');
    expect(trackB['name']).toBe('Narration');
    expect(trackB['kind']).toBe('Audio');
  });

  it('fills gaps between clips with Gap items', () => {
    const clip: TimelineClip = {
      name: 'Late',
      kind: 'video',
      track: 0,
      startFrame: 60,
      durationInFrames: 30,
      mediaReference: null,
    };
    const ir = makeComposition({
      durationInFrames: 90,
      clips: [
        makeComposition().clips[0], // 0-45
        clip, // 60-90 -> 15-frame gap
      ],
    });
    const doc = JSON.parse(exportOtio(ir)) as {
      tracks: { children: Array<{ children: Array<Record<string, unknown>> }> };
    };
    const children = doc.tracks.children[0]!.children;
    expect(children.map((c) => c['OTIO_SCHEMA'])).toEqual(['Clip.1', 'Gap.1', 'Clip.1']);
    const gap = children[1]!;
    const gapRange = gap['source_range'] as { duration: { value: number } };
    expect(gapRange.duration.value).toBe(15);
  });

  it('sets clip source ranges and external media references', () => {
    const doc = JSON.parse(exportOtio(makeComposition())) as {
      tracks: { children: Array<{ children: Array<Record<string, unknown>> }> };
    };
    const clipA = doc.tracks.children[0]!.children[0]!;
    const range = clipA['source_range'] as {
      start_time: { rate: number; value: number };
      duration: { rate: number; value: number };
    };
    expect(range.start_time).toEqual({ OTIO_SCHEMA: 'RationalTime.1', rate: 30, value: 0 });
    expect(range.duration).toEqual({ OTIO_SCHEMA: 'RationalTime.1', rate: 30, value: 45 });
    const ref = clipA['media_reference'] as { OTIO_SCHEMA: string; target_url: string };
    expect(ref.OTIO_SCHEMA).toBe('ExternalReference.1');
    expect(ref.target_url).toBe('assets/a.mp4');

    const clipB = doc.tracks.children[0]!.children[1]!;
    expect(clipB['media_reference']).toBeNull();
  });

  it('exports composition-level markers on the tracks stack', () => {
    const doc = JSON.parse(exportOtio(makeComposition())) as {
      tracks: { markers: Array<Record<string, unknown>> };
    };
    const marker = doc.tracks.markers[0]!;
    expect(marker['OTIO_SCHEMA']).toBe('Marker.1');
    expect(marker['name']).toBe('start');
    const marked = marker['marked_range'] as {
      start_time: { value: number; rate: number };
    };
    expect(marked.start_time.value).toBe(0);
    expect(marked.start_time.rate).toBe(30);
  });
});

describe('parseOtio — round-trip of our own export', () => {
  it('round-trips a mixed-track composition losslessly', () => {
    const ir: CompositionIR = makeComposition({
      id: 'promo',
      name: 'Product Promo',
      tracks: [{ name: 'Overlay' }, { name: 'Main' }, { name: 'Sound' }],
      clips: [
        {
          name: 'Title',
          kind: 'text',
          track: 0,
          startFrame: 0,
          durationInFrames: 45,
          mediaReference: null,
        },
        {
          name: 'Card',
          kind: 'image',
          track: 1,
          startFrame: 30,
          durationInFrames: 15,
          mediaReference: 'assets/card.png',
        },
        {
          name: 'Main Shot',
          kind: 'video',
          track: 1,
          startFrame: 60,
          durationInFrames: 30,
          mediaReference: null,
        },
        {
          name: 'Music',
          kind: 'audio',
          track: 2,
          startFrame: 0,
          durationInFrames: 90,
          mediaReference: 'assets/music.mp3',
        },
      ],
      markers: [
        { name: 'start', frame: 0 },
        { name: 'drop', frame: 60 },
      ],
    });
    expect(parseOtio(exportOtio(ir))).toEqual(ir);
  });

  it('round-trips non-integer frame rates', () => {
    const ir = makeComposition({ fps: 29.97 });
    expect(parseOtio(exportOtio(ir))).toEqual(ir);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseOtio('not json at all {')).toThrow();
  });

  it('throws on JSON that is not an OTIO timeline', () => {
    expect(() => parseOtio(JSON.stringify({ OTIO_SCHEMA: 'Clip.1' }))).toThrow(/OpenTimelineIO/);
  });
});
