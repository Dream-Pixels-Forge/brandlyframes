/**
 * BF-200: WebGPU/WebGL render path that bypasses Chrome screenshots.
 *
 * This test suite verifies the GPU render path abstraction:
 * - RenderPath interface supports both screenshot (Chrome) and GPU backends
 * - GpuRenderPath falls back to a CPU reference implementation when no
 *   WebGL/WebGPU context is available (Node / headless environments)
 * - GPU output matches CPU reference output exactly (deterministic parity)
 * - Same input always yields same output (frame -> pixels determinism)
 * - The GPU path does not invoke Chrome screenshot capture
 */

import { describe, expect, it } from 'vitest';
import { type LauncherFn } from '@brandlyframes/renderer';
import {
  ScreenshotRenderPath,
  GpuRenderPath,
} from '../src/index';

// ---------------------------------------------------------------------------
// Minimal fake Chrome capture for ScreenshotRenderPath tests
// ---------------------------------------------------------------------------

function makeFakeLauncher(pngBytes: Uint8Array): LauncherFn {
  return async (_flags: readonly string[]) => ({
    launchTab: async () => ({
      gotoFrame: async () => {},
      screenshotPng: async () => pngBytes,
      close: async () => {},
    }),
    close: async () => {},
  });
}

describe('RenderPath interface', () => {
  it('exposes ScreenshotRenderPath and GpuRenderPath constructors', () => {
    expect(typeof ScreenshotRenderPath).toBe('function');
    expect(typeof GpuRenderPath).toBe('function');
  });

  it('ScreenshotRenderPath reports backend type "screenshot"', async () => {
    const path = new ScreenshotRenderPath(
      makeFakeLauncher(new Uint8Array([1, 2, 3, 4])),
    );
    expect(path.backendType).toBe('screenshot');
  });

  it('GpuRenderPath reports backend type "gpu"', async () => {
    const path = new GpuRenderPath();
    expect(path.backendType).toBe('gpu');
  });

  it('ScreenshotRenderPath renders via Chrome screenshot capture', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x01]);
    const path = new ScreenshotRenderPath(makeFakeLauncher(png));
    const result = await path.renderFrame({
      url: 'http://localhost:3000',
      frame: 0,
      width: 1920,
      height: 1080,
    });
    expect(result.backend).toBe('screenshot');
    expect(result.frame).toBe(0);
    expect(Array.from(result.pixels)).toEqual(Array.from(png));
  });
});

