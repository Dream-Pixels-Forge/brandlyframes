/**
 * L-system (Lindenmayer system) generator for BrandlyFrames.
 *
 * An L-system is a parallel rewriting system that grows frame by frame.
 * Each frame advances the derivation by one iteration, producing a string
 * of drawing commands that are rendered as SVG paths.
 *
 * Deterministic: same axiom, rules, seed, and frame always produce the
 * same output — satisfies the frame -> pixels contract.
 */

import { useCurrentFrame, useVideoConfig } from 'brandlyframes';
import type { FC, SVGAttributes } from 'react';

/**
 * L-system configuration.
 */
export interface LSystemConfig {
  /** Starting string (axiom). */
  axiom: string;
  /** Production rules: symbol -> replacement string. */
  rules: Record<string, string>;
  /** Number of iterations to derive (max). */
  maxIterations: number;
  /** Angle for '+' and '-' turns, in degrees. */
  angleDegrees: number;
  /** Step length for 'F' (forward) commands. */
  step: number;
  /** Symbols that draw a line forward. */
  drawSymbols: string[];
  /** Symbols that push/pop state. */
  useStack: boolean;
  /** Color stops for the rendered path. */
  strokeColor?: string;
  /** Stroke width. */
  strokeWidth?: number;
}

/**
 * Derive the L-system string up to a given iteration.
 * Cached by (axiom, rules, maxIterations) — pure function.
 */
function deriveLSystem(
  axiom: string,
  rules: Record<string, string>,
  iteration: number
): string {
  let current = axiom;
  for (let i = 0; i < iteration; i++) {
    let next = '';
    for (const ch of current) {
      next += rules[ch] ?? ch;
    }
    current = next;
  }
  return current;
}

/**
 * Convert an L-system string into an SVG path `d` attribute.
 * Interprets F/draw symbols as line segments, + and - as turns,
 * [ and ] as push/pop (when useStack is true).
 */
function lSystemToPath(
  s: string,
  config: LSystemConfig
): string {
  const { angleDegrees, step, drawSymbols, useStack } = config;
  const angleRad = (angleDegrees * Math.PI) / 180;

  let x = 0;
  let y = 0;
  let heading = -Math.PI / 2; // start pointing up
  const parts: string[] = [`M ${x.toFixed(2)} ${y.toFixed(2)}`];
  const stack: Array<{ x: number; y: number; heading: number }> = [];

  for (const ch of s) {
    if (drawSymbols.includes(ch)) {
      const nx = x + Math.cos(heading) * step;
      const ny = y + Math.sin(heading) * step;
      parts.push(`L ${nx.toFixed(2)} ${ny.toFixed(2)}`);
      x = nx;
      y = ny;
    } else if (ch === '+') {
      heading += angleRad;
    } else if (ch === '-') {
      heading -= angleRad;
    } else if (ch === '[' && useStack) {
      stack.push({ x, y, heading });
    } else if (ch === ']' && useStack) {
      const state = stack.pop();
      if (state) {
        x = state.x;
        y = state.y;
        heading = state.heading;
        parts.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
    }
    // Other symbols are no-ops (variables, constants)
  }

  return parts.join(' ');
}

/**
 * LSystemProps — component props for <LSystem />.
 */
export interface LSystemProps
  extends Omit<LSystemConfig, 'drawSymbols' | 'useStack' | 'strokeWidth'>,
    SVGAttributes<SVGPathElement> {
  /** Override draw symbols. */
  drawSymbols?: string[];
  /** Enable push/pop stack for brackets. */
  useStack?: boolean;
}

/**
 * <LSystem /> — renders an L-system that grows one iteration per frame.
 *
 * Example (Koch curve):
 *   <LSystem axiom="F" rules={{ F: "F+F--F+F" }} angleDegrees={60} step={2} maxIterations={4} />
 *
 * Example (Dragon curve):
 *   <LSystem axiom="FX" rules={{ X: "X+YF+", Y: "-FX-Y" }} angleDegrees={90} step={2} maxIterations={10} />
 *
 * Example (Fractal plant):
 *   <LSystem axiom="X" rules={{ X: "F+[[X]-X]-F[-FX]+X", F: "FF" }} angleDegrees={25} step={4} maxIterations={5} useStack />
 */
export const LSystem: FC<LSystemProps> = ({
  axiom,
  rules,
  maxIterations,
  angleDegrees = 60,
  step = 2,
  drawSymbols = ['F'],
  useStack = false,
  strokeColor = '#FF6A00',
  strokeWidth = 1,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  // One iteration per frame, capped at maxIterations
  const iteration = Math.min(frame, maxIterations);
  const derived = deriveLSystem(axiom, rules, iteration);
  const pathD = lSystemToPath(derived, {
    axiom,
    rules,
    maxIterations,
    angleDegrees,
    step,
    drawSymbols,
    useStack,
  });

  return (
    <path
      d={pathD}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  );
}

/**
 * Returns the derived L-system string for a given frame (pure, testable).
 */
export function getLSystemAtFrame(
  axiom: string,
  rules: Record<string, string>,
  maxIterations: number,
  frame: number
): string {
  const iteration = Math.min(frame, maxIterations);
  return deriveLSystem(axiom, rules, iteration);
}

export { deriveLSystem, lSystemToPath };
export default { LSystem, getLSystemAtFrame, deriveLSystem, lSystemToPath };
