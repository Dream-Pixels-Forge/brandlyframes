/**
 * Safe-area-aware caption positioning [BF-460].
 *
 * Broadcast-style safe areas (10% title-safe, 5% action-safe margins) for
 * the three caption-bearing aspect presets (9:16, 16:9, 1:1). Pure and
 * deterministic — no canvas, no clock.
 */

import type { CaptionCue } from './index';

/** Aspect presets captions are positioned within. */
export type CaptionAspectRatio = '9:16' | '16:9' | '1:1';

/** Rectangle in fractions of the frame (0..1). */
export interface SafeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptionSafeArea {
  aspect: CaptionAspectRatio;
  /** 10% margins — captions never leave this box. */
  titleSafe: SafeRect;
  /** 5% margins — graphics limit, kept for completeness. */
  actionSafe: SafeRect;
}

const titleSafe: SafeRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const actionSafe: SafeRect = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };

export const CAPTION_SAFE_AREA_PRESETS: Record<CaptionAspectRatio, CaptionSafeArea> = {
  '9:16': { aspect: '9:16', titleSafe, actionSafe },
  '16:9': { aspect: '16:9', titleSafe, actionSafe },
  '1:1': { aspect: '1:1', titleSafe, actionSafe },
};

/** Returns the safe-area preset for `aspect`; throws for unknown names. */
export function getCaptionSafeArea(aspect: CaptionAspectRatio): CaptionSafeArea {
  const preset = CAPTION_SAFE_AREA_PRESETS[aspect];
  if (!preset) throw new Error(`Unknown caption aspect preset: ${aspect}`);
  return preset;
}

/** Pixel-space layout box a caption must stay inside. */
export interface CaptionLayout {
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
  alignment: 'start' | 'center' | 'end';
}

/**
 * Resolve where a caption block belongs: clamped to the title-safe area,
 * anchored by the cue's `position` (top/center/bottom, default bottom) and
 * `alignment` (start/center/end, default center).
 */
export function resolveCaptionLayout(
  cue: CaptionCue,
  aspect: CaptionAspectRatio,
  width: number,
  height: number,
): CaptionLayout {
  const { titleSafe } = getCaptionSafeArea(aspect);
  const settings = cue.settings ?? {};
  const alignment = settings.alignment ?? 'center';

  const maxWidth = titleSafe.width * width;
  const maxHeight = titleSafe.height * height;
  const safeTop = titleSafe.y * height;
  const safeBottom = (titleSafe.y + titleSafe.height) * height;

  const y =
    settings.position === 'top'
      ? safeTop
      : settings.position === 'center'
        ? safeTop + (safeBottom - safeTop - maxHeight) / 2
        : safeBottom - maxHeight;

  const x =
    alignment === 'start'
      ? titleSafe.x * width
      : alignment === 'end'
        ? (titleSafe.x + titleSafe.width) * width
        : titleSafe.x * width + (titleSafe.width * width) / 2;

  return { x, y, maxWidth, maxHeight, alignment };
}
