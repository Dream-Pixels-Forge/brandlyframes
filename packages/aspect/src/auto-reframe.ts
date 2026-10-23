/**
 * @brandlyframes/aspect — auto-reframe [BF-212]
 *
 * Automatically reframe source content to a target aspect ratio while
 * keeping a subject box centered. Deterministic: pure functions of the
 * input dimensions, no Math.random, no Date.now.
 */

import type { FitMode, FitResult, Rect, ReframeResult } from './types.js';
import { ASPECT_PRESETS, getAspectPreset } from './presets.js';

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

/**
 * Auto-reframe source content to a target aspect ratio.
 *
 * Given source dimensions and a subject box [x, y, w, h] in source pixels,
 * computes the crop box that keeps the subject as centered as possible while
 * fitting the target aspect ratio, plus the scale and offset to place the
 * cropped content in the target frame.
 *
 * @param sourceWidth - source width in pixels
 * @param sourceHeight - source height in pixels
 * @param presetName - target aspect preset name
 * @param subjectBox - optional subject box { x, y, width, height } in source pixels
 * @returns reframe result with crop box, scale, and offset
 */
export const autoReframe = (
  sourceWidth: number,
  sourceHeight: number,
  presetName: '2.39:1' | '16:9' | '9:16' | '1:1',
  subjectBox?: Rect,
): ReframeResult => {
  const preset = getAspectPreset(presetName);
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = preset.ratio;

  // Determine crop dimensions that match the target ratio
  let cropWidth: number;
  let cropHeight: number;
  if (sourceRatio > targetRatio) {
    // Source is wider than target: crop the sides
    cropHeight = sourceHeight;
    cropWidth = sourceHeight * targetRatio;
  } else {
    // Source is taller than target: crop the top/bottom
    cropWidth = sourceWidth;
    cropHeight = sourceWidth / targetRatio;
  }

  // Center the crop on the subject if provided, otherwise center of source
  let cropX: number;
  let cropY: number;
  if (subjectBox) {
    const subjectCenterX = subjectBox.x + subjectBox.width / 2;
    const subjectCenterY = subjectBox.y + subjectBox.height / 2;
    cropX = clamp(subjectCenterX - cropWidth / 2, 0, sourceWidth - cropWidth);
    cropY = clamp(subjectCenterY - cropHeight / 2, 0, sourceHeight - cropHeight);
  } else {
    cropX = (sourceWidth - cropWidth) / 2;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  // Scale the cropped content to fill the target frame
  const scale = preset.width / cropWidth;
  const scaledHeight = cropHeight * scale;

  // Offset to center vertically/horizontally in case of rounding
  const offsetX = (preset.width - cropWidth * scale) / 2;
  const offsetY = (preset.height - scaledHeight) / 2;

  return {
    crop: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
    scale,
    offsetX,
    offsetY,
    preset,
  };
};

/**
 * Fit source content into a target preset without cropping.
 *
 * @param sourceWidth - source width in pixels
 * @param sourceHeight - source height in pixels
 * @param presetName - target aspect preset name
 * @param fitMode - 'cover' (fill target, may crop), 'contain' (fit within, may letterbox), 'fill' (stretch)
 * @returns fit result with scale, offset, and letterbox bars
 */
export const fitToPreset = (
  sourceWidth: number,
  sourceHeight: number,
  presetName: '2.39:1' | '16:9' | '9:16' | '1:1',
  fitMode: FitMode = 'contain',
): FitResult => {
  const preset = getAspectPreset(presetName);

  let scale: number;
  let letterbox: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };

  if (fitMode === 'fill') {
    scale = 1; // stretch handled by target dimensions
    letterbox = { top: 0, right: 0, bottom: 0, left: 0 };
  } else {
    const scaleX = preset.width / sourceWidth;
    const scaleY = preset.height / sourceHeight;

    if (fitMode === 'cover') {
      scale = Math.max(scaleX, scaleY);
    } else {
      // contain
      scale = Math.min(scaleX, scaleY);
    }

    const scaledWidth = sourceWidth * scale;
    const scaledHeight = sourceHeight * scale;

    letterbox = {
      top: fitMode === 'cover' ? 0 : (preset.height - scaledHeight) / 2,
      right: fitMode === 'cover' ? 0 : (preset.width - scaledWidth) / 2,
      bottom: fitMode === 'cover' ? 0 : (preset.height - scaledHeight) / 2,
      left: fitMode === 'cover' ? 0 : (preset.width - scaledWidth) / 2,
    };
  }

  const offsetX = (preset.width - sourceWidth * scale) / 2;
  const offsetY = (preset.height - sourceHeight * scale) / 2;

  return {
    scale,
    offsetX,
    offsetY,
    letterbox,
    preset,
  };
};

/** All available aspect presets. */
export { ASPECT_PRESETS };
