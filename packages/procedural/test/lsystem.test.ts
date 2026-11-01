/**
 * LSystem tests — [BF-513]
 */

import { describe, it, expect } from 'vitest';
import {
  getLSystemAtFrame,
  deriveLSystem,
  lSystemToPath,
  type LSystemConfig,
} from '../src/lsystem';

describe('deriveLSystem', () => {
  it('returns axiom at iteration 0', () => {
    expect(deriveLSystem('F', { F: 'F+F' }, 0)).toBe('F');
  });

  it('applies one iteration', () => {
    expect(deriveLSystem('F', { F: 'F+F' }, 1)).toBe('F+F');
  });

  it('applies multiple iterations', () => {
    // F -> F+F -> F+F+F+F
    expect(deriveLSystem('F', { F: 'F+F' }, 2)).toBe('F+F+F+F');
  });

  it('leaves unknown symbols unchanged', () => {
    expect(deriveLSystem('AB', { A: 'A+' }, 1)).toBe('A+B');
  });
});

describe('getLSystemAtFrame', () => {
  it('returns axiom at frame 0', () => {
    expect(getLSystemAtFrame('F', { F: 'F+F' }, 5, 0)).toBe('F');
  });

  it('advances one iteration per frame', () => {
    expect(getLSystemAtFrame('F', { F: 'F+F' }, 5, 1)).toBe('F+F');
    expect(getLSystemAtFrame('F', { F: 'F+F' }, 5, 2)).toBe('F+F+F+F');
  });

  it('caps at maxIterations', () => {
    // At frame 10 (beyond maxIterations=5), should still be iteration 5
    const at5 = getLSystemAtFrame('F', { F: 'F+F' }, 5, 5);
    const at10 = getLSystemAtFrame('F', { F: 'F+F' }, 5, 10);
    expect(at10).toBe(at5);
  });

  it('is deterministic', () => {
    const a = getLSystemAtFrame('F', { F: 'F+F' }, 5, 3);
    const b = getLSystemAtFrame('F', { F: 'F+F' }, 5, 3);
    expect(a).toBe(b);
  });
});

describe('lSystemToPath', () => {
  const config: LSystemConfig = {
    axiom: 'F',
    rules: {},
    maxIterations: 1,
    angleDegrees: 90,
    step: 10,
    drawSymbols: ['F'],
    useStack: false,
  };

  it('produces a path starting with M', () => {
    const d = lSystemToPath('F', config);
    expect(d.startsWith('M')).toBe(true);
  });

  it('includes L commands for draw symbols', () => {
    const d = lSystemToPath('FF', config);
    expect(d).toContain('L');
  });

  it('handles turn symbols without drawing', () => {
    const d = lSystemToPath('F+F-F', config);
    expect(d).toContain('M');
    expect(d).toContain('L');
  });

  it('supports stack push/pop', () => {
    const stackConfig: LSystemConfig = {
      ...config,
      useStack: true,
    };
    const d = lSystemToPath('F[+F]F', stackConfig);
    expect(d).toContain('M');
    expect(d.length).toBeGreaterThan(0);
  });
});
