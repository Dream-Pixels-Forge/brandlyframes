/**
 * Paths tests — [BF-070]
 */

import { describe, it, expect } from 'vitest';
import {
  buildPath,
  parsePath,
  interpolatePath,
  roundedRect,
  starPath,
  polygonPath,
  spiralPath,
} from '../src/index';

describe('buildPath', () => {
  it('builds simple path from commands', () => {
    const commands = [
      ['M', 0, 0],
      ['L', 100, 100],
      ['Z'],
    ];
    expect(buildPath(commands)).toBe('M 0 0 L 100 100 Z');
  });

  it('handles all command types', () => {
    const commands = [
      ['M', 0, 0],
      ['L', 50, 50],
      ['H', 100],
      ['V', 100],
      ['C', 100, 100, 150, 150, 200, 200],
      ['Q', 100, 100, 150, 150],
      ['A', 50, 50, 0, 0, 1, 100, 100],
      ['Z'],
    ];
    const path = buildPath(commands);
    expect(path).toContain('M 0 0');
    expect(path).toContain('L 50 50');
    expect(path).toContain('H 100');
    expect(path).toContain('V 100');
    expect(path).toContain('C 100 100 150 150 200 200');
    expect(path).toContain('Z');
  });
});

describe('parsePath', () => {
  it('parses simple path', () => {
    const path = 'M 0 0 L 100 100 Z';
    const commands = parsePath(path);
    expect(commands.length).toBe(3);
    expect(commands[0]).toEqual(['M', 0, 0]);
    expect(commands[1]).toEqual(['L', 100, 100]);
    expect(commands[2]).toEqual(['Z']);
  });

  it('parses complex path', () => {
    const path = 'M 0 0 L 100 100 C 100 100 150 150 200 200 Z';
    const commands = parsePath(path);
    expect(commands.length).toBe(4);
    expect(commands[0][0]).toBe('M');
    expect(commands[2][0]).toBe('C');
  });

  it('round-trip: parse then build', () => {
    const original = 'M 0 0 L 100 100 C 100 100 150 150 200 200 Z';
    const parsed = parsePath(original);
    const rebuilt = buildPath(parsed);
    expect(rebuilt).toBe(original);
  });
});

describe('interpolatePath', () => {
  it('interpolates between two paths', () => {
    const pathA = 'M 0 0 L 100 0';
    const pathB = 'M 0 100 L 100 100';
    const mid = interpolatePath(pathA, pathB, 0.5);
    expect(mid).toContain('M 0 50');
  });

  it('returns pathA at t=0', () => {
    const pathA = 'M 0 0 L 100 0';
    const pathB = 'M 0 100 L 100 100';
    expect(interpolatePath(pathA, pathB, 0)).toBe(pathA);
  });

  it('returns pathB at t=1', () => {
    const pathA = 'M 0 0 L 100 0';
    const pathB = 'M 0 100 L 100 100';
    expect(interpolatePath(pathA, pathB, 1)).toBe(pathB);
  });
});

describe('roundedRect', () => {
  it('generates rounded rect path', () => {
    const path = roundedRect(0, 0, 100, 50, 10);
    expect(path).toContain('M 10 0');
    expect(path).toContain('H 90');
    expect(path).toContain('A 10 10');
    expect(path).toContain('Z');
  });

  it('handles zero radius', () => {
    const path = roundedRect(0, 0, 100, 50, 0);
    expect(path).toContain('M 0 0');
  });
});

describe('starPath', () => {
  it('generates star path', () => {
    const path = starPath(0, 0, 5, 50, 25);
    expect(path).toContain('M ');
    expect(path).toContain(' L ');
    expect(path).toContain(' Z');
  });

  it('generates correct number of spikes', () => {
    const path = starPath(0, 0, 5, 50, 25);
    const _moveCount = (path.match(/M /g) || []).length;
    const lineCount = (path.match(/ L /g) || []).length;
    // 5 spikes = 2 lines per spike (outer + inner) = 10 lines total
    // But first spike uses M for first point, so 9 L commands total
    expect(lineCount).toBe(9);
  });
});

describe('polygonPath', () => {
  it('generates triangle path', () => {
    const path = polygonPath(0, 0, 3, 50);
    expect(path).toContain('M ');
    expect(path).toContain(' L ');
    expect(path).toContain(' Z');
  });

  it('generates square path', () => {
    const path = polygonPath(0, 0, 4, 50);
    const lines = (path.match(/ L /g) || []).length;
    // Square has 4 sides but polygonPath uses M for first vertex and L for remaining 3
    // The 4th side is closed by Z
    expect(lines).toBe(3);
  });

  it('handles rotation', () => {
    const path1 = polygonPath(0, 0, 4, 50, 0);
    const path2 = polygonPath(0, 0, 4, 50, Math.PI / 4);
    expect(path1).not.toBe(path2);
  });
});

describe('spiralPath', () => {
  it('generates spiral path', () => {
    const path = spiralPath(0, 0, 2, 10);
    expect(path).toContain('M 0 0');
    expect(path).toContain(' L ');
  });

  it('generates correct number of turns', () => {
    const path = spiralPath(0, 0, 1, 10);
    const lineCount = (path.match(/ L /g) || []).length;
    expect(lineCount).toBeGreaterThan(40); // ~50 points per turn
  });
});
