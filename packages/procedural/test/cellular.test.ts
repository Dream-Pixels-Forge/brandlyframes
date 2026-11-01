/**
 * Cellular automata tests — [BF-513]
 */

import { describe, it, expect } from 'vitest';
import {
  getCellularStateAtFrame,
  gameOfLifeRule,
  type CellularConfig,
} from '../src/cellular';

describe('gameOfLifeRule', () => {
  it('keeps alive cells with 2 or 3 neighbors', () => {
    expect(gameOfLifeRule(2, true)).toBe(true);
    expect(gameOfLifeRule(3, true)).toBe(true);
  });

  it('kills alive cells with <2 or >3 neighbors', () => {
    expect(gameOfLifeRule(1, true)).toBe(false);
    expect(gameOfLifeRule(4, true)).toBe(false);
  });

  it('births dead cells with exactly 3 neighbors', () => {
    expect(gameOfLifeRule(3, false)).toBe(true);
  });

  it('stays dead otherwise', () => {
    expect(gameOfLifeRule(2, false)).toBe(false);
    expect(gameOfLifeRule(4, false)).toBe(false);
  });
});

describe('getCellularStateAtFrame', () => {
  const config: CellularConfig = {
    width: 5,
    height: 5,
    rule: gameOfLifeRule,
    seed: 42,
    cellSize: 1,
    aliveColor: '#FF6A00',
    deadColor: '#000000',
  };

  it('returns a grid of correct dimensions', () => {
    const grid = getCellularStateAtFrame(config, 0);
    expect(grid).toHaveLength(5);
    expect(grid[0]).toHaveLength(5);
  });

  it('is deterministic with same seed and frame', () => {
    const a = getCellularStateAtFrame(config, 10);
    const b = getCellularStateAtFrame(config, 10);
    expect(a).toEqual(b);
  });

  it('advances generation per frame', () => {
    const g0 = getCellularStateAtFrame(config, 0);
    const g1 = getCellularStateAtFrame(config, 1);
    // Generation 0 is random; generation 1 should be the next step
    expect(g1).not.toEqual(g0);
  });

  it('changes across frames', () => {
    const g0 = getCellularStateAtFrame(config, 0);
    const g5 = getCellularStateAtFrame(config, 5);
    expect(g5).not.toEqual(g0);
  });
});