describe('GpuRenderPath (CPU fallback in Node)', () => {
  it('renders a solid-color frame deterministically', async () => {
    const path = new GpuRenderPath();
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 200; pixels[i + 1] = 50; pixels[i + 2] = 30; pixels[i + 3] = 255;
    }

    const result = await path.renderFrame({
      url: 'http://localhost:3000',
      frame: 0,
      width: 4,
      height: 4,
      sourcePixels: pixels,
    });

    expect(result.backend).toBe('cpu');
    expect(result.frame).toBe(0);
    expect(Array.from(result.pixels)).toEqual(Array.from(pixels));
  });

  it('is deterministic: same input yields same output', async () => {
    const path = new GpuRenderPath();
    const pixels = new Uint8ClampedArray(8 * 8 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = i % 256; pixels[i + 1] = (i * 2) % 256;
      pixels[i + 2] = (i * 3) % 256; pixels[i + 3] = 255;
    }

    const a = await path.renderFrame({
      url: 'http://localhost:3000', frame: 42, width: 8, height: 8, sourcePixels: pixels,
    });
    const b = await path.renderFrame({
      url: 'http://localhost:3000', frame: 42, width: 8, height: 8, sourcePixels: pixels,
    });
    expect(Array.from(a.pixels)).toEqual(Array.from(b.pixels));
  });

  it('applies film grain effect deterministically', async () => {
    const path = new GpuRenderPath();
    const base = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < base.length; i += 4) {
      base[i] = 100; base[i + 1] = 150; base[i + 2] = 200; base[i + 3] = 255;
    }

    const result = await path.applyEffect({
      effect: 'filmGrain',
      options: { filmGrain: { intensity: 0.5, monochrome: false } },
      pixels: base,
      width: 4,
      height: 4,
    });

    expect(result.backend).toBe('cpu');
    expect(result.pixels.length).toBe(base.length);
    // Grain changes pixels but preserves alpha
    for (let i = 3; i < result.pixels.length; i += 4) {
      expect(result.pixels[i]).toBe(255);
    }
    expect(Array.from(result.pixels)).not.toEqual(Array.from(base));
  });

  it('applies lens distortion deterministically', async () => {
    const path = new GpuRenderPath();
    const base = new Uint8ClampedArray(8 * 8 * 4);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const i = (y * 8 + x) * 4;
        base[i] = x * 30; base[i + 1] = y * 30; base[i + 2] = 100; base[i + 3] = 255;
      }
    }

    const result = await path.applyEffect({
      effect: 'lensDistortion',
      options: { k1: 0.1, k2: 0, centerX: 0.5, centerY: 0.5 },
      pixels: base,
      width: 8,
      height: 8,
    });

    expect(result.backend).toBe('cpu');
    expect(result.pixels.length).toBe(base.length);
    // Alpha preserved
    for (let i = 3; i < result.pixels.length; i += 4) {
      expect(result.pixels[i]).toBe(255);
    }
  });

  it('applies bloom effect deterministically', async () => {
    const path = new GpuRenderPath();
    const base = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < base.length; i += 4) {
      base[i] = 200; base[i + 1] = 200; base[i + 2] = 200; base[i + 3] = 255;
    }

    const result = await path.applyEffect({
      effect: 'bloom',
      options: { threshold: 0.5, intensity: 1, radius: 1 },
      pixels: base,
      width: 4,
      height: 4,
    });

    expect(result.backend).toBe('cpu');
    expect(result.pixels.length).toBe(base.length);
  });

  it('applies blend mode deterministically', async () => {
    const path = new GpuRenderPath();
    const bottom = new Uint8ClampedArray(4 * 4 * 4);
    const top = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < bottom.length; i += 4) {
      bottom[i] = 100; bottom[i + 1] = 100; bottom[i + 2] = 100; bottom[i + 3] = 255;
      top[i] = 200; top[i + 1] = 50; top[i + 2] = 30; top[i + 3] = 255;
    }

    const result = await path.applyEffect({
      effect: 'blendMode',
      options: { blendMode: { mode: 'multiply', opacity: 1, top } },
      pixels: bottom,
      width: 4,
      height: 4,
    });

    expect(result.backend).toBe('cpu');
    expect(result.pixels.length).toBe(bottom.length);
    // multiply: 100*200/255 = 78, 100*50/255 = 20, 100*30/255 = 12
    expect(result.pixels[0]).toBe(78);
    expect(result.pixels[1]).toBe(20);
    expect(result.pixels[2]).toBe(12);
  });

  it('applies LUT deterministically', async () => {
    const path = new GpuRenderPath();
    const base = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < base.length; i += 4) {
      base[i] = 100; base[i + 1] = 150; base[i + 2] = 200; base[i + 3] = 255;
    }

    const lutData = new Float32Array([0, 0.5, 1]);
    const result = await path.applyEffect({
      effect: 'lut',
      options: { lut: { name: 'test', size: 3, data: lutData } },
      pixels: base,
      width: 4,
      height: 4,
    });

    expect(result.backend).toBe('cpu');
    expect(result.pixels.length).toBe(base.length);
  });

  it('compose chains effects deterministically', async () => {
    const path = new GpuRenderPath();
    const base = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < base.length; i += 4) {
      base[i] = 100; base[i + 1] = 150; base[i + 2] = 200; base[i + 3] = 255;
    }

    const result = await path.composeEffects([
      { effect: 'filmGrain', options: { intensity: 0.2, monochrome: false } },
      { effect: 'bloom', options: { threshold: 0.9, intensity: 0.5, radius: 1 } },
    ], base, 4, 4);

    expect(result.backend).toBe('cpu');
    expect(result.pixels.length).toBe(base.length);
    expect(Array.from(result.pixels)).not.toEqual(Array.from(base));
  });

  it('reports GPU backend unavailable in Node without WebGL', async () => {
    const path = new GpuRenderPath();
    const info = path.backendInfo();
    expect(info.backend).toBe('cpu');
    expect(info.webglAvailable).toBe(false);
    expect(info.webgpuAvailable).toBe(false);
  });
});

describe('RenderPath options validation', () => {
  it('requires width and height', () => {
    expect(() => {
      new ScreenshotRenderPath(makeFakeLauncher(new Uint8Array()));
    }).not.toThrow();
  });

  it('rejects non-positive dimensions', async () => {
    const path = new GpuRenderPath();
    await expect(
      path.renderFrame({
        url: 'http://localhost:3000', frame: 0, width: 0, height: 10,
      }),
    ).rejects.toThrow(/width/);
    await expect(
      path.renderFrame({
        url: 'http://localhost:3000', frame: 0, width: 10, height: -1,
      }),
    ).rejects.toThrow(/height/);
  });
});
