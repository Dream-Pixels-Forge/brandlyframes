/**
 * Noise-based terrain generator for BrandlyFrames.
 *
 * Renders fractal Brownian motion (fBm) noise as an SVG terrain surface,
 * animated frame by frame. Uses @brandlyframes/noise for the noise field.
 *
 * Deterministic: same seed, scale, octaves, and frame always produce the
 * same terrain — satisfies the frame -> pixels contract.
 */

import { fbmNoise } from '@brandlyframes/noise';
import { useCurrentFrame, useVideoConfig } from 'brandlyframes';
import type { FC, SVGAttributes } from 'react';

/**
 * Terrain configuration.
 */
export interface TerrainConfig {
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Noise scale (lower = smoother). */
  scale: number;
  /** Number of fBm octaves. */
  octaves: number;
  /** Persistence (0-1). */
  persistence: number;
  /** Lacunarity (>1). */
  lacunarity: number;
  /** Seed for noise. */
  seed: number;
  /** Fill color (gradient start). */
  fillColor: string;
  /** Line color. */
  lineColor: string;
  /** Animation speed (frames per octave shift). */
  speed: number;
}

/**
 * Default terrain config.
 */
export const defaultTerrainConfig: TerrainConfig = {
  width: 800,
  height: 400,
  scale: 0.005,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2.0,
  seed: 0,
  fillColor: '#0A0A0A',
  lineColor: '#FF6A00',
  speed: 1,
};

/**
 * Compute terrain points for a given frame (pure, testable).
 * Returns array of { x, y } points forming a closed area.
 */
export function getTerrainPoints(
  config: TerrainConfig,
  frame: number
): { x: number; y: number }[] {
  const {
    width,
    height,
    scale,
    octaves,
    persistence,
    lacunarity,
    seed,
    speed,
  } = config;

  const timeOffset = (frame / speed) * 0.01;
  const points: { x: number; y: number }[] = [];

  const step = 4; // sample every 4px for performance
  for (let x = 0; x <= width; x += step) {
    const nx = x * scale;
    // Use fBm noise with time offset for animation
    const noiseVal = fbmNoise(
      nx + timeOffset,
      timeOffset,
      octaves,
      persistence,
      lacunarity,
      seed
    );
    // Map noise (0-1) to y position in lower half of canvas
    const y = height * 0.6 + noiseVal * height * 0.35;
    points.push({ x, y });
  }

  // Close the path at the bottom
  points.push({ x: width, y: height });
  points.push({ x: 0, y: height });

  return points;
}

/**
 * Convert terrain points to an SVG path `d` attribute.
 */
function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const parts = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * <Terrain /> — renders animated noise-based terrain as SVG.
 *
 * Example:
 *   <Terrain width={800} height={400} scale={0.005} octaves={4} seed={42} lineColor="#FF6A00" speed={2} />
 */
export const Terrain: FC<TerrainConfig & SVGAttributes<SVGSVGElement>> = ({
  width = 800,
  height = 400,
  scale = 0.005,
  octaves = 4,
  persistence = 0.5,
  lacunarity = 2.0,
  seed = 0,
  fillColor = '#0A0A0A',
  lineColor = '#FF6A00',
  speed = 1,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  const config: TerrainConfig = {
    width,
    height,
    scale,
    octaves,
    persistence,
    lacunarity,
    seed,
    fillColor,
    lineColor,
    speed,
  };

  const points = getTerrainPoints(config, frame);
  const pathD = pointsToPath(points);

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', ...rest.style }}
      {...rest}
    >
      <path
        d={pathD}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}

export default { Terrain, defaultTerrainConfig, getTerrainPoints };
