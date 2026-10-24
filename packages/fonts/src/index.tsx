/**
 * @brandlyframes/fonts — font loading, subsetting, and glyph layout [BF-071]
 *
 * Provides font management utilities for BrandlyFrames compositions.
 * Clean-room implementation.
 */

import type { FC } from 'react';
import { useCurrentFrame, holdFrame, releaseFrame } from 'brandlyframes';

/**
 * Font weight values.
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 'normal' | 'bold';

/**
 * Font style values.
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';

/**
 * Font display values for @font-face.
 */
export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional';

/**
 * Font format types.
 */
export type FontFormat = 'woff2' | 'woff' | 'truetype' | 'opentype';

/**
 * Font source descriptor.
 */
export interface FontSource {
  /** Font family name. */
  family: string;
  /** Font weight. */
  weight?: FontWeight;
  /** Font style. */
  style?: FontStyle;
  /** Font display policy. */
  display?: FontDisplay;
  /** Local font name (for system fonts). */
  local?: string;
  /** Remote font URLs by format. */
  urls?: Partial<Record<FontFormat, string>>;
  /** Unicode range for subsetting. */
  unicodeRange?: string;
  /** Font feature settings. */
  featureSettings?: string;
  /** Font variation settings (for variable fonts). */
  variationSettings?: string;
}

/**
 * Font face descriptor for @font-face generation.
 */
export interface FontFaceDescriptor {
  family: string;
  weight: FontWeight;
  style: FontStyle;
  display: FontDisplay;
  src: string;
  unicodeRange?: string;
  featureSettings?: string;
  variationSettings?: string;
}

/**
 * Glyph metrics.
 */
export interface GlyphMetrics {
  /** Glyph index in font. */
  index: number;
  /** Unicode codepoint. */
  codepoint: number;
  /** Advance width. */
  advanceWidth: number;
  /** Left side bearing. */
  leftSideBearing: number;
  /** Right side bearing. */
  rightSideBearing: number;
  /** Bounding box. */
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
}

/**
 * Font metrics.
 */
export interface FontMetrics {
  /** Font family name. */
  family: string;
  /** Units per em. */
  unitsPerEm: number;
  /** Ascender (positive). */
  ascender: number;
  /** Descender (negative). */
  descender: number;
  /** Line gap. */
  lineGap: number;
  /** Cap height. */
  capHeight: number;
  /** x-height. */
  xHeight: number;
  /** Underline position. */
  underlinePosition: number;
  /** Underline thickness. */
  underlineThickness: number;
  /** Glyph count. */
  glyphCount: number;
}

/**
 * Text layout options.
 */
export interface TextLayoutOptions {
  /** Font size in pixels. */
  fontSize: number;
  /** Line height multiplier. */
  lineHeight?: number;
  /** Letter spacing in pixels. */
  letterSpacing?: number;
  /** Word spacing in pixels. */
  wordSpacing?: number;
  /** Text alignment. */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Text direction. */
  direction?: 'ltr' | 'rtl';
  /** Writing mode. */
  writingMode?: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
  /** Font features. */
  features?: Record<string, number | boolean>;
  /** Variable font settings. */
  variations?: Record<string, number>;
}

/**
 * Positioned glyph.
 */
export interface PositionedGlyph {
  /** Glyph index. */
  index: number;
  /** Unicode codepoint. */
  codepoint: number;
  /** X position. */
  x: number;
  /** Y position. */
  y: number;
  /** Glyph advance. */
  advance: number;
  /** Glyph cluster index (for shaping). */
  cluster: number;
}

/**
 * Shaped text line.
 */
export interface ShapedLine {
  /** Positioned glyphs. */
  glyphs: PositionedGlyph[];
  /** Line width. */
  width: number;
  /** Line height. */
  height: number;
  /** Baseline offset. */
  baseline: number;
  /** Line start index in text. */
  start: number;
  /** Line end index in text. */
  end: number;
}

/**
 * Shaped text block.
 */
