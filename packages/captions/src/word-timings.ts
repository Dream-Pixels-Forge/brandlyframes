/**
 * Word-level caption timing from cue text [BF-460].
 *
 * ASR exports (VTT flavor, e.g. Deepgram) embed per-word timestamps inline:
 * `Hello<00:00:00.320> world.<00:00:00.720>`. A timestamp starts whatever
 * text follows it; a timestamp with no text after it closes the previous
 * word. {@link parseWordTimings} turns that text into {@link KaraokeData}
 * the karaoke renderer and `<AutoCaptions>` consume.
 */

import type { CaptionCue, KaraokeData, KaraokeWord } from './index';

/** VTT/SRT clock timestamp inside cue text, e.g. `<00:00:01.240>`. */
const WORD_TS = /<(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})>/g;

/** Any other inline tag (`<c>`, `<i>`, `<v Name>`, …) — stripped, text kept.
 * Word timestamps (`<00:00:01.240>`) are excluded so they survive stripping. */
const OTHER_TAG = /<(?!\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})[^<>]*>/g;

const toSeconds = (h: string, m: string, s: string, ms: string): number =>
  Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000;

/**
 * Extract per-word timing from a cue's text, or `null` when the text has no
 * inline timestamps (callers fall back to `cue.karaoke` or equal-share
 * timing). Times are absolute, on the same clock as the cue itself.
 *
 * Rule: a word ends where the next word starts; the last word ends at the
 * first timestamp following it with no text after, or at the cue end.
 */
export function parseWordTimings(cue: CaptionCue): KaraokeData | null {
  const text = cue.text.replace(OTHER_TAG, '');
  if (!WORD_TS.test(text)) return null;
  WORD_TS.lastIndex = 0;

  const tokens: Array<{ text: string; startTime: number }> = [];
  let cursor = cue.startTime;
  let lastEnd = cue.endTime;
  // split() with capture groups: [seg0, h, m, s, ms, seg1, h, m, s, ms, …]
  const parts = text.split(WORD_TS);

  for (let i = 0; i < parts.length; i += 5) {
    const words = parts[i].split(/\s+/).filter(Boolean);
    for (const word of words) tokens.push({ text: word, startTime: cursor });

    if (parts[i + 1] === undefined) break;
    const stamp = toSeconds(parts[i + 1], parts[i + 2], parts[i + 3], parts[i + 4]);
    const nextHasWords = (parts[i + 5] ?? '').split(/\s+/).some(Boolean);
    if (nextHasWords) {
      cursor = stamp; // anchors the words that follow
    } else if (tokens.length > 0) {
      lastEnd = stamp; // trailing stamp closes the last word
    }
  }

  if (tokens.length === 0) return null;
  return {
    words: tokens.map((token, i): KaraokeWord => ({
      text: token.text,
      startTime: token.startTime,
      endTime: i + 1 < tokens.length ? tokens[i + 1].startTime : lastEnd,
      confidence: 1,
    })),
  };
}
