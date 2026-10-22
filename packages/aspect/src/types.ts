/**
 * @brandlyframes/aspect — aspect-ratio preset types [BF-212]
 *
 * Types for aspect-ratio presets, safe areas, fit modes, and auto-reframe
 * results. Deterministic: no Math.random, no Date.now, no wall clock.
 */

/** Aspect-ratio preset name. */
export type AspectPresetName = '2.39:1' | '16:9' | '9:16' | '1:1';

/** Fit mode for scaling source content into a target aspect ratio. */
export type FitMode = 'cover' | 'contain' | 'fill';

/** A rectangular region in pixels. */
export interface Rect {
  /** X position (left edge). */
  readonly x: number;
  /** Y position (top edge). */
  readonly y: number;
  /** Width in pixels. */
  readonly width: number;
  /** Height in pixels. */
  readonly height: number;
}

/** Safe-area definitions for a preset. */
export interface SafeArea {
  /** Title-safe region (keep essential text here). */
  readonly title: Rect;
  /** Action-safe region (keep essential action here). */
  readonly action: Rect;
}

/** An aspect-ratio preset: target dimensions and safe areas. */
export interface AspectPreset {
  /** Preset name. */
  readonly name: AspectPresetName;
  /** Display label. */
  readonly label: string;
  /** Width in pixels (at 1080p base height). */
  readonly width: number;
  /** Height in pixels (at 1080p base height). */
  readonly height: number;
  /** Aspect ratio (width / height). */
  readonly ratio: number;
  /** Safe areas expressed as fractions of width/height (0..1). */
  readonly safeArea: SafeArea;
}

/** Result of auto-reframe: the crop box to apply to source content. */
export interface ReframeResult {
  /** Crop box in source pixels (what to keep). */
  readonly crop: Rect;
  /** Scale to apply after cropping to reach target size. */
  readonly scale: number;
  /** Offset to center the cropped content in the target frame. */
  readonly offsetX: number;
  readonly offsetY: number;
  /** Target preset. */
  readonly preset: AspectPreset;
}

/** Result of fit-to-preset: scale and offset for source content. */
export interface FitResult {
  /** Scale to apply to source content. */
  readonly scale: number;
  /** Offset X to center content in target frame. */
  readonly offsetX: number;
  /** Offset Y to center content in target frame. */
  readonly offsetY: number;
  /** Letterbox/pillarbox bars (top, right, bottom, left in pixels). */
  readonly letterbox: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  /** Target preset. */
  readonly preset: AspectPreset;
}
