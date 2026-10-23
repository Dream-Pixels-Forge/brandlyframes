/**
 * `random(seed)` — deterministic seeded randomness (BF-400). Pure module —
 * no React, no DOM, and never JavaScript's built-in nondeterministic PRNG
 * (that would make the same frame render differently per worker, breaking
 * the "frame -> pixels" contract).
 *
 * Rounding/determinism rules:
 * - The seed and the optional frame are hashed together (32-bit FNV-1a plus
 *   an avalanche mix) and mapped uniformly onto [0, 1).
 * - The same seed (and frame, when given) always yields the same value —
 *   across calls, workers and process restarts.
 * - `random(null)` uses a monotonic per-process call counter, so it is still
 *   deterministic for a fixed call order — never wall-clock based.
 */

export type RandomSeed = number | string | null;

/** 32-bit FNV-1a over the input string, followed by an avalanche mix. */
const hash32 = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2545f491);
  hash ^= hash >>> 13;
  return hash >>> 0;
};

let nullSeedCallCount = 0;

/**
 * Validates a numeric range for the random variants. Throws a helpful error
 * tagged with `helper` (e.g. `'random'`).
 */
const assertRange = (min: number, max: number, helper: string): void => {
  if (typeof min !== 'number' || !Number.isFinite(min)) {
    throw new Error(`${helper}(): min must be a finite number, but got ${String(min)}.`);
  }
  if (typeof max !== 'number' || !Number.isFinite(max)) {
    throw new Error(`${helper}(): max must be a finite number, but got ${String(max)}.`);
  }
  if (min > max) {
    throw new Error(`${helper}(): min (${min}) must not be greater than max (${max}).`);
  }
};

/**
 * Deterministic pseudo-random value in [0, 1).
 *
 * @param seed - Any string or number; the same seed always maps to the same
 *   value. Pass `null` for a value that varies per call but stays
 *   deterministic for a fixed call order (uses a process-local counter, not
 *   wall-clock time).
 * @param frame - Optional frame number mixed into the hash: use
 *   `random(seed, frame)` for per-frame variation that is identical on every
 *   re-render of that frame. Pass `min`/`max` instead to scale the value into
 *   the half-open range `[min, max)` — the same underlying value as
 *   `random(seed)`, so `random(seed, 0, 1) === random(seed)`.
 */
export function random(seed?: RandomSeed, frame?: number): number;
export function random(seed: RandomSeed, min: number, max: number): number;
export function random(seed: RandomSeed = null, frameOrMin?: number, max?: number): number {
  const seedKey =
    seed === null ? `null:${nullSeedCallCount++}` : `${typeof seed === 'number' ? 'n' : 's'}|${seed}`;
  if (max !== undefined) {
    assertRange(frameOrMin as number, max, 'random');
    return (frameOrMin as number) + (hash32(seedKey) / 0x100000000) * (max - (frameOrMin as number));
  }
  const frameKey = frameOrMin === undefined ? '' : `@${frameOrMin}`;
  return hash32(seedKey + frameKey) / 0x100000000;
}

/**
 * Deterministic pseudo-random **integer** in `[min, max]` (both bounds
 * inclusive — `randomInt('die', 1, 6)` models a die). Same seed, same value,
 * across calls, workers and process restarts.
 */
export const randomInt = (seed: RandomSeed, min: number, max: number): number => {
  assertRange(min, max, 'randomInt');
  return Math.floor(min + random(seed) * (max - min + 1));
};

/**
 * Deterministically picks one element of `items` (same seed, same pick).
 * Throws a helpful error on an empty array — there is nothing to pick.
 */
export const randomPick = <T>(seed: RandomSeed, items: readonly T[]): T => {
  if (items.length === 0) {
    throw new Error('randomPick(): items must be a non-empty array.');
  }
  return items[Math.floor(random(seed) * items.length)] as T;
};
