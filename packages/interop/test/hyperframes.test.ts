/**
 * BF-230: HyperFrames HTML import tests.
 *
 * Verifies the clean-room HyperFrames composition contract: data-* timing
 * attributes, clip classes, track containers, markers, media references,
 * and the graceful fallback (unknown nodes -> <Sequence> placeholders with
 * warnings). Fixtures under test/fixtures are committed; no network.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseHyperFramesHtml } from '../src/index.js';

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('parseHyperFramesHtml — sample fixture', () => {
  const { composition, warnings } = parseHyperFramesHtml(fixture('hyperframes-sample.html'));

  it('reads composition config from root data-* attributes', () => {
    expect(composition.id).toBe('promo');
    expect(composition.name).toBe('Product Promo');
    expect(composition.fps).toBe(30);
    expect(composition.width).toBe(1920);
    expect(composition.height).toBe(1080);
    expect(composition.durationInFrames).toBe(150);
  });

  it('names tracks from track containers in document order', () => {
    expect(composition.tracks).toEqual([{ name: 'Overlay' }, { name: 'Main' }]);
  });

  it('maps all seven clips with kinds, timing, tracks and media', () => {
    expect(composition.clips).toHaveLength(7);
    const byName = new Map(composition.clips.map((c) => [c.name, c]));
    expect(byName.get('Title')).toMatchObject({
      kind: 'text',
      track: 0,
      startFrame: 0,
      durationInFrames: 45,
      mediaReference: null,
    });
    // src attribute on a native <video> element
    expect(byName.get('Intro')).toMatchObject({
      kind: 'video',
      track: 1,
      startFrame: 0,
      durationInFrames: 60,
      mediaReference: 'assets/intro.mp4',
    });
    // data-src attribute and unquoted attribute value
    expect(byName.get('Main Shot')).toMatchObject({
      kind: 'video',
      track: 1,
      startFrame: 60,
      durationInFrames: 90,
      mediaReference: 'assets/main.mp4',
    });
    // nested clip inside another clip is flattened into the timeline
    expect(byName.get('Lower Third')).toMatchObject({
      kind: 'text',
      track: 1,
      startFrame: 70,
      durationInFrames: 20,
      mediaReference: null,
    });
    // self-closing <img> with src fallback
    expect(byName.get('Image clip 5')).toMatchObject({
      kind: 'image',
      track: 1,
      startFrame: 150,
      durationInFrames: 30,
      mediaReference: 'assets/card.png',
    });
    // clip outside any track container defaults to track 0
    expect(byName.get('Music')).toMatchObject({
      kind: 'audio',
      track: 0,
      startFrame: 0,
      durationInFrames: 180,
      mediaReference: 'assets/music.mp3',
    });
  });

  it('turns the unknown <section> node into a <Sequence> placeholder', () => {
    const placeholder = composition.clips.find((c) => c.kind === 'sequence');
    expect(placeholder).toMatchObject({
      name: 'Sequence: section',
      track: 0,
      startFrame: 10,
      durationInFrames: 20,
      mediaReference: null,
    });
  });

  it('collects markers', () => {
    expect(composition.markers).toEqual([{ name: 'drop', frame: 60 }]);
  });

  it('warns once for the unknown node and nothing else', () => {
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('<section class="unknown-widget">');
    expect(warnings[0]).toContain('<Sequence>');
  });

  it('does not parse content inside <script> or <style> as clips', () => {
    expect(composition.clips.every((c) => c.startFrame !== 999)).toBe(true);
  });
});

describe('parseHyperFramesHtml — minimal fixture', () => {
  const { composition, warnings } = parseHyperFramesHtml(fixture('hyperframes-minimal.html'));

  it('applies defaults for missing attributes and derives duration', () => {
    expect(composition.id).toBe('composition');
    expect(composition.name).toBe('HyperFrames Composition');
    expect(composition.fps).toBe(25);
    expect(composition.width).toBe(640);
    expect(composition.height).toBe(360);
    // no data-duration-frames -> max clip end (5 + 10)
    expect(composition.durationInFrames).toBe(15);
    expect(warnings).toEqual([]);
  });

  it('maps a bare hf-clip to a sequence-kind clip with default name', () => {
    expect(composition.clips).toEqual([
      {
        name: 'Sequence: div',
        kind: 'sequence',
        track: 0,
        startFrame: 5,
        durationInFrames: 10,
        mediaReference: null,
      },
    ]);
    expect(composition.tracks).toEqual([{ name: 'Track 1' }]);
  });
});

describe('parseHyperFramesHtml — fallbacks and edge cases', () => {
  it('warns and applies defaults when no composition root exists', () => {
    const { composition, warnings } = parseHyperFramesHtml('<div><p>hello</p></div>');
    expect(composition.fps).toBe(30);
    expect(composition.width).toBe(1920);
    expect(composition.height).toBe(1080);
    // html-level wrappers are ignored, div and p become placeholders
    expect(composition.clips.map((c) => c.name)).toEqual(['Sequence: div', 'Sequence: p']);
    expect(warnings.some((w) => w.startsWith('No HyperFrames composition root'))).toBe(true);
    expect(warnings).toHaveLength(3);
  });

  it('decodes entities in names', () => {
    const { composition } = parseHyperFramesHtml(
      '<div class="hyperframes-composition">' +
        '<div class="hf-clip hf-video" data-name="A & B <take 2>" data-start-frame="0" data-duration-frames="5"></div>' +
        '</div>',
    );
    expect(composition.clips[0].name).toBe('A & B <take 2>');
  });

  it('warns and defaults to 1 frame when data-duration-frames is missing', () => {
    const { composition, warnings } = parseHyperFramesHtml(
      '<div class="hyperframes-composition"><div class="hf-clip hf-video" data-name="V" data-start-frame="5"></div></div>',
    );
    expect(composition.clips[0].durationInFrames).toBe(1);
    expect(warnings.join('\n')).toContain('data-duration-frames');
  });

  it('warns and defaults when timing attributes are invalid', () => {
    const { composition, warnings } = parseHyperFramesHtml(
      '<div class="hyperframes-composition">' +
        '<div class="hf-clip hf-video" data-name="V" data-start-frame="abc" data-duration-frames="-3" data-track="x"></div>' +
        '</div>',
    );
    expect(composition.clips[0].startFrame).toBe(0);
    expect(composition.clips[0].durationInFrames).toBe(1);
    expect(composition.clips[0].track).toBe(0);
    expect(warnings.join('\n')).toContain('data-start-frame');
    expect(warnings.join('\n')).toContain('data-duration-frames');
    expect(warnings.join('\n')).toContain('data-track');
  });

  it('skips markers without data-frame and warns', () => {
    const { composition, warnings } = parseHyperFramesHtml(
      '<div class="hyperframes-composition">' +
        '<div class="hf-marker" data-name="broken"></div>' +
        '<div class="hf-marker" data-name="ok" data-frame="12"></div>' +
        '</div>',
    );
    expect(composition.markers).toEqual([{ name: 'ok', frame: 12 }]);
    expect(warnings.join('\n')).toContain('Marker "broken"');
  });

  it('falls back to text content for marker names', () => {
    const { composition } = parseHyperFramesHtml(
      '<div class="hyperframes-composition"><div class="hf-marker" data-frame="12">Chapter Two</div></div>',
    );
    expect(composition.markers).toEqual([{ name: 'Chapter Two', frame: 12 }]);
  });

  it('extends the track list for out-of-range data-track values', () => {
    const { composition } = parseHyperFramesHtml(
      '<div class="hyperframes-composition">' +
        '<div class="hf-clip hf-video" data-name="V" data-track="3" data-start-frame="0" data-duration-frames="5"></div>' +
        '</div>',
    );
    expect(composition.tracks).toEqual([
      { name: 'Track 1' },
      { name: 'Track 2' },
      { name: 'Track 3' },
      { name: 'Track 4' },
    ]);
    expect(composition.clips[0].track).toBe(3);
  });

  it('ignores void and document-level elements instead of placeholdering them', () => {
    const { composition } = parseHyperFramesHtml(
      '<div class="hyperframes-composition">' +
        '<img class="hf-image" data-start-frame="0" data-duration-frames="5" src="a.png"/>' +
        '<br/>' +
        '<video class="hf-video" data-start-frame="0" data-duration-frames="5" src="native.mp4" data-src="explicit.mp4"><source src="x.mp4"></video>' +
        '</div>',
    );
    expect(composition.clips).toHaveLength(2);
    expect(composition.clips[0].mediaReference).toBe('a.png');
    // <source> children are ignored; data-src wins over the src attribute
    expect(composition.clips[1].mediaReference).toBe('explicit.mp4');
  });

  it('imports an empty composition without warnings', () => {
    const { composition, warnings } = parseHyperFramesHtml(
      '<div class="hyperframes-composition"></div>',
    );
    expect(composition.clips).toEqual([]);
    expect(composition.markers).toEqual([]);
    expect(composition.durationInFrames).toBe(0);
    expect(composition.tracks).toEqual([{ name: 'Track 1' }]);
    expect(warnings).toEqual([]);
  });

  it('never throws on malformed HTML', () => {
    expect(() =>
      parseHyperFramesHtml('<div class="hyperframes-composition" <broken'),
    ).not.toThrow();
    expect(() => parseHyperFramesHtml('')).not.toThrow();
    expect(() =>
      parseHyperFramesHtml('<!-- unterminated comment <div class="hf-clip">'),
    ).not.toThrow();
  });
});
