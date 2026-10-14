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
 * Deterministic pseudo-random value in [0, 1).
 *
 * @param seed - Any string or number; the same seed always maps to the same
 *   value. Pass `null` for a value that varies per call but stays
 *   deterministic for a fixed call order (uses a process-local counter, not
 *   wall-clock time).
 * @param frame - Optional frame number mixed into the hash: use
 *   `random(seed, frame)` for per-frame variation that is identical on every
 *   re-render of that frame.
 */
export const random = (seed: RandomSeed = null, frame?: number): number => {
  const seedKey =
    seed === null ? `null:${nullSeedCallCount++}` : `${typeof seed === 'number' ? 'n' : 's'}|${seed}`;
  const frameKey = frame === undefined ? '' : `@${frame}`;
  return hash32(seedKey + frameKey) / 0x100000000;
};
