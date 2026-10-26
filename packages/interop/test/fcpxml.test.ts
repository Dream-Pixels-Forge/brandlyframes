/**
 * BF-231: FCP XML (xmeml v4) export tests.
 *
 * Verifies the xmeml structure emitted for a CompositionIR (sequence,
 * clipitem in/out/start/end frames, pathurl media references, sequence
 * markers) and the round-trip parse of our own export. Lossy fields are
 * documented in the package README (track names, non-audio sub-kinds,
 * non-integer frame rates).
 */

import { describe, expect, it } from 'vitest';
import { exportFcpXml, parseFcpXml } from '../src/index.js';
import { makeComposition } from './helpers.js';

describe('exportFcpXml', () => {
  it('emits an xmeml v4 sequence with geometry and rate', () => {
    const xml = exportFcpXml(makeComposition());
    expect(xml).toContain('<xmeml version="4">');
    expect(xml).toContain('<sequence id="comp-1">');
    expect(xml).toContain('<name>Test Composition</name>');
    expect(xml).toContain('<duration>90</duration>');
    expect(xml).toContain('<timebase>30</timebase>');
    expect(xml).toContain('<width>1920</width>');
    expect(xml).toContain('<height>1080</height>');
  });

  it('emits clipitems with in/out/start/end frame points', () => {
    const xml = exportFcpXml(makeComposition());
    expect(xml).toContain('<clipitem id="clip-1">');
    expect(xml).toContain('<name>Clip A</name>');
    expect(xml).toContain('<in>0</in>');
    expect(xml).toContain('<out>45</out>');
    expect(xml).toContain('<start>45</start>');
    expect(xml).toContain('<end>90</end>');
  });

  it('wraps video clips in the video track and audio clips in the audio track', () => {
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
          mediaReference: 'assets/music.mp3',
        },
      ],
    });
    const xml = exportFcpXml(ir);
    const videoSection = xml.slice(xml.indexOf('<video>'), xml.indexOf('</video>'));
    const audioSection = xml.slice(xml.indexOf('<audio>'), xml.indexOf('</audio>'));
    expect(videoSection).toContain('<name>Clip A</name>');
    expect(videoSection).not.toContain('<name>Music</name>');
    expect(audioSection).toContain('<name>Music</name>');
  });

  it('maps media references to pathurl and converts relative paths back', () => {
    const xml = exportFcpXml(makeComposition());
    expect(xml).toContain('<pathurl>file://localhost/assets/a.mp4</pathurl>');
  });

  it('keeps absolute URLs as pathurl verbatim', () => {
    const ir = makeComposition();
    ir.clips[0].mediaReference = 'https://cdn.example.com/a.mp4';
    const xml = exportFcpXml(ir);
    expect(xml).toContain('<pathurl>https://cdn.example.com/a.mp4</pathurl>');
  });

  it('escapes XML-sensitive characters in names and round-trips them', () => {
    const ir = makeComposition();
    ir.clips[0].name = 'A & B <take 2> "final"';
    const xml = exportFcpXml(ir);
    expect(xml).toContain('A &amp; B &lt;take 2&gt; "final"');
    expect(parseFcpXml(xml).clips[0].name).toBe('A & B <take 2> "final"');
  });

  it('exports sequence-level markers with frame in-points', () => {
    const xml = exportFcpXml(makeComposition());
    expect(xml).toContain('<marker>');
    expect(xml).toContain('<name>start</name>');
    expect(xml).toContain('<in>0</in>');
  });

  it('rounds non-integer fps to a timebase (documented lossy)', () => {
    const xml = exportFcpXml(makeComposition({ fps: 29.97 }));
    expect(xml).toContain('<timebase>30</timebase>');
  });
});

describe('parseFcpXml — round-trip of our own export', () => {
  it('round-trips identity, geometry, clips, media and markers', () => {
    const ir = makeComposition({
      id: 'promo',
      name: 'Product Promo',
      tracks: [{ name: 'Track 1' }, { name: 'Track 2' }],
      clips: [
        {
          name: 'Main Shot',
          kind: 'video',
          track: 0,
          startFrame: 0,
          durationInFrames: 60,
          mediaReference: 'assets/main.mp4',
        },
        {
          name: 'Music',
          kind: 'audio',
          track: 1,
          startFrame: 0,
          durationInFrames: 90,
          mediaReference: null,
        },
      ],
      markers: [
        { name: 'start', frame: 0 },
        { name: 'drop', frame: 60 },
      ],
    });
    const parsed = parseFcpXml(exportFcpXml(ir));
    expect(parsed.id).toBe('promo');
    expect(parsed.name).toBe('Product Promo');
    expect(parsed.width).toBe(1920);
    expect(parsed.height).toBe(1080);
    expect(parsed.fps).toBe(30);
    expect(parsed.durationInFrames).toBe(90);
    expect(parsed.clips).toEqual(ir.clips);
    expect(parsed.markers).toEqual(ir.markers);
    // track names are not representable in xmeml tracks (documented)
    expect(parsed.tracks).toEqual([{ name: 'Track 1' }, { name: 'Track 2' }]);
  });

  it('round-trips a multi-track video composition', () => {
    const ir = makeComposition({
      tracks: [{ name: 'Track 1' }, { name: 'Track 2' }],
      clips: [
        makeComposition().clips[0],
        {
          name: 'Overlay Card',
          kind: 'video',
          track: 1,
          startFrame: 15,
          durationInFrames: 30,
          mediaReference: null,
        },
      ],
    });
    const parsed = parseFcpXml(exportFcpXml(ir));
    expect(parsed.clips).toEqual(ir.clips);
  });

  it('throws on input without an xmeml root', () => {
    expect(() => parseFcpXml('<html><body>nope</body></html>')).toThrow(/xmeml/);
  });
});
