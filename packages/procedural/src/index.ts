/**
 * @brandlyframes/procedural — procedural composition generators [BF-513]
 *
 * Procedural composition generators for BrandlyFrames: L-systems, cellular
 * automata, noise-based terrain, fractals — all pure (frame) -> ReactNode
 * functions. Deterministic: same frame number always yields same pixels.
 */

import { LSystem, getLSystemAtFrame } from './lsystem';
import type { LSystemProps, LSystemConfig } from './lsystem';

import {
  CellularAutomata,
  gameOfLifeRule,
  getCellularStateAtFrame,
} from './cellular';
import type { CellularConfig } from './cellular';

import { Terrain, defaultTerrainConfig, getTerrainPoints } from './terrain';
import type { TerrainConfig } from './terrain';

import {
  FractalZoom,
  defaultFractalConfig,
  getFractalPoints,
} from './fractal';
import type { FractalConfig, FractalType } from './fractal';

export { LSystem, getLSystemAtFrame };
export type { LSystemProps, LSystemConfig };

export { CellularAutomata, gameOfLifeRule, getCellularStateAtFrame };
export type { CellularConfig };

export { Terrain, defaultTerrainConfig, getTerrainPoints };
export type { TerrainConfig };

export { FractalZoom, defaultFractalConfig, getFractalPoints };
export type { FractalConfig, FractalType };

export default {
  LSystem,
  CellularAutomata,
  Terrain,
  FractalZoom,
};
