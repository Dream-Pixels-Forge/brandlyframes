import { describe, expect, it } from 'vitest';
import { designTokens } from '@brandlyframes/design';
import {
  CAPTION_STYLE_PRESETS,
  resolveCaptionStyle,
  scaleCaptionStyle,
} from '../src/styles';

describe('Cinema Black caption style presets [BF-460]', () => {
  it('defines cinema-black from design tokens', () => {
    const style = CAPTION_STYLE_PRESETS['cinema-black'];
    expect(style.color).toBe(designTokens['bf-white']);
    expect(style.backgroundColor).toBe('rgba(10, 10, 10, 0.75)');
    expect(style.highlightColor).toBe(designTokens['bf-orange']);
    expect(style.outlineColor).toBe(designTokens['bf-black']);
  });

  it('defines an outline-only preset and a paper (inverse) preset', () => {
    expect(CAPTION_STYLE_PRESETS['cinema-outline'].backgroundColor).toBe('transparent');
    expect(CAPTION_STYLE_PRESETS.paper.color).toBe(designTokens['bf-black']);
    expect(CAPTION_STYLE_PRESETS.paper.backgroundColor).toBe(designTokens['bf-white']);
  });

  it('resolveCaptionStyle merges overrides without mutating the preset', () => {
    const original = CAPTION_STYLE_PRESETS['cinema-black'].fontSize;
    const style = resolveCaptionStyle('cinema-black', { fontSize: 99 });
    expect(style.fontSize).toBe(99);
    expect(CAPTION_STYLE_PRESETS['cinema-black'].fontSize).toBe(original);
  });

  it('throws for unknown preset names', () => {
    expect(() => resolveCaptionStyle('neon' as never)).toThrow();
  });

  it('scaleCaptionStyle scales size-dependent fields only', () => {
    const style = scaleCaptionStyle(CAPTION_STYLE_PRESETS['cinema-black'], 2);
    expect(style.fontSize).toBe(CAPTION_STYLE_PRESETS['cinema-black'].fontSize * 2);
    expect(style.outlineWidth).toBe(CAPTION_STYLE_PRESETS['cinema-black'].outlineWidth * 2);
    expect(style.color).toBe(CAPTION_STYLE_PRESETS['cinema-black'].color);
  });
});
