/**
 * BF-514 — incremental L-system growth: plants, coral, and lightning that
 * grow frame by frame.
 *
 * The existing `<LSystem />` component (lsystem.tsx) derives the *entire*
 * string up to iteration N and draws it all at once — the tree "jumps" to
 * its finished shape. This module adds **growth animation**: at frame `f`
 * only the first `budget` draw commands of the derived string are rendered,
 * so branches appear to extend outward over time, like a time-lapse.
 *
 * Pure math: same `(axiom, rules, frame)` always yields the same partial
 * path. No wall clock, no `Math.random`, no GPU.
 */

import type { LSystemConfig } from './lsystem';
import { deriveLSystem, lSystemToPath } from './lsystem';

/**
 * Options for frame-by-frame L-system growth.
 */
export interface GrowthOptions {
  /**
   * How many draw commands to reveal per frame. 1 = one segment per frame
   * (slow, film-like). 10 = brisk. Default 1.
   */
  readonly commandsPerFrame?: number;
  /**
   * Starting frame offset: the growth is considered to have already drawn
   * this many commands before frame 0 (e.g. to skip a trunk). Default 0.
   */
  readonly startOffset?: number;
  /**
   * When true, the path is a closed "settling" render after the full string
   * is drawn: frames beyond the total command count keep the finished path
   * (no further change). Default true.
   */
  readonly holdWhenDone?: boolean;
}

/**
 * Count the number of draw commands (F symbols) in an L-system string.
 *
 * @param s - the derived L-system string
 * @param config - the L-system config (drawSymbols determines what counts)
 * @returns number of segments the full string would draw
 */
export const countLSystemCommands = (s: string, config: Pick<LSystemConfig, 'drawSymbols'>): number => {
  let n = 0;
  for (const ch of s) {
    if (config.drawSymbols.includes(ch)) n++;
  }
  return n;
};

/**
 * Derive the full string and compute how many frames it takes to draw it
 * all, given the growth options.
 *
 * @param axiom - starting string
 * @param rules - production rules
 * @param maxIterations - derivation depth
 * @param frame - current composition frame (informational only)
 * @param config - L-system config (angle, step, drawSymbols, useStack)
 * @param growth - growth options (commandsPerFrame, startOffset)
 * @returns the total command count of the fully derived string
 */
export const lSystemTotalCommands = (
  axiom: string,
  rules: Record<string, string>,
  maxIterations: number,
  _frame: number,
  config: Pick<LSystemConfig, 'drawSymbols'>,
  _growth?: GrowthOptions,
): number => {
  const derived = deriveLSystem(axiom, rules, maxIterations);
  return countLSystemCommands(derived, config);
};

/**
 * Produce the **partial** SVG path for frame `f` of an L-system growth:
 * the first `startOffset + f * commandsPerFrame` draw commands of the fully
 * derived string, rendered via the standard turtle interpreter.
 *
 * The trick: we derive the full string (deterministic), then interpret it
 * with a command counter — the turtle only emits `L` points while the
 * running command count is below the frame's budget. Turns (`+`/`-`) and
 * stack pushes (`[`) are always applied, so the geometry stays correct;
 * only the *drawing* of segments is gated by the budget.
 *
 * @param axiom - starting string
 * @param rules - production rules
 * @param maxIterations - derivation depth (the full tree is derived once;
 *   growth is a *subset* of it, so the shape never changes, only extends)
 * @param frame - current composition frame
 * @param config - L-system config
 * @param growth - growth options
 * @returns SVG path `d` attribute for this frame
 */
export const lSystemGrowthPath = (
  axiom: string,
  rules: Record<string, string>,
  maxIterations: number,
  frame: number,
  config: LSystemConfig,
  growth: GrowthOptions = {},
): string => {
  const { commandsPerFrame = 1, startOffset = 0, holdWhenDone = true } = growth;
  const derived = deriveLSystem(axiom, rules, maxIterations);
  const total = countLSystemCommands(derived, config);

  const budget = startOffset + Math.max(0, Math.floor(frame)) * commandsPerFrame;
  const limit = holdWhenDone ? Math.min(budget, total) : budget;

  // Turtle interpretation with a command gate (mirrors lSystemToPath, but
  // only emits segments while runningCount < limit).
  const { angleDegrees, step, drawSymbols, useStack } = config;
  const angleRad = (angleDegrees * Math.PI) / 180;
  let x = 0;
  let y = 0;
  let heading = -Math.PI / 2;
  const parts: string[] = [`M ${x.toFixed(2)} ${y.toFixed(2)}`];
  const stack: Array<{ x: number; y: number; heading: number }> = [];
  let running = 0;

  for (const ch of derived) {
    if (drawSymbols.includes(ch)) {
      if (running < limit) {
        const nx = x + Math.cos(heading) * step;
        const ny = y + Math.sin(heading) * step;
        parts.push(`L ${nx.toFixed(2)} ${ny.toFixed(2)}`);
        x = nx;
        y = ny;
        running++;
      } else {
        // Still advance the turtle (geometry stays consistent for later
        // commands), just don't emit the segment.
        x += Math.cos(heading) * step;
        y += Math.sin(heading) * step;
        running++;
      }
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
        if (running < limit) parts.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
    }
    if (running >= total) break; // nothing left to draw
  }

  return parts.join(' ');
};

