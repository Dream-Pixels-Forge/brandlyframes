/**
 * Cellular automata generator for BrandlyFrames.
 *
 * Conway's Game of Life and generalized cellular automata, frame-locked.
 * Each frame advances the automaton by one generation. Rendered as an SVG
 * grid of colored cells.
 *
 * Deterministic: same seed, rules, and frame always produce the same
 * grid state — satisfies the frame -> pixels contract.
 */

import { useCurrentFrame, useVideoConfig } from 'brandlyframes';
import type { FC, SVGAttributes } from 'react';

/**
 * Cellular automata configuration.
 */
export interface CellularConfig {
  /** Grid width in cells. */
  width: number;
  /** Grid height in cells. */
  height: number;
  /** Rule function: (neighbors, alive) -> next alive. */
  rule: (neighbors: number, alive: boolean) => boolean;
  /** Seed for random initial state. */
  seed: number;
  /** Cell size in pixels (rendering only). */
  cellSize?: number;
  /** Color for alive cells (rendering only). */
  aliveColor?: string;
  /** Color for dead cells (rendering only). */
  deadColor?: string;
  /** Maximum generations (after this, holds final state). */
  maxGenerations?: number;
}

/**
 * Conway's Game of Life rule.
 */
export const gameOfLifeRule: CellularConfig['rule'] = (neighbors, alive) => {
  if (alive) return neighbors === 2 || neighbors === 3;
  return neighbors === 3;
};

/**
 * Generate a random initial grid using a simple PRNG.
 */
function randomGrid(width: number, height: number, seed: number): boolean[][] {
  let state = seed;
  const grid: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      state = (state * 1664525 + 1013904223) % 4294967296;
      row.push((state / 4294967296) > 0.4);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Count alive neighbors (wrapping edges).
 */
function countNeighbors(grid: boolean[][], x: number, y: number): number {
  const { width, height } = { width: grid[0].length, height: grid.length };
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = ((x + dx) % width + width) % width;
      const ny = ((y + dy) % height + height) % height;
      if (grid[ny][nx]) count++;
    }
  }
  return count;
}

/**
 * Advance one generation.
 */
function nextGeneration(
  grid: boolean[][],
  rule: CellularConfig['rule']
): boolean[][] {
  const height = grid.length;
  const width = grid[0].length;
  const next: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      const alive = grid[y][x];
      const neighbors = countNeighbors(grid, x, y);
      row.push(rule(neighbors, alive));
    }
    next.push(row);
  }
  return next;
}

/**
 * Compute the grid state at a given frame (pure, testable).
 * Each frame = one generation.
 */
export function getCellularStateAtFrame(
  config: CellularConfig,
  frame: number
): boolean[][] {
  const { width, height, seed, rule, maxGenerations } = config;
  const generation = maxGenerations
    ? Math.min(frame, maxGenerations)
    : frame;

  let grid = randomGrid(width, height, seed);
  for (let g = 0; g < generation; g++) {
    grid = nextGeneration(grid, rule);
  }
  return grid;
}

/**
 * <CellularAutomata /> — renders cellular automata as an SVG grid.
 *
 * Example (Game of Life):
 *   <CellularAutomata width={40} height={30} rule={gameOfLifeRule} seed={42} cellSize={8} aliveColor="#FF6A00" />
 */
export const CellularAutomata: FC<CellularConfig & SVGAttributes<SVGSVGElement>> = ({
  width,
  height,
  rule,
  seed,
  cellSize = 4,
  aliveColor = '#FF6A00',
  deadColor = '#0A0A0A',
  maxGenerations,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  const grid = getCellularStateAtFrame({ width, height, rule, seed, maxGenerations }, frame);

  const rects = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alive = grid[y][x];
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x * cellSize}
          y={y * cellSize}
          width={cellSize}
          height={cellSize}
          fill={alive ? aliveColor : deadColor}
          stroke="none"
        />
      );
    }
  }

  return (
    <svg
      width={width * cellSize}
      height={height * cellSize}
      style={{ display: 'block', ...rest.style }}
      {...rest}
    >
      {rects}
    </svg>
  );
}

export default { CellularAutomata, gameOfLifeRule, getCellularStateAtFrame };
