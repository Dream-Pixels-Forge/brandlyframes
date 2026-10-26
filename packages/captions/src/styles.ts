/**
 * Caption style presets aligned with Cinema Black tokens [BF-460].
 *
 * Colors come straight from `@brandlyframes/design` `designTokens` so
 * captions match the Studio/Player palette. The dark-panel background is
 * `bf-black` (#0A0A0A) at 75% alpha — the same "theater dark" plate used
 * across Cinema Black surfaces.
 */

import { designTokens } from '@brandlyframes/design';

/** Visual style for a caption block. Font sizes reference a 1080p frame. */
export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  /** Fill color of the caption text. */
  color: string;
  /** Panel behind the text; 'transparent' for outline-only presets. */
  backgroundColor: string;
  /** Karaoke highlight fill for spoken/current words. */
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  lineHeight: number;
}

export type CaptionStylePresetName = 'cinema-black' | 'cinema-outline' | 'cinema-karaoke' | 'paper';

export const CAPTION_STYLE_PRESETS: Record<CaptionStylePresetName, CaptionStyle> = {
  // Dark panel + white text + orange highlight — the Cinema Black baseline.
  'cinema-black': {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 48,
    fontWeight: '600',
    color: designTokens['bf-white'],
    backgroundColor: 'rgba(10, 10, 10, 0.75)', // bf-black @ 75%
    highlightColor: designTokens['bf-orange'],
    outlineColor: designTokens['bf-black'],
    outlineWidth: 2,
    lineHeight: 1.4,
  },
  // Outline-only — for bright footage where a panel would clutter.
  'cinema-outline': {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 48,
    fontWeight: '600',
    color: designTokens['bf-white'],
    backgroundColor: 'transparent',
    highlightColor: designTokens['bf-orange'],
    outlineColor: designTokens['bf-black'],
    outlineWidth: 3,
    lineHeight: 1.4,
  },
  // Karaoke fill — white base text that fills with orange per word.
  'cinema-karaoke': {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 56,
    fontWeight: '700',
    color: designTokens['bf-white'],
    backgroundColor: 'transparent',
    highlightColor: designTokens['bf-orange'],
    outlineColor: designTokens['bf-black'],
    outlineWidth: 2,
    lineHeight: 1.4,
  },
  // Paper — the light inverse theme.
  paper: {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 48,
    fontWeight: '600',
    color: designTokens['bf-black'],
    backgroundColor: designTokens['bf-white'],
    highlightColor: designTokens['bf-orange'],
    outlineColor: designTokens['bf-white'],
    outlineWidth: 2,
    lineHeight: 1.4,
  },
};

/**
 * Resolve a preset by name with optional overrides. Throws for unknown
 * preset names; never mutates the stored preset.
 */
export function resolveCaptionStyle(
  name: CaptionStylePresetName,
  overrides: Partial<CaptionStyle> = {},
): CaptionStyle {
  const preset = CAPTION_STYLE_PRESETS[name];
  if (!preset) throw new Error(`Unknown caption style preset: ${name}`);
  return { ...preset, ...overrides };
}

/** Scale the size-dependent fields of a style (fontSize, outlineWidth). */
export function scaleCaptionStyle(style: CaptionStyle, factor: number): CaptionStyle {
  return {
    ...style,
    fontSize: style.fontSize * factor,
    outlineWidth: style.outlineWidth * factor,
  };
}
