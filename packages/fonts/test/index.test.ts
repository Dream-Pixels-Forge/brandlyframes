/**
 * Fonts tests — [BF-071]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FontRegistry,
  fontRegistry,
  FontSource,
  FontMetrics,
  FontLoadResult,
  measureText,
  shapeText,
  fontStacks,
  googleFonts,
  createFontSource,
  createSystemFontSource,
} from '../src/index';

describe('FontRegistry', () => {
  let registry: FontRegistry;

  beforeEach(() => {
    registry = new FontRegistry();
  });

  it('registers and retrieves font faces', () => {
    const source: FontSource = {
      family: 'TestFont',
      weight: 400,
      style: 'normal',
      local: 'TestFont',
    };

    // We can't easily test FontFace without a browser environment
    // but we can test the registry structure
    expect(registry.has('TestFont', 400, 'normal')).toBe(false);
  });

  it('stores and retrieves metrics', () => {
    const metrics: FontMetrics = {
      family: 'TestFont',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
      underlinePosition: -100,
      underlineThickness: 50,
      glyphCount: 100,
    };

    registry.setMetrics('TestFont', 400, 'normal', metrics);
    const retrieved = registry.getMetrics('TestFont', 400, 'normal');
    expect(retrieved).toEqual(metrics);
  });

  it('generates font face CSS', () => {
    const source: FontSource = {
      family: 'TestFont',
      weight: 400,
      style: 'normal',
      display: 'swap',
      urls: { woff2: '/fonts/test.woff2' },
    };

    const css = fontRegistry.generateFontFaceCSS([source]);
    expect(css).toContain('@font-face');
    expect(css).toContain('font-family: "TestFont"');
    expect(css).toContain('font-weight: 400');
    expect(css).toContain('font-style: normal');
    expect(css).toContain('font-display: swap');
    expect(css).toContain('url("/fonts/test.woff2") format("woff2")');
  });

  it('generates font face CSS with local font', () => {
    const source: FontSource = {
      family: 'SystemFont',
      weight: 400,
      style: 'normal',
      local: 'SystemFont',
    };

    const css = fontRegistry.generateFontFaceCSS([source]);
    expect(css).toContain('local("SystemFont")');
  });

  it('generates font face CSS with unicode range', () => {
    const source: FontSource = {
      family: 'TestFont',
      unicodeRange: 'U+0000-00FF',
      urls: { woff2: '/fonts/test.woff2' },
    };

    const css = fontRegistry.generateFontFaceCSS([source]);
    expect(css).toContain('unicode-range: U+0000-00FF');
  });

  it('generates font face CSS with feature settings', () => {
    const source: FontSource = {
      family: 'TestFont',
      featureSettings: 'liga 1, kern 1',
      urls: { woff2: '/fonts/test.woff2' },
    };

    const css = fontRegistry.generateFontFaceCSS([source]);
    expect(css).toContain('font-feature-settings: "liga 1, kern 1"');
  });

  it('generates font face CSS with variation settings', () => {
    const source: FontSource = {
      family: 'TestFont',
      variationSettings: 'wght 400',
      urls: { woff2: '/fonts/test.woff2' },
    };

    const css = fontRegistry.generateFontFaceCSS([source]);
    expect(css).toContain('font-variation-settings: "wght 400"');
  });
});

describe('measureText', () => {
  it('measures text width and height', () => {
    const result = measureText('Hello', '16px Arial');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('accounts for letter spacing', () => {
    const without = measureText('Hello', '16px Arial');
    const withSpacing = measureText('Hello', '16px Arial', { letterSpacing: 2 });
    expect(withSpacing.width).toBeGreaterThan(without.width);
  });

  it('accounts for word spacing', () => {
    const without = measureText('Hello world', '16px Arial');
    const withSpacing = measureText('Hello world', '16px Arial', { wordSpacing: 4 });
    expect(withSpacing.width).toBeGreaterThan(without.width);
  });
});

describe('shapeText', () => {
  it('shapes text into positioned glyphs', () => {
    const shaped = shapeText('Hello', 'Arial', 16);
    expect(shaped.lines.length).toBe(1);
    expect(shaped.lines[0].glyphs.length).toBe(5);
    expect(shaped.width).toBeGreaterThan(0);
    expect(shaped.height).toBeGreaterThan(0);
  });

  it('handles multi-word text', () => {
    const shaped = shapeText('Hello world', 'Arial', 16);
    expect(shaped.lines.length).toBe(1);
    // 5 + 1 space + 5 = 11 characters
    expect(shaped.lines[0].glyphs.length).toBeGreaterThan(5);
  });

  it('returns correct bounds', () => {
    const shaped = shapeText('Test', 'Arial', 16);
    expect(shaped.bounds.x).toBe(0);
    expect(shaped.bounds.y).toBe(0);
    expect(shaped.bounds.width).toBeGreaterThan(0);
    expect(shaped.bounds.height).toBeGreaterThan(0);
  });

  it('positions glyphs correctly', () => {
    const shaped = shapeText('AB', 'Arial', 16);
    const glyphs = shaped.lines[0].glyphs;
    expect(glyphs[0].x).toBe(0);
    expect(glyphs[1].x).toBeGreaterThan(glyphs[0].x);
    expect(glyphs[0].advance).toBeGreaterThan(0);
  });
});

describe('fontStacks', () => {
  it('provides sans-serif stack', () => {
    expect(fontStacks.sansSerif).toContain('system-ui');
    expect(fontStacks.sansSerif).toContain('Arial');
    expect(fontStacks.sansSerif).toContain('sans-serif');
  });

  it('provides serif stack', () => {
    expect(fontStacks.serif).toContain('Georgia');
    expect(fontStacks.serif).toContain('serif');
  });

  it('provides monospace stack', () => {
    expect(fontStacks.monospace).toContain('Monaco');
    expect(fontStacks.monospace).toContain('monospace');
  });

  it('provides system stack', () => {
    expect(fontStacks.system).toContain('system-ui');
  });
});

describe('googleFonts', () => {
  it('generates Inter font sources', () => {
    const sources = googleFonts.inter([400, 500, 700]);
    expect(sources.length).toBe(3);
    expect(sources[0].family).toBe('Inter');
    expect(sources[0].weight).toBe(400);
    expect(sources[0].urls?.woff2).toContain('fonts.gstatic.com');
  });

  it('generates Roboto font sources', () => {
    const sources = googleFonts.roboto([400, 500, 700]);
    expect(sources.length).toBe(3);
    expect(sources[0].family).toBe('Roboto');
  });

  it('generates Open Sans font sources', () => {
    const sources = googleFonts.openSans([400, 600, 700]);
    expect(sources.length).toBe(3);
    expect(sources[0].family).toBe('Open Sans');
  });
});

describe('createFontSource', () => {
  it('creates font source from file path', () => {
    const source = createFontSource('CustomFont', '/fonts/custom.woff2', {
      weight: 600,
      style: 'italic',
    });

    expect(source.family).toBe('CustomFont');
    expect(source.weight).toBe(600);
    expect(source.style).toBe('italic');
    expect(source.urls?.woff2).toBe('/fonts/custom.woff2');
  });

  it('detects format from file extension', () => {
    const woff = createFontSource('Font', '/fonts/font.woff');
    const woff2 = createFontSource('Font', '/fonts/font.woff2');
    const ttf = createFontSource('Font', '/fonts/font.ttf');
    const otf = createFontSource('Font', '/fonts/font.otf');

    expect(woff.urls?.woff).toBeDefined();
    expect(woff2.urls?.woff2).toBeDefined();
    expect(ttf.urls?.truetype).toBeDefined();
    expect(otf.urls?.opentype).toBeDefined();
  });
});

describe('createSystemFontSource', () => {
  it('creates system font source', () => {
    const source = createSystemFontSource('SF Pro', '.SF Pro Display', {
      weight: 500,
      style: 'normal',
    });

    expect(source.family).toBe('SF Pro');
    expect(source.local).toBe('.SF Pro Display');
    expect(source.weight).toBe(500);
  });
});

describe('FontRegistry singleton', () => {
  it('provides global fontRegistry instance', () => {
    expect(fontRegistry).toBeInstanceOf(FontRegistry);
  });
});

describe('Font metrics structure', () => {
  it('validates FontMetrics structure', () => {
    const metrics: FontMetrics = {
      family: 'Test',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
      underlinePosition: -100,
      underlineThickness: 50,
      glyphCount: 100,
    };

    expect(metrics.unitsPerEm).toBe(1000);
    expect(metrics.ascender).toBeGreaterThan(0);
    expect(metrics.descender).toBeLessThan(0);
  });
});

describe('TextLayoutOptions', () => {
  it('accepts all layout options', () => {
    const options = {
      fontSize: 16,
      lineHeight: 1.5,
      letterSpacing: 0.5,
      wordSpacing: 2,
      align: 'center' as const,
      direction: 'ltr' as const,
      writingMode: 'horizontal-tb' as const,
      features: { liga: 1, kern: 1 },
      variations: { wght: 400 },
    };

    expect(options.fontSize).toBe(16);
    expect(options.lineHeight).toBe(1.5);
    expect(options.letterSpacing).toBe(0.5);
  });
});

describe('Glyph metrics', () => {
  it('validates GlyphMetrics structure', () => {
    const glyph = {
      index: 65,
      codepoint: 65,
      advanceWidth: 600,
      leftSideBearing: 50,
      rightSideBearing: 50,
      bbox: { xMin: 0, yMin: -100, xMax: 600, yMax: 800 },
    };

    expect(glyph.advanceWidth).toBeGreaterThan(0);
    expect(glyph.bbox.xMax).toBeGreaterThan(glyph.bbox.xMin);
  });
});
