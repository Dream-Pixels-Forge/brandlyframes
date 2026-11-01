/**
 * Fractal zoom generator for BrandlyFrames.
 *
 * Renders Mandelbrot and Julia set zooms as SVG, frame-locked.
 * Each frame increases the zoom level deterministically.
 *
 * Deterministic: same seed, maxIterations, and frame always produce the
 * same fractal image — satisfies the frame -> pixels contract.
 */

import { useCurrentFrame, useVideoConfig } from 'brandlyframes';
import type { FC, SVGAttributes } from 'react';

/**
 * Fractal type.
 */
export type FractalType = 'mandelbrot' | 'julia';

/**
 * Fractal configuration.
 */
export interface FractalConfig {
  /** Type of fractal. */
  type: FractalType;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Maximum iterations (higher = more detail). */
  maxIterations: number;
  /** Seed for Julia set constant (ignored for Mandelbrot). */
  seed: number;
  /** Center X in complex plane. */
  centerX: number;
  /** Center Y in complex plane. */
  centerY: number;
  /** Initial zoom level. */
  zoom: number;
  /** Zoom speed per frame (multiplier). */
  zoomSpeed: number;
  /** Color palette. */
  colors: string[];
}

/**
 * Default fractal config (Mandelbrot).
 */
export const defaultFractalConfig: FractalConfig = {
  type: 'mandelbrot',
  width: 400,
  height: 400,
  maxIterations: 100,
  seed: 0,
  centerX: -0.7,
  centerY: 0.0,
  zoom: 1.0,
  zoomSpeed: 1.05,
  colors: ['#0A0A0A', '#1A1A2E', '#16213E', '#0F3460', '#FF6A00', '#FFFFFF'],
};

/**
 * Compute iterations for a point in the complex plane.
 */
function computeIterations(
  cx: number,
  cy: number,
  maxIterations: number
): number {
  let zx = 0;
  let zy = 0;
  let i = 0;
  while (zx * zx + zy * zy < 4 && i < maxIterations) {
    const tmp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = tmp;
    i++;
  }
  return i;
}

/**
 * Interpolate between colors.
 */
function interpolateColors(colors: string[], t: number): string {
  const idx = t * (colors.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  if (i >= colors.length - 1) return colors[colors.length - 1];

  const c1 = hexToRgb(colors[i]);
  const c2 = hexToRgb(colors[i + 1]);

  const r = Math.round(c1.r + (c2.r - c1.r) * frac);
  const g = Math.round(c1.g + (c2.g - c1.g) * frac);
  const b = Math.round(c1.b + (c2.b - c1.b) * frac);

  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Generate fractal pixel data for a given frame (pure, testable).
 * Returns an array of { x, y, color } for non-background pixels.
 */
export function getFractalPoints(
  config: FractalConfig,
  frame: number
): { x: number; y: number; color: string }[] {
  const {
    type,
    width,
    height,
    maxIterations,
    seed,
    centerX,
    centerY,
    zoom,
    zoomSpeed,
    colors,
  } = config;

  const currentZoom = zoom * Math.pow(zoomSpeed, frame);
  const scale = 4.0 / currentZoom; // complex plane units per pixel

  const points: { x: number; y: number; color: string }[] = [];
  const sampleStep = 2; // render every 2px for performance

  // Julia constant derived from seed
  const jx = seed > 0 ? -0.7 + (seed % 100) / 1000 : -0.7;
  const jy = seed > 0 ? 0.27015 + (seed % 100) / 1000 : 0.27015;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const cx = centerX + (x - width / 2) * scale;
      const cy = centerY + (y - height / 2) * scale;

      let zx, zy, i;
      if (type === 'julia') {
        zx = cx;
        zy = cy;
        const cX = jx;
        const cY = jy;
        i = 0;
        while (zx * zx + zy * zy < 4 && i < maxIterations) {
          const tmp: number = zx * zx - zy * zy + cX;
          zy = 2 * zx * zy + cY;
          zx = tmp;
          i++;
        }
      } else {
        i = computeIterations(cx, cy, maxIterations);
      }

      const t = i / maxIterations;
      points.push({
        x,
        y,
        color: i === maxIterations ? '#0A0A0A' : interpolateColors(colors, t),
      });
    }
  }

  return points;
}

/**
 * <FractalZoom /> — renders Mandelbrot or Julia set zoom as SVG.
 *
 * Example (Mandelbrot zoom):
 *   <FractalZoom type="mandelbrot" width={400} height={400} maxIterations={100} seed={42} zoomSpeed={1.05} />
 *
 * Example (Julia):
 *   <FractalZoom type="julia" width={400} height={400} seed={17} zoomSpeed={1.03} />
 */
export const FractalZoom: FC<FractalConfig & SVGAttributes<SVGSVGElement>> = ({
  type = 'mandelbrot',
  width = 400,
  height = 400,
  maxIterations = 100,
  seed = 0,
  centerX = -0.7,
  centerY = 0.0,
  zoom = 1.0,
  zoomSpeed = 1.05,
  colors = ['#0A0A0A', '#1A1A2E', '#16213E', '#0F3460', '#FF6A00', '#FFFFFF'],
  ...rest
}) => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  const config: FractalConfig = {
    type,
    width,
    height,
    maxIterations,
    seed,
    centerX,
    centerY,
    zoom,
    zoomSpeed,
    colors,
  };

  const points = getFractalPoints(config, frame);

  const rects = [];
  const step = 2;
  for (const p of points) {
    if (p.color === '#0A0A0A') continue; // skip background
    rects.push(
      <rect
        key={`${p.x}-${p.y}`}
        x={p.x}
        y={p.y}
        width={step}
        height={step}
        fill={p.color}
        stroke="none"
      />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', backgroundColor: '#0A0A0A', ...rest.style }}
      {...rest}
    >
      {rects}
    </svg>
  );
}

export default { FractalZoom, defaultFractalConfig, getFractalPoints };