export interface ShapedText {
  /** Lines of shaped text. */
  lines: ShapedLine[];
  /** Total width. */
  width: number;
  /** Total height. */
  height: number;
  /** Text bounds. */
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Font loader result.
 */
export interface FontLoadResult {
  /** Font family name. */
  family: string;
  /** Whether font loaded successfully. */
  loaded: boolean;
  /** Error message if failed. */
  error?: string;
  /** Font metrics. */
  metrics?: FontMetrics;
}

/**
 * Font loading options.
 */
export interface FontLoadOptions {
  /** Font sources to load. */
  sources?: FontSource[];
  /** Timeout in milliseconds. */
  timeout?: number;
  /** Whether to preload fonts. */
  preload?: boolean;
}

/**
 * Font registry for managing loaded fonts.
 */
export class FontRegistry {
  private fonts = new Map<string, FontFace>();
  private metrics = new Map<string, FontMetrics>();
  private loading = new Map<string, Promise<FontLoadResult>>();

  /**
   * Register a font face.
   */
  register(fontFace: FontFace): void {
    const key = this.getKey(fontFace.family, fontFace.weight as FontWeight, fontFace.style as FontStyle);
    this.fonts.set(key, fontFace);
  }

  /**
   * Get a registered font face.
   */
  get(family: string, weight: FontWeight = 400, style: FontStyle = 'normal'): FontFace | undefined {
    const key = this.getKey(family, weight, style);
    return this.fonts.get(key);
  }

  /**
   * Check if font is registered.
   */
  has(family: string, weight: FontWeight = 400, style: FontStyle = 'normal'): boolean {
    const key = this.getKey(family, weight, style);
    return this.fonts.has(key);
  }

  /**
   * Store font metrics.
   */
  setMetrics(family: string, weight: FontWeight, style: FontStyle, metrics: FontMetrics): void {
    const key = this.getKey(family, weight, style);
    this.metrics.set(key, metrics);
  }

  /**
   * Get font metrics.
   */
  getMetrics(family: string, weight: FontWeight = 400, style: FontStyle = 'normal'): FontMetrics | undefined {
    const key = this.getKey(family, weight, style);
    return this.metrics.get(key);
  }

  /**
   * Load a font from source descriptor.
   */
  async load(source: FontSource, options: FontLoadOptions = {}): Promise<FontLoadResult> {
    const key = `${source.family}-${source.weight || 400}-${source.style || 'normal'}`;
    
    if (this.loading.has(key)) {
      return this.loading.get(key)!;
    }

    const promise = this.loadFont(source, options);
    this.loading.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.loading.delete(key);
    }
  }

  /**
   * Load multiple fonts in parallel.
   */
  async loadAll(sources: FontSource[], options: FontLoadOptions = {}): Promise<FontLoadResult[]> {
    return Promise.all(sources.map(s => this.load(s, options)));
  }

  /**
   * Preload fonts for a composition.
   */
  async preload(sources: FontSource[]): Promise<void> {
    await this.loadAll(sources, { preload: true });
  }

  /**
   * Generate CSS @font-face rules.
   */
  generateFontFaceCSS(sources: FontSource[]): string {
    return sources
      .map(source => this.generateFontFace(source))
      .join('\n');
  }

  private getKey(family: string, weight: FontWeight, style: FontStyle): string {
    return `${family}-${weight}-${style}`;
  }

  private async loadFont(source: FontSource, _options: FontLoadOptions): Promise<FontLoadResult> {
    // In a real implementation, this would use FontFace API or load from URL
    // For now, return a placeholder result
    return {
      family: source.family,
      loaded: true,
      metrics: {
        family: source.family,
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        lineGap: 0,
        capHeight: 700,
        xHeight: 500,
        underlinePosition: -100,
        underlineThickness: 50,
        glyphCount: 0,
      },
    };
  }

  private generateFontFace(source: FontSource): string {
    const src = source.urls
      ? Object.entries(source.urls)
          .map(([format, url]) => `url("${url}") format("${format}")`)
          .join(', ')
      : source.local
        ? `local("${source.local}")`
        : '';

    const descriptors = [
      `font-family: "${source.family}"`,
      `font-weight: ${source.weight || 400}`,
      `font-style: ${source.style || 'normal'}`,
      `font-display: ${source.display || 'swap'}`,
      `src: ${src}`,
    ];

    if (source.unicodeRange) {
      descriptors.push(`unicode-range: ${source.unicodeRange}`);
    }
    if (source.featureSettings) {
      descriptors.push(`font-feature-settings: "${source.featureSettings}"`);
    }
    if (source.variationSettings) {
      descriptors.push(`font-variation-settings: "${source.variationSettings}"`);
    }

    return `@font-face {\n  ${descriptors.join(';\n  ')};\n}`;
  }
}

