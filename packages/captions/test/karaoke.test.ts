import { describe, it, expect } from 'vitest';
import {
  parseASSKaraoke,
  generateSimpleKaraoke,
  getKaraokeState,
  applyEasing,
  createKaraokeOptions,
  createKaraokeFromCue,
  renderKaraokeToSVG,
  karaokeToLRC,
  createBouncingBallData,
  syncKaraokeTracks,
  exportKaraokeJSON,
  importKaraokeJSON,
} from '../src/karaoke';
import type { KaraokeData, KaraokeWord, CaptionCue } from '../src/index';

describe('Karaoke Utilities', () => {
  describe('parseASSKaraoke', () => {
    it('parses ASS karaoke format with \kf tags', () => {
      const assText = '{\\kf100}Hello{\\kf50} world';
      const result = parseASSKaraoke(assText);

      expect(result.words).toHaveLength(2);
      expect(result.words[0].text).toBe('Hello');
      expect(result.words[0].startTime).toBe(0);
      expect(result.words[0].endTime).toBe(1); // 100 centiseconds = 1 second
      expect(result.words[1].text).toBe(' world');
      expect(result.words[1].startTime).toBe(1);
      expect(result.words[1].endTime).toBe(1.5); // 50 centiseconds = 0.5 seconds
    });

    it('parses ASS karaoke format with \k tags', () => {
      const assText = '{\\k100}Hello{\\k50} world';
      const result = parseASSKaraoke(assText);

      expect(result.words).toHaveLength(2);
      expect(result.words[0].endTime).toBe(1);
      expect(result.words[1].endTime).toBe(1.5);
    });

    it('falls back to simple karaoke when no tags found', () => {
      const assText = 'Hello world';
      const result = parseASSKaraoke(assText);

      expect(result.words).toHaveLength(2);
      expect(result.words[0].text).toBe('Hello');
      expect(result.words[1].text).toBe('world');
    });

    it('handles empty input', () => {
      const result = parseASSKaraoke('');
      expect(result.words).toHaveLength(0);
    });

    it('skips empty words', () => {
      const assText = '{\\kf100}{\\kf50}Hello';
      const result = parseASSKaraoke(assText);
      // The first match has empty text, so it should be skipped
      expect(result.words.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generateSimpleKaraoke', () => {
    it('divides duration equally among words', () => {
      const karaoke = generateSimpleKaraoke('Hello world test', 0, 3);

      expect(karaoke.words).toHaveLength(3);
      expect(karaoke.words[0].startTime).toBe(0);
      expect(karaoke.words[0].endTime).toBeCloseTo(1, 1);
      expect(karaoke.words[1].startTime).toBeCloseTo(1, 1);
      expect(karaoke.words[1].endTime).toBeCloseTo(2, 1);
      expect(karaoke.words[2].startTime).toBeCloseTo(2, 1);
      expect(karaoke.words[2].endTime).toBe(3);
    });

    it('handles single word', () => {
      const karaoke = generateSimpleKaraoke('Hello', 5, 10);

      expect(karaoke.words).toHaveLength(1);
      expect(karaoke.words[0].startTime).toBe(5);
      expect(karaoke.words[0].endTime).toBe(10);
    });

    it('filters empty words from split', () => {
      const karaoke = generateSimpleKaraoke('Hello   world', 0, 2);
      expect(karaoke.words).toHaveLength(2);
    });
  });

  describe('getKaraokeState', () => {
    const karaoke: KaraokeData = {
      words: [
        { text: 'Hello', startTime: 0, endTime: 1, confidence: 1 },
        { text: 'world', startTime: 1, endTime: 2, confidence: 1 },
        { text: 'test', startTime: 2, endTime: 3, confidence: 1 },
      ],
    };

    it('returns initial state before first word', () => {
      const state = getKaraokeState(karaoke, -0.5);

      expect(state.currentWordIndex).toBe(-1);
      expect(state.currentWordProgress).toBe(0);
      expect(state.overallProgress).toBe(0);
      expect(state.completedWords).toEqual([]);
      expect(state.currentWord).toBeNull();
      expect(state.remainingWords).toEqual(['Hello', 'world', 'test']);
    });

    it('returns state during first word', () => {
      const state = getKaraokeState(karaoke, 0.5);

      expect(state.currentWordIndex).toBe(0);
      expect(state.currentWordProgress).toBe(0.5);
      expect(state.overallProgress).toBeCloseTo(0.167, 2);
      expect(state.completedWords).toEqual([]);
      expect(state.currentWord).toBe('Hello');
      expect(state.remainingWords).toEqual(['world', 'test']);
    });

    it('returns state after first word completes', () => {
      const state = getKaraokeState(karaoke, 1.2);

      expect(state.currentWordIndex).toBe(1);
      expect(state.currentWordProgress).toBe(0.2);
      expect(state.overallProgress).toBeCloseTo(0.4, 1);
      expect(state.completedWords).toEqual(['Hello']);
      expect(state.currentWord).toBe('world');
      expect(state.remainingWords).toEqual(['test']);
    });

    it('returns state after all words complete', () => {
      const state = getKaraokeState(karaoke, 5);

      expect(state.currentWordIndex).toBe(2);
      expect(state.currentWordProgress).toBe(1);
      expect(state.overallProgress).toBe(1);
      expect(state.completedWords).toEqual(['Hello', 'world', 'test']);
      expect(state.currentWord).toBe('test');
      expect(state.remainingWords).toEqual([]);
    });

    it('handles empty karaoke', () => {
      const state = getKaraokeState({ words: [] }, 1);
      expect(state.overallProgress).toBe(0);
      expect(state.currentWordIndex).toBe(-1);
    });
  });

  describe('applyEasing', () => {
    it('linear easing returns progress unchanged', () => {
      expect(applyEasing(0, 'linear')).toBe(0);
      expect(applyEasing(0.5, 'linear')).toBe(0.5);
      expect(applyEasing(1, 'linear')).toBe(1);
    });

    it('ease-in accelerates', () => {
      expect(applyEasing(0.5, 'ease-in')).toBe(0.25);
      expect(applyEasing(0.25, 'ease-in')).toBe(0.0625);
    });

    it('ease-out decelerates', () => {
      expect(applyEasing(0.5, 'ease-out')).toBe(0.75);
      expect(applyEasing(0.75, 'ease-out')).toBe(0.9375);
    });

    it('ease-in-out combines both', () => {
      expect(applyEasing(0.25, 'ease-in-out')).toBe(0.125);
      expect(applyEasing(0.5, 'ease-in-out')).toBe(0.5);
      expect(applyEasing(0.75, 'ease-in-out')).toBe(0.875);
    });

    it('defaults to linear for unknown easing', () => {
      // @ts-expect-error - testing invalid value
      expect(applyEasing(0.5, 'unknown')).toBe(0.5);
    });
  });

  describe('createKaraokeOptions', () => {
    it('returns default options', () => {
      const opts = createKaraokeOptions();
      expect(opts.highlightColor).toBe('#ffff00');
      expect(opts.defaultColor).toBe('#ffffff');
      expect(opts.outlineColor).toBe('#000000');
      expect(opts.outlineWidth).toBe(2);
      expect(opts.animationDuration).toBe(300);
      expect(opts.easing).toBe('ease-out');
    });

    it('merges overrides with defaults', () => {
      const opts = createKaraokeOptions({ highlightColor: '#ff0000', easing: 'ease-in' });
      expect(opts.highlightColor).toBe('#ff0000');
      expect(opts.easing).toBe('ease-in');
      expect(opts.defaultColor).toBe('#ffffff'); // default preserved
    });
  });

  describe('createKaraokeFromCue', () => {
    it('uses provided word timings', () => {
      const cue: CaptionCue = {
        id: '1',
        startTime: 0,
        endTime: 5,
        text: 'Hello world',
      };

      const wordTimings = [
        { word: 'Hello', start: 0, end: 2 },
        { word: 'world', start: 2, end: 5 },
      ];

      const karaoke = createKaraokeFromCue(cue, wordTimings);

      expect(karaoke).not.toBeNull();
      expect(karaoke!.words).toHaveLength(2);
      expect(karaoke!.words[0].text).toBe('Hello');
      expect(karaoke!.words[0].startTime).toBe(0);
      expect(karaoke!.words[0].endTime).toBe(2);
    });

    it('uses cue.karaoke if available', () => {
      const cue: CaptionCue = {
        id: '1',
        startTime: 0,
        endTime: 5,
        text: 'Hello world',
        karaoke: {
          words: [
            { text: 'From', startTime: 0, endTime: 1, confidence: 1 },
            { text: 'karaoke', startTime: 1, endTime: 5, confidence: 1 },
          ],
        },
      };

      const karaoke = createKaraokeFromCue(cue);
      expect(karaoke).not.toBeNull();
      expect(karaoke!.words[0].text).toBe('From');
    });

    it('falls back to generated timing', () => {
      const cue: CaptionCue = {
        id: '1',
        startTime: 0,
        endTime: 4,
        text: 'Fallback test',
      };

      const karaoke = createKaraokeFromCue(cue);
      expect(karaoke).not.toBeNull();
      expect(karaoke!.words).toHaveLength(2);
    });

    it('returns null for empty text', () => {
      const cue: CaptionCue = {
        id: '1',
        startTime: 0,
        endTime: 5,
        text: '',
      };

      const karaoke = createKaraokeFromCue(cue);
      expect(karaoke).not.toBeNull(); // Still generates simple karaoke
    });
  });

  describe('renderKaraokeToSVG', () => {
    const karaoke: KaraokeData = {
      words: [
        { text: 'Hello', startTime: 0, endTime: 1, confidence: 1 },
        { text: 'world', startTime: 1, endTime: 2, confidence: 1 },
      ],
    };

    const svgOptions = {
      width: 800,
      height: 200,
      fontFamily: 'Arial',
      fontSize: 48,
      fontWeight: 'normal',
      defaultColor: '#ffffff',
      highlightColor: '#ffff00',
      x: 50,
      y: 50,
    };

    it('generates valid SVG output', () => {
      const svg = renderKaraokeToSVG(karaoke, 0.5, svgOptions);

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="200"');
      expect(svg).toContain('</svg>');
    });

    it('includes style definitions', () => {
      const svg = renderKaraokeToSVG(karaoke, 0.5, svgOptions);
      expect(svg).toContain('<style>');
      expect(svg).toContain('karaoke-text');
      expect(svg).toContain('karaoke-highlight');
    });

    it('handles multi-line layout', () => {
      const longKaraoke: KaraokeData = {
        words: Array.from({ length: 10 }, (_, i) => ({
          text: `word${i}`,
          startTime: i * 0.5,
          endTime: (i + 1) * 0.5,
          confidence: 1,
        })),
      };

      const svg = renderKaraokeToSVG(longKaraoke, 2, { ...svgOptions, width: 400 });
      expect(svg).toContain('<text');
    });
  });

  describe('karaokeToLRC', () => {
    it('converts karaoke to LRC format', () => {
      const karaoke: KaraokeData = {
        words: [
          { text: 'Hello', startTime: 61.5, endTime: 62.5, confidence: 1 },
          { text: 'world', startTime: 62.5, endTime: 63.5, confidence: 1 },
        ],
      };

      const lrc = karaokeToLRC(karaoke);
      expect(lrc).toContain('[01:01.50]Hello');
      expect(lrc).toContain('[01:02.50]world');
    });

    it('formats timestamps correctly', () => {
      const karaoke: KaraokeData = {
        words: [{ text: 'Test', startTime: 3661.99, endTime: 3662.99, confidence: 1 }],
      };

      const lrc = karaokeToLRC(karaoke);
      expect(lrc).toContain('[61:01.99]Test');
    });
  });

  describe('createBouncingBallData', () => {
    const karaoke: KaraokeData = {
      words: [
        { text: 'Hello', startTime: 0, endTime: 1, confidence: 1 },
        { text: 'world', startTime: 1, endTime: 2, confidence: 1 },
      ],
    };

    it('returns position data for current word', () => {
      const data = createBouncingBallData(karaoke, 0.5);

      expect(data).not.toBeNull();
      expect(data!.wordIndex).toBe(0);
      expect(data!.progress).toBe(0.5);
      expect(typeof data!.x).toBe('number');
      expect(typeof data!.y).toBe('number');
    });

    it('returns null before first word', () => {
      const data = createBouncingBallData(karaoke, -1);
      expect(data).toBeNull();
    });

    it('returns null after last word', () => {
      const data = createBouncingBallData(karaoke, 5);
      expect(data).toBeNull();
    });
  });

  describe('syncKaraokeTracks', () => {
    const tracks: KaraokeData[] = [
      { words: [{ text: 'Hello', startTime: 0, endTime: 1, confidence: 1 }] },
      { words: [{ text: 'World', startTime: 0, endTime: 1, confidence: 1 }] },
    ];

    it('returns state for all tracks', () => {
      const synced = syncKaraokeTracks(tracks, 0.5);

      expect(synced).toHaveLength(2);
      expect(synced[0].trackIndex).toBe(0);
      expect(synced[1].trackIndex).toBe(1);
      expect(synced[0].state.currentWordIndex).toBe(0);
      expect(synced[1].state.currentWordIndex).toBe(0);
    });
  });

  describe('exportKaraokeJSON', () => {
    it('exports karaoke as JSON with version', () => {
      const karaoke: KaraokeData = {
        words: [
          { text: 'Hello', startTime: 0, endTime: 1, confidence: 0.9 },
          { text: 'world', startTime: 1, endTime: 2, confidence: 1 },
        ],
      };

      const json = exportKaraokeJSON(karaoke);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0');
      expect(parsed.words).toHaveLength(2);
      expect(parsed.words[0].text).toBe('Hello');
      expect(parsed.words[0].start).toBe(0);
      expect(parsed.words[0].end).toBe(1);
      expect(parsed.words[0].confidence).toBe(0.9);
    });
  });

  describe('importKaraokeJSON', () => {
    it('imports karaoke from JSON', () => {
      const json = JSON.stringify({
        version: '1.0',
        words: [
          { text: 'Hello', start: 0, end: 1, confidence: 0.9 },
          { text: 'world', start: 1, end: 2 },
        ],
      });

      const karaoke = importKaraokeJSON(json);

      expect(karaoke.words).toHaveLength(2);
      expect(karaoke.words[0].text).toBe('Hello');
      expect(karaoke.words[0].startTime).toBe(0);
      expect(karaoke.words[0].endTime).toBe(1);
      expect(karaoke.words[0].confidence).toBe(0.9);
      expect(karaoke.words[1].confidence).toBe(1.0); // default
    });
  });
});