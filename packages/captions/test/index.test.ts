/**
 * Captions tests — [BF-070]
 */

import { describe, it, expect } from 'vitest';
import {
  parseSRT,
  parseVTT,
  formatSRTTime,
  detectCaptionFormat,
  parseCaption,
  CaptionTrack,
  CaptionCue,
} from '../src/index';

describe('SRT parsing', () => {
  const sampleSRT = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,000 --> 00:00:08,000
This is a test

3
00:00:10,500 --> 00:00:12,000
Final caption`;

  it('parses SRT into CaptionTrack', () => {
    const track = parseSRT(sampleSRT, 'en', 'English');
    expect(track.language).toBe('en');
    expect(track.label).toBe('English');
    expect(track.cues.length).toBe(3);
  });

  it('parses timing correctly', () => {
    const track = parseSRT(sampleSRT, 'en');
    expect(track.cues[0].start).toBe(1);
    expect(track.cues[0].end).toBe(4);
    expect(track.cues[2].start).toBeCloseTo(10.5);
    expect(track.cues[2].end).toBe(12);
  });

  it('parses text content', () => {
    const track = parseSRT(sampleSRT, 'en');
    expect(track.cues[0].text).toBe('Hello world');
    expect(track.cues[1].text).toBe('This is a test');
    expect(track.cues[2].text).toBe('Final caption');
  });

  it('handles comma and dot in milliseconds', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
Test

2
00:00:05.000 --> 00:00:08.000
Test 2`;
    const track = parseSRT(srt, 'en');
    expect(track.cues.length).toBe(2);
    expect(track.cues[0].start).toBe(1);
    expect(track.cues[1].start).toBe(5);
  });
});

describe('VTT parsing', () => {
  const sampleVTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hello world

2
00:00:05.000 --> 00:00:08.000
This is a test

3
00:00:10.500 --> 00:00:12.000
Final caption`;

  it('parses VTT into CaptionTrack', () => {
    const track = parseVTT(sampleVTT, 'en', 'English');
    expect(track.language).toBe('en');
    expect(track.label).toBe('English');
    expect(track.cues.length).toBe(3);
  });

  it('parses VTT timing correctly', () => {
    const track = parseVTT(sampleVTT, 'en');
    expect(track.cues[0].start).toBe(1);
    expect(track.cues[0].end).toBe(4);
    expect(track.cues[2].start).toBeCloseTo(10.5);
    expect(track.cues[2].end).toBe(12);
  });

  it('handles VTT with styling cues', () => {
    const vtt = `WEBVTT

STYLE
::cue {
  color: yellow;
}

1
00:00:01.000 --> 00:00:04.000
Styled caption`;
    const track = parseVTT(vtt, 'en');
    expect(track.cues.length).toBe(1);
    expect(track.cues[0].text).toBe('Styled caption');
  });
});

describe('formatSRTTime', () => {
  it('formats seconds to SRT time', () => {
    expect(formatSRTTime(0)).toBe('00:00:00,000');
    expect(formatSRTTime(1)).toBe('00:00:01,000');
    expect(formatSRTTime(61)).toBe('00:01:01,000');
    expect(formatSRTTime(3661)).toBe('01:01:01,000');
    expect(formatSRTTime(1.5)).toBe('00:00:01,500');
  });
});

describe('detectCaptionFormat', () => {
  it('detects VTT format', () => {
    expect(detectCaptionFormat('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nTest')).toBe('vtt');
  });

  it('detects SRT format', () => {
    expect(detectCaptionFormat('1\n00:00:01,000 --> 00:00:04,000\nTest')).toBe('srt');
  });

  it('returns unknown for invalid format', () => {
    expect(detectCaptionFormat('Invalid format')).toBe('unknown');
  });
});

describe('parseCaption auto-detection', () => {
  it('parses SRT via auto-detection', () => {
    const track = parseCaption('1\n00:00:01,000 --> 00:00:04,000\nTest', 'en');
    expect(track.cues.length).toBe(1);
    expect(track.cues[0].text).toBe('Test');
  });

  it('parses VTT via auto-detection', () => {
    const track = parseCaption('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nTest', 'en');
    expect(track.cues.length).toBe(1);
    expect(track.cues[0].text).toBe('Test');
  });

  it('throws on unknown format', () => {
    expect(() => parseCaption('Invalid format', 'en')).toThrow('Unknown caption format');
  });
});

describe('CaptionTrack structure', () => {
  it('has correct type structure', () => {
    const track: CaptionTrack = {
      language: 'en',
      label: 'English',
      default: true,
      cues: [
        {
          start: 0,
          end: 5,
          text: 'Test',
          id: '1',
        },
      ],
    };
    expect(track.language).toBe('en');
    expect(track.default).toBe(true);
    expect(track.cues[0].start).toBe(0);
  });

  it('CaptionCue has correct structure', () => {
    const cue: CaptionCue = {
      start: 1,
      end: 4,
      text: 'Hello',
      id: 'cue-1',
      style: {
        color: 'red',
        fontSize: 20,
      },
    };
    expect(cue.start).toBe(1);
    expect(cue.style?.color).toBe('red');
  });
});
