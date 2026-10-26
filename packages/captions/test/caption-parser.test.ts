import { describe, it, expect } from 'vitest';
import {
  parseSRT,
  parseVTT,
  parseCaption,
  generateSRT,
  generateVTT,
  secondsToTimecode,
  secondsToSRTTimecode,
  getActiveCue,
  getCuesInRange,
  mergeCues,
  offsetCues,
  scaleCues,
  generateKaraokeTiming,
  applyKaraokeHighlight,
} from '../src/index';

const sampleSRT = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,500 --> 00:00:08,000
This is a test`;

const sampleVTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hello world

2
00:00:05.500 --> 00:00:08.000
This is a test`;

describe('Caption Parser', () => {
  describe('parseSRT', () => {
    it('parses basic SRT format', () => {
      const result = parseSRT(sampleSRT);
      expect(result.format).toBe('srt');
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0].text).toBe('Hello world');
      expect(result.cues[0].startTime).toBe(1);
      expect(result.cues[0].endTime).toBe(4);
    });

    it('handles SRT with index numbers', () => {
      const srt = `1
00:00:10,000 --> 00:00:15,000
First caption

2
00:00:16,000 --> 00:00:20,000
Second caption`;

      const result = parseSRT(srt);
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0].id).toBe('cue-0');
      expect(result.cues[1].id).toBe('cue-1');
    });

    it('handles multi-line caption text', () => {
      const srt = `1
00:00:00,000 --> 00:00:05,000
Line one
Line two
Line three`;

      const result = parseSRT(srt);
      expect(result.cues).toHaveLength(1);
      expect(result.cues[0].text).toBe('Line one\nLine two\nLine three');
    });

    it('handles empty input gracefully', () => {
      const result = parseSRT('');
      expect(result.cues).toHaveLength(0);
    });

    it('skips invalid blocks', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
Valid caption

invalid block

2
00:00:05,000 --> 00:00:08,000
Another valid`;

      const result = parseSRT(srt);
      expect(result.cues).toHaveLength(2);
    });
  });

  describe('parseVTT', () => {
    it('parses basic VTT format', () => {
      const result = parseVTT(sampleVTT);
      expect(result.format).toBe('vtt');
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0].text).toBe('Hello world');
      expect(result.cues[0].startTime).toBe(1);
      expect(result.cues[0].endTime).toBe(4);
    });

    it('skips WEBVTT header and metadata', () => {
      const vtt = `WEBVTT
Kind: captions
Language: en

1
00:00:01.000 --> 00:00:04.000
Hello world`;

      const result = parseVTT(vtt);
      expect(result.cues).toHaveLength(1);
    });

    it('parses VTT cue settings', () => {
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000 position:50% align:center size:75%
Hello world`;

      const result = parseVTT(vtt);
      // W3C WebVTT: position and size are independent settings.
      expect(result.cues[0].settings).toEqual({
        position: 'center',
        alignment: 'center',
        size: 75,
      });
    });

    it('handles vertical cue setting', () => {
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000 vertical:rl
Hello world`;

      const result = parseVTT(vtt);
      expect(result.cues[0].settings?.vertical).toBe(true);
    });

    it('ignores bare cue-setting tokens that carry no colon-separated value', () => {
      // Regression: `part.split(':')` yields `value === undefined` for a bare
      // token, which previously produced NaN for `size` and type-unsafe
      // narrowing for position/alignment.
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000 align:start size bare
Hello world`;

      const result = parseVTT(vtt);
      expect(result.cues[0].settings).toEqual({ alignment: 'start' });
    });

    it('handles last cue without trailing newline', () => {
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hello world`;

      const result = parseVTT(vtt);
      expect(result.cues).toHaveLength(1);
    });
  });

  describe('parseCaption (auto-detect)', () => {
    it('detects VTT by WEBVTT header', () => {
      const result = parseCaption(sampleVTT);
      expect(result.format).toBe('vtt');
    });

    it('detects SRT by starting with number', () => {
      const result = parseCaption(sampleSRT);
      expect(result.format).toBe('srt');
    });

    it('defaults to SRT for unknown format', () => {
      const result = parseCaption('Some random text without WEBVTT or number');
      expect(result.format).toBe('srt');
    });
  });

  describe('generateSRT', () => {
    it('generates valid SRT output', () => {
      const parsed = parseSRT(sampleSRT);
      const output = generateSRT(parsed);

      expect(output).toContain('1');
      expect(output).toContain('00:00:01,000 --> 00:00:04,000');
      expect(output).toContain('Hello world');
    });

    it('round-trips SRT correctly', () => {
      const parsed = parseSRT(sampleSRT);
      const output = generateSRT(parsed);
      const reparsed = parseSRT(output);

      expect(reparsed.cues).toHaveLength(parsed.cues.length);
      expect(reparsed.cues[0].text).toBe(parsed.cues[0].text);
      expect(reparsed.cues[0].startTime).toBeCloseTo(parsed.cues[0].startTime, 2);
    });
  });

  describe('generateVTT', () => {
    it('generates valid VTT output with WEBVTT header', () => {
      const parsed = parseVTT(sampleVTT);
      const output = generateVTT(parsed);

      expect(output).toContain('WEBVTT');
      expect(output).toContain('00:00:01.000 --> 00:00:04.000');
      expect(output).toContain('Hello world');
    });

    it('includes cue settings in output', () => {
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000 position:50% align:center
Hello world`;

      const parsed = parseVTT(vtt);
      const output = generateVTT(parsed);

      // W3C WebVTT: position serializes as a percentage
      expect(output).toContain('position:50%');
      expect(output).toContain('align:center');
    });

    it('round-trips VTT correctly (BF-460)', () => {
      const parsed = parseVTT(sampleVTT);
      const output = generateVTT(parsed);
      const reparsed = parseVTT(output);

      expect(reparsed.format).toBe('vtt');
      expect(reparsed.cues).toHaveLength(parsed.cues.length);
      parsed.cues.forEach((cue, i) => {
        expect(reparsed.cues[i].text).toBe(cue.text);
        expect(reparsed.cues[i].startTime).toBeCloseTo(cue.startTime, 2);
        expect(reparsed.cues[i].endTime).toBeCloseTo(cue.endTime, 2);
      });
    });

    it('round-trips VTT with settings and inline word timings (BF-460)', () => {
      const vtt = `WEBVTT\n\nintro\n00:00:00.000 --> 00:00:02.000 position:50% align:center\nHello<00:00:00.320> world.`;
      const parsed = parseVTT(vtt);
      const reparsed = parseVTT(generateVTT(parsed));

      expect(reparsed.cues[0].id).toBe('intro');
      expect(reparsed.cues[0].text).toBe(parsed.cues[0].text);
      expect(reparsed.cues[0].settings).toEqual(parsed.cues[0].settings);
    });

    it('round-trips SRT with cue ids renumbered 1..n (BF-460)', () => {
      const srt = `1\n00:00:00.000,000 --> 00:00:01,000\nAlpha\n\n2\n00:00:02,000 --> 00:00:03,000\nBeta`;
      const reparsed = parseSRT(generateSRT(parseSRT(srt)));
      expect(reparsed.cues.map((c) => c.text)).toEqual(['Alpha', 'Beta']);
      expect(reparsed.cues[1].startTime).toBeCloseTo(2, 2);
    });
  });

  describe('secondsToTimecode', () => {
    it('converts seconds to HH:MM:SS.mmm format', () => {
      expect(secondsToTimecode(0)).toBe('00:00:00.000');
      expect(secondsToTimecode(1.5)).toBe('00:00:01.500');
      expect(secondsToTimecode(65.123)).toBe('00:01:05.123');
      expect(secondsToTimecode(3661.999)).toBe('01:01:01.999');
    });
  });

  describe('secondsToSRTTimecode', () => {
    it('converts seconds to SRT format with comma', () => {
      expect(secondsToSRTTimecode(1.5)).toBe('00:00:01,500');
      expect(secondsToSRTTimecode(65.123)).toBe('00:01:05,123');
    });
  });

  describe('getActiveCue', () => {
    const cues = [
      { id: '1', startTime: 0, endTime: 5, text: 'First' },
      { id: '2', startTime: 5, endTime: 10, text: 'Second' },
      { id: '3', startTime: 10, endTime: 15, text: 'Third' },
    ];

    it('returns null for time before first cue', () => {
      expect(getActiveCue(cues, -1)).toBeNull();
    });

    it('returns first cue at start time', () => {
      const cue = getActiveCue(cues, 0);
      expect(cue?.id).toBe('1');
    });

    it('returns correct cue in middle', () => {
      const cue = getActiveCue(cues, 7);
      expect(cue?.id).toBe('2');
    });

    it('returns null for time after last cue', () => {
      expect(getActiveCue(cues, 20)).toBeNull();
    });

    it('handles boundary at end time (exclusive)', () => {
      const cue = getActiveCue(cues, 5);
      expect(cue?.id).toBe('2');
    });
  });

  describe('getCuesInRange', () => {
    const cues = [
      { id: '1', startTime: 0, endTime: 5, text: 'First' },
      { id: '2', startTime: 5, endTime: 10, text: 'Second' },
      { id: '3', startTime: 10, endTime: 15, text: 'Third' },
    ];

    it('returns cues overlapping range', () => {
      const result = getCuesInRange(cues, 3, 12);
      expect(result).toHaveLength(3);
    });

    it('returns empty for non-overlapping range', () => {
      const result = getCuesInRange(cues, 20, 25);
      expect(result).toHaveLength(0);
    });
  });

  describe('mergeCues', () => {
    it('merges adjacent cues within maxGap', () => {
      const cues = [
        { id: '1', startTime: 0, endTime: 5, text: 'First' },
        { id: '2', startTime: 5.3, endTime: 10, text: 'Second' },
      ];

      const merged = mergeCues(cues, 0.5);
      expect(merged).toHaveLength(1);
      expect(merged[0].startTime).toBe(0);
      expect(merged[0].endTime).toBe(10);
      expect(merged[0].text).toBe('First\nSecond');
    });

    it('does not merge cues beyond maxGap', () => {
      const cues = [
        { id: '1', startTime: 0, endTime: 5, text: 'First' },
        { id: '2', startTime: 6, endTime: 10, text: 'Second' },
      ];

      const merged = mergeCues(cues, 0.5);
      expect(merged).toHaveLength(2);
    });
  });

  describe('offsetCues', () => {
    it('offsets all cues by given seconds', () => {
      const cues = [
        { id: '1', startTime: 10, endTime: 15, text: 'First' },
        { id: '2', startTime: 20, endTime: 25, text: 'Second' },
      ];

      const offset = offsetCues(cues, -5);
      expect(offset[0].startTime).toBe(5);
      expect(offset[0].endTime).toBe(10);
      expect(offset[1].startTime).toBe(15);
      expect(offset[1].endTime).toBe(20);
    });

    it('clamps negative times to zero', () => {
      const cues = [{ id: '1', startTime: 2, endTime: 5, text: 'First' }];
      const offset = offsetCues(cues, -5);
      expect(offset[0].startTime).toBe(0);
      expect(offset[0].endTime).toBe(0);
    });
  });

  describe('scaleCues', () => {
    it('scales cue times by factor', () => {
      const cues = [
        { id: '1', startTime: 10, endTime: 20, text: 'First' },
      ];

      const scaled = scaleCues(cues, 0.5);
      expect(scaled[0].startTime).toBe(5);
      expect(scaled[0].endTime).toBe(10);
    });
  });

  describe('generateKaraokeTiming', () => {
    it('generates karaoke timing for text', () => {
      const karaoke = generateKaraokeTiming('Hello world', 0, 10);

      expect(karaoke.words).toHaveLength(2);
      expect(karaoke.words[0].text).toBe('Hello');
      expect(karaoke.words[0].startTime).toBe(0);
      expect(karaoke.words[0].endTime).toBe(5);
      expect(karaoke.words[1].text).toBe('world');
      expect(karaoke.words[1].startTime).toBe(5);
      expect(karaoke.words[1].endTime).toBe(10);
    });

    it('handles single word', () => {
      const karaoke = generateKaraokeTiming('Hello', 0, 5);

      expect(karaoke.words).toHaveLength(1);
      expect(karaoke.words[0].startTime).toBe(0);
      expect(karaoke.words[0].endTime).toBe(5);
    });
  });

  describe('applyKaraokeHighlight', () => {
    it('highlights completed words', () => {
      const karaoke = {
        words: [
          { text: 'Hello', startTime: 0, endTime: 2, confidence: 1 },
          { text: 'world', startTime: 2, endTime: 4, confidence: 1 },
        ],
      };

      const result = applyKaraokeHighlight(karaoke, 3);
      expect(result.highlighted).toContain('<mark>Hello</mark>');
      expect(result.highlighted).toContain('<mark style="opacity:0.5">world</mark>');
      expect(result.progress).toBeCloseTo(0.75, 1);
    });

    it('returns no highlights for time before first word', () => {
      const karaoke = {
        words: [{ text: 'Hello', startTime: 2, endTime: 4, confidence: 1 }],
      };

      const result = applyKaraokeHighlight(karaoke, 1);
      expect(result.highlighted).toBe('Hello');
      expect(result.progress).toBe(0);
    });
  });
});