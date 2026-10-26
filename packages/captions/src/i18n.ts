/**
 * RTL and multilingual text support for captions [BF-460].
 *
 * Bidirectional detection (first strong character rule) and CJK line-break
 * rules (kinsoku shori: a line never starts with closing punctuation and
 * never ends with an opening bracket). All pure — no canvas, no Intl.
 */

/** Strong RTL ranges: Hebrew, Arabic and Arabic supplements/presentation forms. */
const RTL_RE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074A\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
/** Strong LTR: Latin, Greek, Cyrillic, CJK and Hangul blocks. */
const LTR_RE =
  /[A-Za-z\u00C0-\u024F\u0370-\u04FF\u2E80-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u3040-\u30FF]/;

export type TextDirection = 'ltr' | 'rtl';

/** Languages natively written right-to-left (BCP-47 primary subtags). */
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

/**
 * First-strong-character direction detection: the first character with a
 * strong directionality decides; neutral characters (digits, punctuation,
 * whitespace) are skipped. Defaults to `'ltr'`.
 */
export function detectTextDirection(text: string): TextDirection {
  for (const char of text) {
    if (RTL_RE.test(char)) return 'rtl';
    if (LTR_RE.test(char)) return 'ltr';
  }
  return 'ltr';
}

/** Direction for a BCP-47 language tag ('he-IL' → 'rtl'). Unknown → 'ltr'. */
export function directionForLanguage(languageTag: string): TextDirection {
  const primary = languageTag.split('-')[0].toLowerCase();
  return RTL_LANGUAGES.has(primary) ? 'rtl' : 'ltr';
}

/** CJK ideographs, kana and Hangul. */
const CJK_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/;

export function containsCJK(text: string): boolean {
  return CJK_RE.test(text);
}

/** Closing punctuation — a line must never START with these (kinsoku shori). */
const NO_BREAK_BEFORE = new Set(
  '!%),.:;>?]}¢°·’”‰′″℃、。〉》」』】〕゛゜ゝゞ々ー）］｝，．：；？！…‥',
);
/** Opening punctuation — a line must never END with these. */
const NO_BREAK_AFTER = new Set('$([{£¥·‘“〈《「『【〔＄（［｛｠￡￥');

/**
 * Approximate text width in column units: CJK = 2, everything else = 1.
 * Deterministic canvas-free measure used for line wrapping.
 */
export function measureTextUnits(text: string): number {
  let units = 0;
  for (const char of text) units += CJK_RE.test(char) ? 2 : 1;
  return units;
}

interface Token {
  text: string;
  /** Whitespace glue before this token when joining on one line (' ' or ''). */
  glue: string;
  /** Opening-bracket token that must stay with the next token. */
  keepWithNext: boolean;
  /** Closing-punctuation token that must never start a line. */
  noLineStart: boolean;
}

/**
 * Split text into unbreakable tokens. CJK characters are one token each;
 * closing punctuation is a standalone token that must never start a line;
 * opening punctuation is a token that keeps the next one with it. Other
 * scripts split on whitespace.
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let word = '';
  let glue = '';

  const flush = () => {
    if (word) {
      tokens.push({ text: word, glue, keepWithNext: false, noLineStart: false });
      word = '';
      glue = '';
    }
  };

  for (const char of text) {
    if (char === ' ' || char === '\n' || char === '\t') {
      flush();
      glue = ' ';
    } else if (NO_BREAK_BEFORE.has(char)) {
      flush();
      tokens.push({ text: char, glue, keepWithNext: false, noLineStart: true });
      glue = '';
    } else if (NO_BREAK_AFTER.has(char)) {
      flush();
      tokens.push({ text: char, glue, keepWithNext: true, noLineStart: false });
      glue = '';
    } else if (CJK_RE.test(char)) {
      flush();
      tokens.push({ text: char, glue, keepWithNext: false, noLineStart: false });
      glue = '';
    } else {
      word += char;
    }
  }
  flush();
  return tokens;
}

/**
 * Wrap caption text to `maxWidth` (in {@link measureTextUnits} column units).
 * Word-wraps spaced scripts, character-wraps CJK, and enforces kinsoku rules.
 * Lossless: `lines.join('')` is exact for CJK-only text; whitespace only ever
 * collapses.
 */
export function wrapCaptionText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number = measureTextUnits,
): string[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [text];

  const lines: string[] = [];
  let line = '';
  let lastPlaced: Token | null = null;

  for (const token of tokens) {
    const candidate = line + (line ? token.glue : '') + token.text;
    if (line === '' || measure(candidate) <= maxWidth) {
      line = candidate;
      lastPlaced = token;
      continue;
    }
    if (token.noLineStart && line) {
      // Kinsoku: attach closing punctuation even when it overflows the line —
      // starting a new line with it is worse than a slight overflow.
      line = candidate;
      lastPlaced = token;
      continue;
    }
    if (lastPlaced?.keepWithNext) {
      // A line must not end with an opening bracket — move it down with us.
      line = line.slice(0, line.length - lastPlaced.glue.length - lastPlaced.text.length);
      if (line) lines.push(line);
      line = lastPlaced.text + token.text;
    } else {
      if (line) lines.push(line);
      line = token.text;
    }
    lastPlaced = token;
  }
  if (line) lines.push(line);
  return lines;
}