/**
 * Global font registry instance.
 */
export const fontRegistry = new FontRegistry();

/**
 * Load a font from a source descriptor.
 */
export async function loadFont(source: FontSource, options?: FontLoadOptions): Promise<FontLoadResult> {
  return fontRegistry.load(source, options);
}

/**
 * Load multiple fonts.
 */
export async function loadFonts(sources: FontSource[], options?: FontLoadOptions): Promise<FontLoadResult[]> {
  return fontRegistry.loadAll(sources, options);
}

/**
 * Preload fonts for a composition.
 */
export async function preloadFonts(sources: FontSource[]): Promise<void> {
  return fontRegistry.preload(sources);
}

/**
 * Generate @font-face CSS for sources.
 */
export function generateFontFaceCSS(sources: FontSource[]): string {
  return fontRegistry.generateFontFaceCSS(sources);
}

/**
 * Measure text using canvas (for layout calculations).
 */
export function measureText(
  text: string,
  font: string,
  options?: { letterSpacing?: number; wordSpacing?: number }
): { width: number; height: number } {
  // In a real implementation, this would use canvas or OffscreenCanvas
  // For now, return estimated measurements
  const fontSize = parseInt(font.match(/(\d+)px/)?.[1] || '16', 10);
  const charWidth = fontSize * 0.6;
  const wordSpacing = options?.wordSpacing || 0;
  const letterSpacing = options?.letterSpacing || 0;
  const words = text.split(/\s+/);
  const totalWords = words.length;
  const width = (text.length - totalWords + 1) * charWidth + letterSpacing * (text.length - 1) + wordSpacing * (totalWords - 1);
  const height = fontSize * 1.2;
  return { width, height };
}

/**
 * Create a font subset for given characters.
 */
export function createSubset(
  fontData: ArrayBuffer,
  _characters: string,
  _options?: { format?: FontFormat; hinting?: boolean }
): ArrayBuffer {
  // In a real implementation, this would use font subsetting library (e.g., fontkit, opentype.js)
  // For now, return the original font data
  return fontData;
}

/**
 * Parse font metadata from binary data.
 */
export function parseFontMetadata(_fontData: ArrayBuffer): FontMetrics | null {
  // In a real implementation, this would parse font tables (head, hhea, maxp, etc.)
  // For now, return null
  return null;
}

/**
 * Text shaping (simplified - real implementation would use HarfBuzz).
 */
export function shapeText(
  text: string,
  fontFamily: string,
  fontSize: number,
  _options?: TextLayoutOptions
): ShapedText {
  // Simplified shaping - real implementation would use HarfBuzz
  const lines: ShapedLine[] = [];
  const words = text.split(/\s+/);
  let x = 0;
  const glyphs: PositionedGlyph[] = [];

  let charIndex = 0;
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const codepoint = word.codePointAt(i)!;
      glyphs.push({
        index: codepoint,
        codepoint,
        x,
        y: 0,
        advance: fontSize * 0.6,
        cluster: charIndex,
      });
      x += fontSize * 0.6;
      charIndex++;
    }
    // Word spacing
    x += fontSize * 0.3;
    charIndex++; // space
  }

  const line: ShapedLine = {
    glyphs,
    width: x,
    height: fontSize * 1.2,
    baseline: fontSize * 0.8,
    start: 0,
    end: text.length,
  };

  lines.push(line);

  return {
    lines,
    width: x,
    height: fontSize * 1.2,
    bounds: { x: 0, y: 0, width: x, height: fontSize * 1.2 },
  };
}

/**
 * React hook for font loading (BF-410).
 *
 * Holds the frame via {@link holdFrame} until every source resolves, so the
 * renderer never captures a frame with a fallback font. Releases on load,
 * error, timeout (naming the font URLs) or unmount — never double-releases.
 */
