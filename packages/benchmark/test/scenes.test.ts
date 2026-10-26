/**
 * BF-203: standard benchmark scenes.
 *
 * Scenes are deterministic in-process pixel generators (frame -> pixels),
 * so the benchmark suite never needs a browser or the network.
 */

import { describe, expect, it } from 'vitest';
import {
  STANDARD_SCENES,
  generateScenePixels,
  parseSceneUrl,
  sceneUrl,
} from '../src/index.js';

describe('STANDARD_SCENES', () => {
  it('defines exactly three standard scenes with unique ids', () => {
    expect(STANDARD_SCENES).toHaveLength(3);
    const ids = STANDARD_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
    for (const scene of STANDARD_SCENES) {
      expect(scene.width).toBeGreaterThan(0);
      expect(scene.height).toBeGreaterThan(0);
      expect(scene.frameCount).toBeGreaterThan(0);
    }
  });
});

describe('generateScenePixels', () => {
  it('is deterministic: same inputs, same bytes', () => {
    const a = generateScenePixels('gradient', 7, 64, 48);
    const b = generateScenePixels('gradient', 7, 64, 48);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('animates: different frames yield different pixels', () => {
    for (const scene of STANDARD_SCENES) {
      const f0 = generateScenePixels(scene.id, 0, scene.width, scene.height);
      const f1 = generateScenePixels(scene.id, 1, scene.width, scene.height);
      expect(Array.from(f0)).not.toEqual(Array.from(f1));
    }
  });

  it('produces RGBA buffers of width*height*4', () => {
    const px = generateScenePixels('checkerboard', 3, 32, 16);
    expect(px).toHaveLength(32 * 16 * 4);
  });

  it('throws on unknown scene id', () => {
    expect(() => generateScenePixels('nope', 0, 8, 8)).toThrow(/unknown scene/i);
  });
});

describe('sceneUrl / parseSceneUrl', () => {
  it('round-trips scene ids through the benchmark-scene:// URL', () => {
    for (const scene of STANDARD_SCENES) {
      expect(parseSceneUrl(sceneUrl(scene.id))).toBe(scene.id);
    }
  });

  it('rejects non-scene URLs and unknown ids', () => {
    expect(() => parseSceneUrl('http://localhost:3000/Intro')).toThrow(/not a benchmark scene/i);
    expect(() => parseSceneUrl('benchmark-scene://nope')).toThrow(/unknown scene/i);
  });
});
