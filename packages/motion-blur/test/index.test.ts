/**
 * Motion Blur tests — [BF-070]
 */

import { describe, it, expect } from 'vitest';
import {
  QUALITY_SAMPLES,
  calculateMotionVector,
  interpolateTransform,
  Transform2D,
  MotionBlurQuality,
} from '../src/index';

describe('QUALITY_SAMPLES', () => {
  it('has correct sample counts for each quality', () => {
    expect(QUALITY_SAMPLES.low).toBe(4);
    expect(QUALITY_SAMPLES.medium).toBe(8);
    expect(QUALITY_SAMPLES.high).toBe(16);
    expect(QUALITY_SAMPLES.ultra).toBe(32);
  });

  it('increases with quality', () => {
    expect(QUALITY_SAMPLES.low).toBeLessThan(QUALITY_SAMPLES.medium);
    expect(QUALITY_SAMPLES.medium).toBeLessThan(QUALITY_SAMPLES.high);
    expect(QUALITY_SAMPLES.high).toBeLessThan(QUALITY_SAMPLES.ultra);
  });
});

describe('calculateMotionVector', () => {
  it('calculates translation vector', () => {
    const prev: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const curr: Transform2D = { x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1 };
    const vector = calculateMotionVector(prev, curr);
    expect(vector.x).toBe(10);
    expect(vector.y).toBe(20);
  });

  it('calculates rotation difference', () => {
    const prev: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const curr: Transform2D = { x: 0, y: 0, rotation: Math.PI / 2, scaleX: 1, scaleY: 1 };
    const vector = calculateMotionVector(prev, curr);
    expect(vector.rotation).toBe(Math.PI / 2);
  });

  it('calculates scale difference', () => {
    const prev: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const curr: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 2, scaleY: 1.5 };
    const vector = calculateMotionVector(prev, curr);
    expect(vector.scaleX).toBe(1);
    expect(vector.scaleY).toBe(0.5);
  });

  it('returns zero for identical transforms', () => {
    const t: Transform2D = { x: 5, y: 10, rotation: 0.5, scaleX: 1.2, scaleY: 0.8 };
    const vector = calculateMotionVector(t, t);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(0);
    expect(vector.rotation).toBe(0);
    expect(vector.scaleX).toBe(0);
    expect(vector.scaleY).toBe(0);
  });
});

describe('interpolateTransform', () => {
  it('returns start transform at t=0', () => {
    const a: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const b: Transform2D = { x: 100, y: 100, rotation: Math.PI, scaleX: 2, scaleY: 2 };
    const result = interpolateTransform(a, b, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.rotation).toBe(0);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });

  it('returns end transform at t=1', () => {
    const a: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const b: Transform2D = { x: 100, y: 100, rotation: Math.PI, scaleX: 2, scaleY: 2 };
    const result = interpolateTransform(a, b, 1);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.rotation).toBe(Math.PI);
    expect(result.scaleX).toBe(2);
    expect(result.scaleY).toBe(2);
  });

  it('interpolates at t=0.5', () => {
    const a: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const b: Transform2D = { x: 100, y: 100, rotation: Math.PI, scaleX: 2, scaleY: 2 };
    const result = interpolateTransform(a, b, 0.5);
    // At t=0.5, easeInOut gives 0.5
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.rotation).toBe(Math.PI / 2);
    expect(result.scaleX).toBe(1.5);
    expect(result.scaleY).toBe(1.5);
  });

  it('uses easeInOut easing', () => {
    const a: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const b: Transform2D = { x: 100, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    
    // At t=0.25, easeInOut gives 2 * 0.25^2 = 0.125
    const result25 = interpolateTransform(a, b, 0.25);
    expect(result25.x).toBe(12.5);
    
    // At t=0.75, easeInOut gives 1 - 2*(0.25)^2 = 0.875
    const result75 = interpolateTransform(a, b, 0.75);
    expect(result75.x).toBe(87.5);
  });

  it('interpolates all properties', () => {
    const a: Transform2D = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const b: Transform2D = { x: 10, y: 20, rotation: 0.5, scaleX: 1.5, scaleY: 2 };
    const result = interpolateTransform(a, b, 0.5);
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
    expect(result.rotation).toBe(0.25);
    expect(result.scaleX).toBe(1.25);
    expect(result.scaleY).toBe(1.5);
  });
});

describe('MotionBlurQuality type', () => {
  it('accepts valid quality values', () => {
    const qualities: MotionBlurQuality[] = ['low', 'medium', 'high', 'ultra'];
    for (const q of qualities) {
      expect(QUALITY_SAMPLES[q]).toBeDefined();
    }
  });
});
