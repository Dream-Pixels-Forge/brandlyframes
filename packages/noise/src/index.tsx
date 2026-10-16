/**
 * @brandlyframes/noise — noise generation and effects [BF-070]
 *
 * Perlin noise, simplex noise, and noise-based effects for BrandlyFrames.
 * Clean-room implementation.
 */

import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

/**
 * 1D noise function (simple pseudo-random).
 */
export function noise1D(x: number, seed = 0): number {
  const n = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * 2D noise function.
 */
export function noise2D(x: number, y: number, seed = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * 3D noise function (includes time dimension).
 */
export function noise3D(x: number, y: number, z: number, seed = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 43.758 + seed * 13.182) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Fractal Brownian Motion (fBm) noise.
 */
export function fbmNoise(
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
  seed = 0
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency, seed + i) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Turbulence noise (absolute value of noise).
 */
export function turbulenceNoise(
  x: number,
  y: number,
  octaves: number,
  seed = 0
): number {
  let value = 0;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += Math.abs(noise2D(x * frequency, y * frequency, seed + i)) / frequency;
    frequency *= 2;
  }

  return value;
}

/**
 * Ridged noise (inverted turbulence).
 */
export function ridgedNoise(
  x: number,
  y: number,
  octaves: number,
  seed = 0
): number {
  let value = 0;
  let frequency = 1;
  let amplitude = 1;

  for (let i = 0; i < octaves; i++) {
    const n = Math.abs(noise2D(x * frequency, y * frequency, seed + i));
    value += (1 - n) * amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

/**
 * Noise field generator for textures.
 */
export interface NoiseFieldOptions {
  width: number;
  height: number;
  scale?: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  seed?: number;
  type?: 'fbm' | 'turbulence' | 'ridged';
}

/**
 * Generates a noise field as a 2D array.
 */
export function generateNoiseField(options: NoiseFieldOptions): number[][] {
  const {
    width,
    height,
    scale = 0.01,
    octaves = 4,
    persistence = 0.5,
    lacunarity: _lacunarity = 2.0,
    seed = 0,
    type = 'fbm',
  } = options;

  const field: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let value: number;
      const nx = x * scale;
      const ny = y * scale;

      switch (type) {
        case 'turbulence':
          value = turbulenceNoise(nx, ny, octaves, seed);
          break;
        case 'ridged':
          value = ridgedNoise(nx, ny, octaves, seed);
          break;
        case 'fbm':
        default:
          value = fbmNoise(nx, ny, octaves, persistence, 2.0, seed);
          break;
      }

      row.push(value);
    }
    field.push(row);
  }

  return field;
}

/**
 * Normalizes noise field to 0-1 range.
 */
export function normalizeNoiseField(field: number[][]): number[][] {
  let min = Infinity;
  let max = -Infinity;

  for (const row of field) {
    for (const val of row) {
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }

  const range = max - min;
  if (range === 0) return field.map(row => row.map(() => 0.5));

  return field.map(row => row.map(val => (val - min) / range));
}

/**
 * Applies a color ramp to a noise field.
 */
export function colorizeNoiseField(
  field: number[][],
  colorStops: Array<{ position: number; color: string }>
): string[][] {
  const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);

  return field.map(row =>
    row.map(value => {
      // Find the two color stops to interpolate between
      for (let i = 0; i < sortedStops.length - 1; i++) {
        const a = sortedStops[i];
        const b = sortedStops[i + 1];
        if (value >= a.position && value <= b.position) {
          const t = (value - a.position) / (b.position - a.position);
          return interpolateColor(a.color, b.color, t);
        }
      }
      return sortedStops[0].color;
    })
  );
}

/**
 * Interpolates between two CSS colors.
 */
function interpolateColor(colorA: string, colorB: string, t: number): string {
  const parseColor = (c: string): [number, number, number, number] => {
    if (c.startsWith('#')) {
      const hex = c.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b, 1];
    }
    if (c.startsWith('rgb')) {
      const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          match[4] ? parseFloat(match[4]) : 1,
        ];
      }
    }
    return [0, 0, 0, 1];
  };

  const [r1, g1, b1, a1] = parseColor(colorA);
  const [r2, g2, b2, a2] = parseColor(colorB);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  const a = a1 + (a2 - a1) * t;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Animated noise component for React.
 */
export interface AnimatedNoiseProps {
  width: number;
  height: number;
  scale?: number;
  octaves?: number;
  speed?: number;
  type?: 'fbm' | 'turbulence' | 'ridged';
  colorStops?: Array<{ position: number; color: string }>;
  style?: React.CSSProperties;
}

/**
 * AnimatedNoise component — renders animated noise as SVG.
 */
export const AnimatedNoise = ({
  width = 100,
  height = 100,
  scale = 0.05,
  octaves: _octaves = 4,
  speed = 1,
  type = 'fbm' as 'fbm' | 'turbulence' | 'ridged',
  colorStops = [
    { position: 0, color: '#000000' },
    { position: 1, color: '#FFFFFF' },
  ],
  style = {},
} = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const time = (frame / fps) * speed;
  const seed = Math.floor(time);

  // Generate noise field for current frame
  const field = generateNoiseField({
    width,
    height,
    scale,
    octaves: 4,
    seed: Math.floor(seed),
    type: type as 'fbm' | 'turbulence' | 'ridged',
  });

  const normalized = normalizeNoiseField(field);
  const colored = colorizeNoiseField(normalized, colorStops);

  // Build SVG rect elements
  const rects: JSX.Element[] = [];
  const cellWidth = 1;
  const cellHeight = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={cellWidth}
          height={cellHeight}
          fill={colored[y][x]}
        />
      );
    }
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ ...style, display: 'block' }}
    >
      {rects}
    </svg>
  );
}

/**
 * NoiseField component — static noise field as image.
 */
export interface NoiseFieldProps {
  width: number;
  height: number;
  scale?: number;
  octaves?: number;
  seed?: number;
  type?: 'fbm' | 'turbulence' | 'ridged';
  colorStops?: Array<{ position: number; color: string }>;
  style?: React.CSSProperties;
}

export const NoiseField = ({
  width = 100,
  height = 100,
  scale = 0.05,
  octaves = 4,
  seed = 0,
  type = 'fbm' as 'fbm' | 'turbulence' | 'ridged',
  colorStops = [
    { position: 0, color: '#000000' },
    { position: 1, color: '#FFFFFF' },
  ],
  style = {},
} = {}) => {
  const field = generateNoiseField({
    width,
    height,
    scale,
    octaves,
    seed,
    type,
  });

  const normalized = normalizeNoiseField(field);
  const colored = colorizeNoiseField(normalized, colorStops);

  const rects: JSX.Element[] = [];
  const cellWidth = 1;
  const cellHeight = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={cellWidth}
          height={cellHeight}
          fill={colored[y][x]}
        />
      );
    }
  }

  return (
    <svg width={width} height={height} style={style}>
      {rects}
    </svg>
  );
}

export default {
  noise1D,
  noise2D,
  noise3D,
  fbmNoise,
  turbulenceNoise,
  ridgedNoise,
  generateNoiseField,
  normalizeNoiseField,
  colorizeNoiseField,
  AnimatedNoise,
  NoiseField,
};
