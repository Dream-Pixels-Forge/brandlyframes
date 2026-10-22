/**
 * @brandlyframes/aspect — useAspectPreset hook [BF-212]
 *
 * React hook that returns the dimensions and safe areas for an aspect
 * preset. Wraps {@link getAspectPreset} for use in components.
 */

import { useMemo } from 'react';
import type { AspectPreset } from './types.js';
import { getAspectPreset } from './presets.js';

/**
 * Returns the aspect preset for the given name.
 *
 * @param presetName - aspect preset name ('2.39:1', '16:9', '9:16', '1:1')
 * @returns the matching {@link AspectPreset}
 * @throws if the preset name is unknown
 */
export const useAspectPreset = (
  presetName: '2.39:1' | '16:9' | '9:16' | '1:1',
): AspectPreset => {
  return useMemo(() => getAspectPreset(presetName), [presetName]);
};
