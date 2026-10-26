import { describe, expect, it } from 'vitest';
import { parseWordTimings } from '../src/word-timings';
import type { CaptionCue } from '../src/index';

/** Cue helper — BF-460 word-level timing tests. */
const cue = (text: string, start = 0, end = 2): CaptionCue => ({
  id: 'cue-0',
  startTime: start,
  endTime: end,
  text,
});

describe('parseWordTimings [BF-460 karaoke from cue text]', () => {
  it('returns null for plain cue text without inline timestamps', () => {
    expect(parseWordTimings(cue('Hello world'))).toBeNull();
  });

  it('parses inline VTT word timestamps into per-word timing', () => {
    const data = parseWordTimings(cue('Hello<00:00:00.320> world.<00:00:00.720>'));
    expect(data).not.toBeNull();
    expect(data!.words).toHaveLength(2);
    // First word starts at cue start, ends where the next word starts.
    expect(data!.words[0]).toMatchObject({ text: 'Hello', startTime: 0, endTime: 0.32 });
    // Last word ends at its trailing timestamp (not cue end).
    expect(data!.words[1]).toMatchObject({ text: 'world.', startTime: 0.32, endTime: 0.72 });
  });

  it('ends the last word at cue end when no trailing timestamp', () => {
    const data = parseWordTimings(cue('Hello<00:00:00.500> world', 0, 2.5));
    expect(data!.words[1].endTime).toBe(2.5);
  });

  it('starts the first word at cue start, not at zero', () => {
    const data = parseWordTimings(cue('Hi<00:00:10.500> there', 10, 12));
    expect(data!.words[0]).toMatchObject({ text: 'Hi', startTime: 10, endTime: 10.5 });
    expect(data!.words[1]).toMatchObject({ text: 'there', startTime: 10.5, endTime: 12 });
  });

  it('strips styling tags but keeps their text', () => {
    const data = parseWordTimings(cue('<c>Hello</c><00:00:00.500> <c.bold>world</c>'));
    expect(data!.words.map((w) => w.text)).toEqual(['Hello', 'world']);
  });

  it('splits multi-word segments evenly across the timeline', () => {
    const data = parseWordTimings(cue('a<00:00:01.000> b c'));
    expect(data!.words).toHaveLength(3);
    expect(data!.words[0].endTime).toBe(1);
    // "b" and "c" share the 1.0→2.0 tail equally
    expect(data!.words[1].startTime).toBe(1);
    expect(data!.words[2].endTime).toBe(2);
  });

  it('returns null when timestamps exist but no words remain', () => {
    expect(parseWordTimings(cue('<00:00:00.500>'))).toBeNull();
  });

  it('handles multiline cue text', () => {
    const data = parseWordTimings(cue('line one\n<00:00:00.800>line two'));
    expect(data!.words.map((w) => w.text)).toEqual(['line', 'one', 'line', 'two']);
    expect(data!.words[2].startTime).toBe(0.8);
  });
});