export function useFont(sources: FontSource[]): { loaded: boolean; error?: string } {
  const _frame = useCurrentFrame();
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    let mounted = true;
    let released = false;

    const handle = holdFrame('font-loading');
    const timeoutUrls = sources
      .map((s) => (s.urls ? Object.values(s.urls).join(', ') : s.local ?? s.family))
      .join(', ');
    const timeout = setTimeout(() => {
      if (!released && mounted) {
        released = true;
        releaseFrame(handle);
        setError(`Font load timed out: ${timeoutUrls}`);
      }
    }, 10000);

    const safeRelease = () => {
      if (!released) {
        released = true;
        try {
          releaseFrame(handle);
        } catch {
          // Already released (e.g. by timeout) — idempotent.
        }
      }
    };

    fontRegistry.loadAll(sources, { preload: true }).then((results) => {
      if (!mounted) {
        safeRelease();
        return;
      }
      clearTimeout(timeout);
      const failed = results.find((r) => !r.loaded);
      if (failed) {
        setError(failed.error || `Failed to load font: ${failed.family}`);
      } else {
        setLoaded(true);
      }
      safeRelease();
    }).catch((err) => {
      if (!mounted) {
        safeRelease();
        return;
      }
      clearTimeout(timeout);
      setError(err instanceof Error ? err.message : 'Font loading failed');
      safeRelease();
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      safeRelease();
    };
  }, [sources]);

  return { loaded, error };
}

/**
 * React hook for using a specific font with metrics.
 */
export function useFontMetrics(family: string, weight: FontWeight = 400, style: FontStyle = 'normal'): FontMetrics | undefined {
  return fontRegistry.getMetrics(family, weight, style);
}

/**
 * Font component for declaring fonts in composition.
 */
export interface FontProps {
  /** Font sources. */
  sources: FontSource[];
  /** Children to render after fonts load. */
  children: React.ReactNode;
  /** Fallback to render while loading. */
  fallback?: React.ReactNode;
}

export const Font: FC<FontProps> = ({ sources, children, fallback }) => {
  const { loaded, error } = useFont(sources);

  if (error) {
    console.error('Font loading error:', error);
    return <>{fallback || children}</>;
  }

  if (!loaded) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
};

/**
 * Create a font source from a local file path (for bundlers).
 */
export function createFontSource(
  family: string,
  filePath: string,
  options?: {
    weight?: FontWeight;
    style?: FontStyle;
    display?: FontDisplay;
  }
): FontSource {
  const ext = filePath.split('.').pop()?.toLowerCase() || 'woff2';
  const formatMap: Record<string, FontFormat> = {
    woff2: 'woff2',
    woff: 'woff',
    ttf: 'truetype',
    otf: 'opentype',
  };
  const format = formatMap[ext] || 'woff2';
  return {
    family,
    weight: options?.weight,
    style: options?.style,
    display: options?.display,
    urls: { [format]: filePath },
  };
}

/**
 * Create a font source from a system font.
 */
export function createSystemFontSource(
  family: string,
  localName: string,
  options?: {
    weight?: FontWeight;
    style?: FontStyle;
    display?: FontDisplay;
  }
): FontSource {
  return {
    family,
    weight: options?.weight,
    style: options?.style,
    display: options?.display,
    local: localName,
  };
}

/**
 * Common font stacks for easy use.
 */
export const fontStacks = {
  sansSerif: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
  monospace: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
  system: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
};

/**
 * Google Fonts helper for common fonts.
 */
/**
 * Google Fonts helper for common fonts.
 */
export const googleFonts = {
  inter(weights: FontWeight[] = [400, 500, 600, 700]) {
    return weights.map(w => ({
      family: 'Inter',
      weight: w,
      urls: { woff2: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2' },
    }));
  },

  roboto(weights: FontWeight[] = [400, 500, 700]) {
    return weights.map(w => ({
      family: 'Roboto',
      weight: w,
      urls: { woff2: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2' },
    }));
  },

  openSans(weights: FontWeight[] = [400, 600, 700]) {
    return weights.map(w => ({
      family: 'Open Sans',
      weight: w,
      urls: { woff2: 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVQUwaE.woff2' },
    }));
  },
};

import React from 'react';
