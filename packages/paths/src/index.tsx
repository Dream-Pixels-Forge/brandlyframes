/**
 * @brandlyframes/paths — path utilities and animations [BF-070]
 *
 * Path manipulation, morphing, and animation utilities for BrandlyFrames.
 * Clean-room implementation.
 */

import type { FC, SVGProps } from 'react';
import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

/**
 * Path command types for building paths programmatically.
 */
export type PathCommand =
  | ['M', number, number]
  | ['m', number, number]
  | ['L', number, number]
  | ['l', number, number]
  | ['H', number]
  | ['h', number]
  | ['V', number]
  | ['v', number]
  | ['C', number, number, number, number, number, number]
  | ['c', number, number, number, number, number, number]
  | ['S', number, number, number, number]
  | ['s', number, number, number, number]
  | ['Q', number, number, number, number]
  | ['q', number, number, number, number]
  | ['T', number, number]
  | ['t', number, number]
  | ['A', number, number, number, 0 | 1, 0 | 1, number, number]
  | ['a', number, number, number, 0 | 1, 0 | 1, number, number]
  | ['Z']
  | ['z'];

/**
 * Builds an SVG path string from commands.
 */
export function buildPath(commands: PathCommand[]): string {
  return commands
    .map((cmd) => {
      const [letter, ...params] = cmd;
      if (params.length === 0) return letter;
      return `${letter} ${params.join(' ')}`;
    })
    .join(' ');
}

/**
 * Parses an SVG path string into commands.
 */
export function parsePath(pathString: string): PathCommand[] {
  const regex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  const commands: PathCommand[] = [];
  let match;

  while ((match = regex.exec(pathString)) !== null) {
    const letter = match[1];
    const params = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    commands.push([letter as PathCommand[0], ...params] as PathCommand);
  }

  return commands;
}

/**
 * Interpolates between two path strings.
 */
export function interpolatePath(
  pathA: string,
  pathB: string,
  t: number
): string {
  const commandsA = parsePath(pathA);
  const commandsB = parsePath(pathB);

  // Simplified: assumes same number and type of commands
  const maxLen = Math.max(commandsA.length, commandsB.length);
  const result: PathCommand[] = [];

  for (let i = 0; i < maxLen; i++) {
    const cmdA = commandsA[i] || commandsA[commandsA.length - 1];
    const cmdB = commandsB[i] || commandsB[commandsB.length - 1];

    if (cmdA[0] !== cmdB[0]) {
      result.push(cmdA);
      continue;
    }

    const letter = cmdA[0];
    const params: number[] = [];

    for (let j = 1; j < Math.max(cmdA.length, cmdB.length); j++) {
      const a = Number(cmdA[j] ?? cmdA[cmdA.length - 1]);
      const b = Number(cmdB[j] ?? cmdB[cmdB.length - 1]);
      params.push(a + (b - a) * t);
    }

    result.push([letter, ...params] as PathCommand);
  }

  return buildPath(result);
}

/**
 * Path morphing component for animating between shapes.
 */
export interface PathMorphProps extends SVGProps<SVGPathElement> {
  /** Starting path string. */
  from: string;
  /** Ending path string. */
  to: string;
  /** Animation duration in frames. */
  durationFrames: number;
  /** Easing function. */
  easing?: (t: number) => number;
}

/**
 * PathMorph component — animates between two path shapes.
 */
export const PathMorph: FC<PathMorphProps> = ({
  from,
  to,
  durationFrames,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  const interpolatedPath = interpolatePath(from, to, easedProgress);

  return <path d={interpolatedPath} {...rest} />;
};

/**
 * Creates a rounded rectangle path.
 */
export function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): string {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${x + r} ${y}`,
    `H ${x + width - r}`,
    `A ${r} ${r} 0 0 1 ${x + width} ${y + r}`,
    `V ${y + height - r}`,
    `A ${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

/**
 * Creates a star path.
 */
export function starPath(
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
): string {
  let path = '';
  const step = (Math.PI * 2) / spikes;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < spikes; i++) {
    const angle = startAngle + i * (2 * Math.PI / spikes);
    const outerX = Math.cos(angle) * outerRadius;
    const outerY = Math.sin(angle) * outerRadius;
    const innerAngle = angle + Math.PI / spikes;
    const innerX = Math.cos(innerAngle) * innerRadius;
    const innerY = Math.sin(innerAngle) * innerRadius;

    if (i === 0) {
      path += `M ${outerX} ${outerY}`;
    } else {
      path += ` L ${outerX} ${outerY}`;
    }
    path += ` L ${innerX} ${innerY}`;
  }

  return path + ' Z';
}

/**
 * Creates a regular polygon path.
 */
export function polygonPath(
  cx: number,
  cy: number,
  sides: number,
  radius: number,
  rotation = 0
): string {
  let path = '';
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = rotation - Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * (2 * Math.PI / sides);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    if (i === 0) {
      path += `M ${x} ${y}`;
    } else {
      path += ` L ${x} ${y}`;
    }
  }

  return path + ' Z';
}

/**
 * Creates a spiral path.
 */
export function spiralPath(
  cx: number,
  cy: number,
  turns: number,
  spacing: number,
  startRadius = 0
): string {
  let path = `M ${cx} ${cy}`;
  const pointsPerTurn = 50;
  const totalPoints = turns * pointsPerTurn;

  for (let i = 0; i <= totalPoints; i++) {
    const t = i / pointsPerTurn;
    const angle = t * Math.PI * 2;
    const radius = startRadius + spacing * t;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    path += ` L ${x} ${y}`;
  }

  return path;
}

export default {
  buildPath,
  parsePath,
  interpolatePath,
  PathMorph,
  roundedRect,
  starPath,
  polygonPath,
  spiralPath,
};
