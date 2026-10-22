/**
 * @brandlyframes/aspect — aspect-ratio presets [BF-212]
 *
 * Cinema-standard aspect ratios with title-safe and action-safe areas.
 * Safe areas expressed as fractions of width/height (0..1):
 * - Title safe: 90% width, 90% height (keep essential text)
 * - Action safe: 95% width, 95% height (keep essential action)
 */

import type { AspectPreset, AspectPresetName, SafeArea } from './types.js';

const titleSafeFraction = 0.90;
const actionSafeFraction = 0.95;

const safeArea = (width: number, height: number): SafeArea => ({
  title: {
    x: width * (1 - titleSafeFraction) / 2,
    y: height * (1 - titleSafeFraction) / 2,
    width: width * titleSafeFraction,
    height: height * titleSafeFraction,
  },
  action: {
    x: width * (1 - actionSafeFraction) / 2,
    y: height * (1 - actionSafeFraction) / 2,
    width: width * actionSafeFraction,
    height: height * actionSafeFraction,
  },
});

/** All aspect-ratio presets, in order. */
export const ASPECT_PRESETS: readonly AspectPreset[] = [
  {
    name: '2.39:1',
    label: 'Cinema 2.39:1',
    width: 2390,
    height: 1000,
    ratio: 2.39,
    safeArea: safeArea(2390, 1000),
  },
  {
    name: '16:9',
    label: 'HD 16:9',
    width: 1920,
    height: 1080,
    ratio: 16 / 9,
    safeArea: safeArea(1920, 1080),
  },
  {
    name: '9:16',
    label: 'Vertical 9:16',
    width: 1080,
    height: 1920,
    ratio: 9 / 16,
    safeArea: safeArea(1080, 1920),
  },
  {
    name: '1:1',
    label: 'Square 1:1',
    width: 1080,
    height: 1080,
    ratio: 1,
    safeArea: safeArea(1080, 1080),
  },
];

/** Look up a preset by name. Throws if not found. */
export const getAspectPreset = (name: AspectPresetName): AspectPreset => {
  const preset = ASPECT_PRESETS.find((p) => p.name === name);
  if (!preset) {
    throw new Error(`Unknown aspect preset: ${name}`);
  }
  return preset;
};
