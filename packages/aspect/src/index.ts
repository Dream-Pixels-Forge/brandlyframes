/**
 * @brandlyframes/aspect — aspect-ratio presets with auto-reframe [BF-212]
 *
 * Cinema-standard aspect ratios (2.39:1, 16:9, 9:16, 1:1) with title-safe
 * and action-safe areas, plus auto-reframe and fit-to-preset helpers.
 * Deterministic: no Math.random, no Date.now, no wall clock.
 */

export { ASPECT_PRESETS, getAspectPreset } from './presets.js';
export { autoReframe, fitToPreset } from './auto-reframe.js';
export { useAspectPreset } from './use-aspect-preset.js';
export type {
  AspectPreset,
  AspectPresetName,
  FitMode,
  Rect,
  ReframeResult,
  SafeArea,
  FitResult,
} from './types.js';
