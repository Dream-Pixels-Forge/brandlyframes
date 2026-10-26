import { describe, expect, it } from 'vitest';
import {
  containsCJK,
  detectTextDirection,
  directionForLanguage,
  measureTextUnits,
  wrapCaptionText,
} from '../src/i18n';

describe('RTL and multilingual support [BF-460]', () => {
  describe('detectTextDirection', () => {
    it('detects Arabic and Hebrew as RTL', () => {
      expect(detectTextDirection('مرحبا بالعالم')).toBe('rtl');
      expect(detectTextDirection('שלום עולם')).toBe('rtl');
    });

    it('detects Latin and CJK as LTR', () => {
      expect(detectTextDirection('Hello world')).toBe('ltr');
      expect(detectTextDirection('こんにちは世界')).toBe('ltr');
    });

    it('skips neutral leading characters before the first strong one', () => {
      expect(detectTextDirection('... مرحبا')).toBe('rtl');
      expect(detectTextDirection('123 Hello')).toBe('ltr');
      expect(detectTextDirection('')).toBe('ltr');
    });
  });

  describe('directionForLanguage', () => {
    it('maps RTL languages and defaults to LTR', () => {
      expect(directionForLanguage('ar')).toBe('rtl');
      expect(directionForLanguage('he-IL')).toBe('rtl');
      expect(directionForLanguage('fa')).toBe('rtl');
      expect(directionForLanguage('ur-PK')).toBe('rtl');
      expect(directionForLanguage('en')).toBe('ltr');
      expect(directionForLanguage('ja-JP')).toBe('ltr');
    });
  });

  describe('containsCJK', () => {
    it('detects CJK ideographs and kana', () => {
      expect(containsCJK('日本語')).toBe(true);
      expect(containsCJK('ひらがな')).toBe(true);
      expect(containsCJK('한국어')).toBe(true);
      expect(containsCJK('Hello')).toBe(false);
    });
  });

  describe('measureTextUnits', () => {
    it('weights CJK characters double', () => {
      expect(measureTextUnits('ab')).toBe(2);
      expect(measureTextUnits('日')).toBe(2);
      expect(measureTextUnits('a日')).toBe(3);
    });
  });

  describe('wrapCaptionText', () => {
    it('wraps spaced scripts by words', () => {
      const lines = wrapCaptionText('one two three four', 8);
      expect(lines).toEqual(['one two', 'three', 'four']);
    });

    it('wraps CJK by character without exceeding the width', () => {
      const lines = wrapCaptionText('こんにちは世界です', 6);
      for (const line of lines) {
        expect(measureTextUnits(line)).toBeLessThanOrEqual(6);
      }
      expect(lines.join('')).toBe('こんにちは世界です');
    });

    it('never starts a line with closing punctuation (、。」）)', () => {
      const text = 'あいうえお、かきくけこ。さしすせそ';
      const lines = wrapCaptionText(text, 6);
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) {
        expect(line[0]).not.toMatch(/[、。」）]/);
      }
      expect(lines.join('')).toBe(text);
    });

    it('never ends a line with an opening bracket', () => {
      const lines = wrapCaptionText('あああああ「かかか」いいいい', 6);
      for (const line of lines) {
        expect(line.endsWith('「')).toBe(false);
      }
      expect(lines.join('')).toBe('あああああ「かかか」いいいい');
    });

    it('wraps mixed CJK and Latin text losslessly', () => {
      const text = 'See 東京タワー today!';
      const lines = wrapCaptionText(text, 14);
      for (const line of lines) {
        expect(measureTextUnits(line)).toBeLessThanOrEqual(14);
      }
      expect(lines.join(' ').replace(/\s+/g, ' ')).toBe(text);
    });

    it('keeps RTL text as whole words and preserves content', () => {
      const lines = wrapCaptionText('مرحبا بالعالم من الديار', 12);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join(' ')).toBe('مرحبا بالعالم من الديار');
    });

    it('returns the text as a single line when it fits', () => {
      expect(wrapCaptionText('short', 100)).toEqual(['short']);
    });

    it('keeps closing punctuation attached when it would overflow alone', () => {
      // 'いいいいい、' with width 10: 、 must not be pushed to a new line alone
      const lines = wrapCaptionText('いいいいい、かかかかか', 10);
      expect(lines[0].endsWith('、')).toBe(true);
    });
  });
});