/**
 * Preset growth systems: fractal plant, coral, lightning. Each is a
 * `{axiom, rules, maxIterations, angleDegrees, step, drawSymbols, useStack}`
 * config plus default growth options, ready to feed to
 * {@link lSystemGrowthPath}.
 */
export interface GrowthPreset {
  readonly name: string;
  readonly axiom: string;
  readonly rules: Record<string, string>;
  readonly maxIterations: number;
  readonly angleDegrees: number;
  readonly step: number;
  readonly drawSymbols: string[];
  readonly useStack: boolean;
  readonly growth: GrowthOptions;
}

/** Fractal plant — the classic "plant" L-system. */
export const plantGrowth: GrowthPreset = {
  name: 'plant',
  axiom: 'X',
  rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
  maxIterations: 5,
  angleDegrees: 25,
  step: 4,
  drawSymbols: ['F'],
  useStack: true,
  growth: { commandsPerFrame: 4, holdWhenDone: true },
};

/** Coral — bushier branching with steeper angles. */
export const coralGrowth: GrowthPreset = {
  name: 'coral',
  axiom: 'F',
  rules: { F: 'FF+[+F-F]--[-F+F]' },
  maxIterations: 4,
  angleDegrees: 22.5,
  step: 3,
  drawSymbols: ['F'],
  useStack: false,
  growth: { commandsPerFrame: 6, holdWhenDone: true },
};

/**
 * Lightning — jagged random-look (but deterministic) bolt. Uses two
 * independent rewrite tracks: the bolt (`F`) walks with turns, `X`/`Y` are
 * branch/no-op symbols that grow side-sparks.
 */
export const lightningGrowth: GrowthPreset = {
  name: 'lightning',
  axiom: 'FF',
  rules: { F: 'F+F-F-F+F', X: 'XX' },
  maxIterations: 5,
  angleDegrees: 20,
  step: 6,
  drawSymbols: ['F'],
  useStack: false,
  growth: { commandsPerFrame: 12, holdWhenDone: true },
};

/** All built-in growth presets. */
export const GROWTH_PRESETS: Readonly<Record<string, GrowthPreset>> = {
  plant: plantGrowth,
  coral: coralGrowth,
  lightning: lightningGrowth,
};

/**
 * Resolve a preset by name or a custom config.
 *
 * @param preset - a preset name (`'plant'` | `'coral'` | `'lightning'`) or
 *   a full {@link GrowthPreset}.
 */
export const resolveGrowthPreset = (preset: string | GrowthPreset): GrowthPreset => {
  if (typeof preset === 'object') return preset;
  const p = GROWTH_PRESETS[preset];
  if (!p) {
    throw new Error(
      `resolveGrowthPreset: unknown preset "${preset}" (known: ${Object.keys(GROWTH_PRESETS).join(', ')})`,
    );
  }
  return p;
};

/**
 * Convenience: build a growth path for frame `f` from a preset by name.
 */
export const growthPathForPreset = (
  preset: string | GrowthPreset,
  frame: number,
): string => {
  const p = resolveGrowthPreset(preset);
  const config: LSystemConfig = {
    axiom: p.axiom,
    rules: p.rules,
    maxIterations: p.maxIterations,
    angleDegrees: p.angleDegrees,
    step: p.step,
    drawSymbols: p.drawSymbols,
    useStack: p.useStack,
  };
  return lSystemGrowthPath(p.axiom, p.rules, p.maxIterations, frame, config, p.growth);
};

// Re-export the underlying builders so consumers can import from one place.
export { lSystemToPath };
