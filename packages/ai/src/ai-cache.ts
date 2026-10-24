/**
 * @brandlyframes/ai cache [BF-221]
 *
 * In-memory generation cache keyed by prompt + seed + model. A cache hit
 * returns the stored result without calling the AI provider, so re-renders
 * stay deterministic and make zero provider calls.
 */

const cache = new Map<string, string>();

/** Build a deterministic cache key from prompt, seed and model. */
function cacheKey(prompt: string, seed: string | number, model: string): string {
  return `${prompt}::${String(seed)}::${model}`;
}

/** Get a cached generation result, or `undefined` on a miss. */
export function getCached(
  prompt: string,
  seed: string | number,
  model: string,
): string | undefined {
  return cache.get(cacheKey(prompt, seed, model));
}

/** Store a generation result keyed by prompt, seed and model. */
export function setCached(
  prompt: string,
  seed: string | number,
  model: string,
  result: string,
): void {
  cache.set(cacheKey(prompt, seed, model), result);
}
