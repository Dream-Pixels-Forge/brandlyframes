/**
 * `spring()` — physics-based animation with a damped harmonic oscillator.
 * Pure math, no React, no DOM, no wall clock: for identical arguments the
 * returned value is bit-identical across calls (a hard requirement for
 * frame-accurate rendering).
 *
 * The trajectory is integrated per frame with a semi-implicit (symplectic)
 * Euler step of dt = 1/fps — the same discrete scheme react-spring and
 * Remotion use — so `spring({frame})` is the position after exactly
 * `frame` physics steps.
 *
 * With `durationInFrames`, a config with the same shape (same damping ratio
 * ζ, same mass) is derived by scaling stiffness by s² and damping by s,
 * where s = naturalDuration / durationInFrames: the derived spring reaches
 * the target at the requested frame.
 */

export interface SpringConfig {
  /** Damping coefficient c. Higher = less oscillation. Default 10. */
  damping?: number;
  /** Mass m. Default 1. */
  mass?: number;
  /** Stiffness k. Higher = snappier. Default 100. */
  stiffness?: number;
  /** When true, the value never moves past the [from, to] interval. Default false. */
  overshootClamping?: boolean;
}

export interface SpringProps {
  /** Current frame (non-negative integer). */
  frame: number;
  /** Frame rate in frames per second — converts frames to physical time. */
  fps: number;
  /** Physics config. Defaults: damping 10, mass 1, stiffness 100, no clamping. */
  config?: SpringConfig;
  /** Start value. Default 0. */
  from?: number;
  /** End value. Default 1. */
  to?: number;
  /** When given, the spring reaches `to` at exactly this frame. */
  durationInFrames?: number;
}

interface ResolvedConfig {
  damping: number;
  mass: number;
  stiffness: number;
  overshootClamping: boolean;
}

/** A spring is "at rest" once it is this close to the target (relative to the range). */
const REST_THRESHOLD_RATIO = 0.001;

/** Safety cap for the natural-duration measurement (≈ 55 min at 30fps). */
const MEASUREMENT_FRAME_LIMIT = 100_000;

const formatInvalidValue = (value: unknown): string => {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  return `${typeof value} (${String(value)})`;
};

const validateProps = (props: SpringProps): void => {
  const { frame, fps, from = 0, to = 1 } = props;
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error(`spring(): frame must be a non-negative integer, but got ${formatInvalidValue(frame)}.`);
  }
  if (typeof fps !== 'number' || !Number.isFinite(fps) || fps <= 0) {
    throw new Error(`spring(): fps must be a finite number greater than 0, but got ${formatInvalidValue(fps)}.`);
  }
  if (typeof from !== 'number' || !Number.isFinite(from)) {
    throw new Error(`spring(): from must be a finite number, but got ${formatInvalidValue(from)}.`);
  }
  if (typeof to !== 'number' || !Number.isFinite(to)) {
    throw new Error(`spring(): to must be a finite number, but got ${formatInvalidValue(to)}.`);
  }
  if (props.durationInFrames !== undefined && (!Number.isInteger(props.durationInFrames) || props.durationInFrames <= 0)) {
    throw new Error(
      `spring(): durationInFrames must be a positive integer, but got ${formatInvalidValue(props.durationInFrames)}.`,
    );
  }
};

const validateConfig = (config: SpringConfig): void => {
  const { damping = 10, mass = 1, stiffness = 100 } = config;
  if (typeof mass !== 'number' || !Number.isFinite(mass) || mass <= 0) {
    throw new Error(`spring(): config.mass must be a finite number greater than 0, but got ${formatInvalidValue(mass)}.`);
  }
  if (typeof stiffness !== 'number' || !Number.isFinite(stiffness) || stiffness <= 0) {
    throw new Error(
      `spring(): config.stiffness must be a finite number greater than 0, but got ${formatInvalidValue(stiffness)}.`,
    );
  }
  if (typeof damping !== 'number' || !Number.isFinite(damping) || damping < 0) {
    throw new Error(`spring(): config.damping must be a finite number >= 0, but got ${formatInvalidValue(damping)}.`);
  }
};

const clampToBounds = (position: number, velocity: number, lower: number, upper: number): [number, number] => {
  if (position < lower) return [lower, 0];
  if (position > upper) return [upper, 0];
  return [position, velocity];
};

/** One physics step of the damped oscillator, with optional overshoot clamping. */
const advance = (
  position: number,
  velocity: number,
  config: ResolvedConfig,
  to: number,
  lower: number,
  upper: number,
  dt: number,
): [number, number] => {
  const acceleration = (-config.stiffness * (position - to) - config.damping * velocity) / config.mass;
  const nextVelocity = velocity + acceleration * dt;
  const nextPosition = position + nextVelocity * dt;
  if (config.overshootClamping) {
    return clampToBounds(nextPosition, nextVelocity, lower, upper);
  }
  return [nextPosition, nextVelocity];
};

/**
 * Integrates the damped oscillator from `from` for `frame` steps of
 * dt = 1/fps and returns the position. This is the single source of
 * trajectory math — the natural-duration measurement and the public call
 * both go through it.
 */
const integrate = (
  frame: number,
  fps: number,
  config: ResolvedConfig,
  from: number,
  to: number,
): number => {
  const dt = 1 / fps;
  const lower = Math.min(from, to);
  const upper = Math.max(from, to);
  let position = from;
  let velocity = 0;
  for (let step = 0; step < frame; step++) {
    [position, velocity] = advance(position, velocity, config, to, lower, upper, dt);
  }
  return position;
};

/**
 * Frames the base config needs to come to rest (within the rest threshold
 * of the target). Used to derive a duration-fitted config.
 */
const measureNaturalDuration = (
  fps: number,
  config: ResolvedConfig,
  from: number,
  to: number,
): number => {
  const threshold = Math.abs(to - from) * REST_THRESHOLD_RATIO;
  const dt = 1 / fps;
  const lower = Math.min(from, to);
  const upper = Math.max(from, to);
  let position = from;
  let velocity = 0;
  for (let frame = 0; frame <= MEASUREMENT_FRAME_LIMIT; frame++) {
    if (Math.abs(position - to) <= threshold) return frame;
    [position, velocity] = advance(position, velocity, config, to, lower, upper, dt);
  }
  throw new Error(
    `spring(): the spring never settles within ${MEASUREMENT_FRAME_LIMIT} frames, so durationInFrames cannot be derived. Increase damping or stiffness.`,
  );
};

export const spring = ({
  frame,
  fps,
  config = {},
  from = 0,
  to = 1,
  durationInFrames,
}: SpringProps): number => {
  validateProps({ frame, fps, from, to, durationInFrames });
  validateConfig(config);

  const { damping = 10, mass = 1, stiffness = 100, overshootClamping = false } = config;
  const baseConfig: ResolvedConfig = { damping, mass, stiffness, overshootClamping };

  if (durationInFrames === undefined) {
    return integrate(frame, fps, baseConfig, from, to);
  }

  const naturalDuration = measureNaturalDuration(fps, baseConfig, from, to);
  if (naturalDuration === 0) {
    // from is already at to: the target is reached on every frame.
    return to;
  }
  const scale = naturalDuration / durationInFrames;
  return integrate(
    frame,
    fps,
    { damping: damping * scale, mass, stiffness: stiffness * scale * scale, overshootClamping },
    from,
    to,
  );
};
