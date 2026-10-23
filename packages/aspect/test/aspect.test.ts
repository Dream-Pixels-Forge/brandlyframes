/**
 * BF-212: Aspect preset tests.
 *
 * Verifies: preset dimensions, ratios, safe areas, auto-reframe centering,
 * fit modes, and edge cases.
 */

import { describe, expect, it } from 'vitest';
import {
  ASPECT_PRESETS,
  autoReframe,
  fitToPreset,
  getAspectPreset,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Preset tests
// ---------------------------------------------------------------------------

describe('aspect presets', () => {
  it('defines all four standard presets', () => {
    expect(ASPECT_PRESETS).toHaveLength(4);
    expect(ASPECT_PRESETS.map((p) => p.name)).toEqual([
      '2.39:1',
      '16:9',
      '9:16',
      '1:1',
    ]);
  });

  it('has correct ratios', () => {
    const presets = Object.fromEntries(
      ASPECT_PRESETS.map((p) => [p.name, p.ratio]),
    );
    expect(presets['2.39:1']).toBeCloseTo(2.39, 2);
    expect(presets['16:9']).toBeCloseTo(16 / 9, 4);
    expect(presets['9:16']).toBeCloseTo(9 / 16, 4);
    expect(presets['1:1']).toBe(1);
  });

  it('getAspectPreset throws on unknown name', () => {
    expect(() => getAspectPreset('4:3' as never)).toThrow(
      'Unknown aspect preset: 4:3',
    );
  });

  it('16:9 preset dimensions', () => {
    const preset = getAspectPreset('16:9');
    expect(preset.width).toBe(1920);
    expect(preset.height).toBe(1080);
    expect(preset.label).toBe('HD 16:9');
  });

  it('safe areas are within bounds', () => {
    for (const preset of ASPECT_PRESETS) {
      expect(preset.safeArea.title.x).toBeGreaterThanOrEqual(0);
      expect(preset.safeArea.title.y).toBeGreaterThanOrEqual(0);
      expect(preset.safeArea.title.width).toBeGreaterThan(0);
      expect(preset.safeArea.title.height).toBeGreaterThan(0);
      expect(preset.safeArea.action.width).toBeGreaterThan(
        preset.safeArea.title.width,
      );
      expect(preset.safeArea.action.height).toBeGreaterThan(
        preset.safeArea.title.height,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Auto-reframe tests
// ---------------------------------------------------------------------------

describe('autoReframe', () => {
  it('crops narrower source height to match wider target ratio', () => {
    const result = autoReframe(1920, 1080, '2.39:1');
    // Source 16:9 (1.778) is narrower than 2.39:1 (2.39), so crop height
    expect(result.crop.width).toBe(1920);
    expect(result.crop.height).toBeCloseTo(1920 / 2.39, 0);
    expect(result.crop.y).toBeGreaterThanOrEqual(0);
    expect(result.crop.y + result.crop.height).toBeLessThanOrEqual(1080);
  });

  it('crops taller source height to match wider target ratio', () => {
    const result = autoReframe(1080, 1920, '16:9');
    // Source 9:16 (0.5625) is narrower than 16:9 (1.778), so crop height
    expect(result.crop.width).toBe(1080);
    expect(result.crop.height).toBeCloseTo(1080 / (16 / 9), 0);
    expect(result.crop.y).toBeGreaterThanOrEqual(0);
    expect(result.crop.y + result.crop.height).toBeLessThanOrEqual(1920);
  });

  it('keeps subject centered when subjectBox provided', () => {
    const subject = { x: 800, y: 400, width: 200, height: 200 };
    const result = autoReframe(1920, 1080, '2.39:1', subject);
    // Crop center should be near subject center (clamped to bounds)
    const cropCenterX = result.crop.x + result.crop.width / 2;
    const subjectCenterX = subject.x + subject.width / 2;
    expect(Math.abs(cropCenterX - subjectCenterX)).toBeLessThan(
      result.crop.width / 2 + 1,
    );
  });

  it('clamps crop to source bounds', () => {
    const subject = { x: 1800, y: 900, width: 100, height: 100 }; // near edge
    const result = autoReframe(1920, 1080, '2.39:1', subject);
    expect(result.crop.x).toBeGreaterThanOrEqual(0);
    expect(result.crop.y).toBeGreaterThanOrEqual(0);
    expect(result.crop.x + result.crop.width).toBeLessThanOrEqual(1920);
    expect(result.crop.y + result.crop.height).toBeLessThanOrEqual(1080);
  });

  it('scales to fill target width', () => {
    const result = autoReframe(1920, 1080, '1:1');
    expect(result.scale).toBeGreaterThan(0);
    expect(result.crop.width).toBe(result.crop.height); // square crop
  });

  it('returns deterministic results for same input', () => {
    const a = autoReframe(1920, 1080, '16:9');
    const b = autoReframe(1920, 1080, '16:9');
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// Fit-to-preset tests
// ---------------------------------------------------------------------------

describe('fitToPreset', () => {
  it('contain fits within target with letterboxing', () => {
    const result = fitToPreset(1920, 1080, '1:1', 'contain');
    // Source 16:9 wider than square 1:1, so scale by width: 1080/1920 = 0.5625
    expect(result.scale).toBeCloseTo(1080 / 1920, 4);
    expect(result.letterbox.top).toBeGreaterThan(0);
    expect(result.letterbox.bottom).toBeGreaterThan(0);
  });

  it('cover fills target', () => {
    const result = fitToPreset(1920, 1080, '1:1', 'cover');
    expect(result.letterbox.top).toBe(0);
    expect(result.letterbox.bottom).toBe(0);
    expect(result.letterbox.left).toBe(0);
    expect(result.letterbox.right).toBe(0);
  });

  it('fill stretches to target', () => {
    const result = fitToPreset(1920, 1080, '1:1', 'fill');
    expect(result.scale).toBe(1);
    expect(result.letterbox.top).toBe(0);
    expect(result.letterbox.left).toBe(0);
  });

  it('returns deterministic results', () => {
    const a = fitToPreset(1920, 1080, '9:16', 'contain');
    const b = fitToPreset(1920, 1080, '9:16', 'contain');
    expect(a).toEqual(b);
  });
});
