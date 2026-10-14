/**
 * Easing curves for BrandlyFrames animation — pure math, no React, no DOM.
 *
 * Ported from the standard CSS / easings.net curve family (the same curves
 * Remotion exposes), so golden values match the reference formulas.
 * Every easing is a pure function of progress `t` on [0, 1]; behavior
 * outside [0, 1] follows each curve's natural extension (used by
 * `interpolate` with `extrapolate: 'extend'`).
 */

export type EasingFunction = (t: number) => number;

/** The standard in/out/inOut trio shared by the parameterless curve families. */
export interface EasingCollection {
  in: EasingFunction;
  out: EasingFunction;
  inOut: EasingFunction;
}

const linear: EasingFunction = (t) => t;

const quad: EasingCollection = {
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

const cubic: EasingCollection = {
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

const poly = (n: number): EasingCollection => {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 1) {
    throw new Error(`Easing.poly() expects a finite exponent >= 1, but got ${n}.`);
  }
  return {
    in: (t) => Math.pow(t, n),
    out: (t) => 1 - Math.pow(1 - t, n),
    inOut: (t) => (t < 0.5 ? Math.pow(2 * t, n) / 2 : 1 - Math.pow(-2 * t + 2, n) / 2),
  };
};

const sin: EasingCollection = {
  in: (t) => 1 - Math.cos((t * Math.PI) / 2),
  out: (t) => Math.sin((t * Math.PI) / 2),
  inOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

const circle: EasingCollection = {
  in: (t) => 1 - Math.sqrt(1 - t * t),
  out: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOut: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
};

const exp: EasingCollection = {
  in: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  out: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
};

const bounceOut = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const t2 = t - 1.5 / d1;
    return n1 * t2 * t2 + 0.75;
  }
  if (t < 2.5 / d1) {
    const t2 = t - 2.25 / d1;
    return n1 * t2 * t2 + 0.9375;
  }
  const t2 = t - 2.625 / d1;
  return n1 * t2 * t2 + 0.984375;
};

const bounce: EasingCollection = {
  in: (t) => 1 - bounceOut(1 - t),
  out: bounceOut,
  inOut: (t) => (t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2),
};

const elastic: EasingCollection = {
  in: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  out: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  inOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c5 = (2 * Math.PI) / 4.5;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
};

/** `s` controls overshoot strength; the CSS default is 1.70158. */
const back = (s: number = 1.70158): EasingCollection => {
  const c1 = s;
  const c2 = c1 * 1.525;
  const c3 = c1 + 1;
  return {
    in: (t) => c3 * t * t * t - c1 * t * t,
    out: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    inOut: (t) =>
      t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2,
  };
};

/**
 * Cubic bezier easing defined by two control points, like CSS
 * `cubic-bezier(x1, y1, x2, y2)`. x1 and x2 must be within [0, 1] (the curve
 * must be a function of time); y1 and y2 may overshoot.
 * Solves the x(t) parametric equation by bisection — deterministic and
 * engine-independent.
 */
const bezier = (x1: number, y1: number, x2: number, y2: number): EasingFunction => {
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new Error(`Easing.bezier() x control points must be within [0, 1], but got x1 = ${x1}, x2 = ${x2}.`);
  }
  const xAt = (t: number): number => 3 * t * (1 - t) * (1 - t) * x1 + 3 * t * t * (1 - t) * x2 + t * t * t;
  const yAt = (t: number): number => 3 * t * (1 - t) * (1 - t) * y1 + 3 * t * t * (1 - t) * y2 + t * t * t;

  return (input: number): number => {
    if (input <= 0) return input === 0 ? 0 : yAt(input);
    if (input >= 1) return input === 1 ? 1 : yAt(input);
    let low = 0;
    let high = 1;
    let t = input;
    for (let i = 0; i < 60; i++) {
      const x = xAt(t);
      if (Math.abs(x - input) < 1e-14) break;
      if (x < input) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return yAt(t);
  };
};

/**
 * Piecewise-constant easing with `steps` jumps, like CSS `steps()`.
 * With 'end' the value holds until each interval boundary (the default);
 * with 'start' the jump happens at the beginning of each interval, so the
 * first step target is shown from t = 0.
 */
const steps = (stepCount: number, position: 'start' | 'end' = 'end'): EasingFunction => {
  if (typeof stepCount !== 'number' || !Number.isInteger(stepCount) || stepCount < 1) {
    throw new Error(`Easing.steps() expects an integer >= 1, but got ${stepCount}.`);
  }
  return (t: number): number => {
    if (position === 'start') return Math.min((Math.floor(t * stepCount) + 1) / stepCount, 1);
    return Math.min(Math.floor(t * stepCount) / stepCount, 1);
  };
};

/**
 * The BrandlyFrames easing namespace — the direct counterpart of Remotion's
 * `Easing`. Curves without an in/out/inOut variant (`linear`, `bezier`,
 * `steps`) are functions; curve families are `{ in, out, inOut }` objects.
 */
export const Easing: {
  linear: EasingFunction;
  quad: EasingCollection;
  cubic: EasingCollection;
  poly: (n: number) => EasingCollection;
  sin: EasingCollection;
  circle: EasingCollection;
  exp: EasingCollection;
  bounce: EasingCollection;
  elastic: EasingCollection;
  back: (s?: number) => EasingCollection;
  bezier: (x1: number, y1: number, x2: number, y2: number) => EasingFunction;
  steps: (stepCount: number, position?: 'start' | 'end') => EasingFunction;
} = {
  linear,
  quad,
  cubic,
  poly,
  sin,
  circle,
  exp,
  bounce,
  elastic,
  back,
  bezier,
  steps,
};
