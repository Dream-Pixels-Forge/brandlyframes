/**
 * @brandlyframes/ai provider registry [BF-220]
 *
 * Providers are injectable: register an adapter with `registerAIProvider` and
 * resolve it by name with `getAIProvider`. Tests (and host apps) can swap in
 * a fake provider — no network, ever.
 */

export interface AIProvider {
  generateImage(prompt: string): Promise<string>;
  generateVideo(prompt: string): Promise<string>;
}

const providers = new Map<string, AIProvider>();

/** Register an AI provider adapter under `name`. */
export function registerAIProvider(name: string, adapter: AIProvider): void {
  providers.set(name, adapter);
}

/** Return the registered provider for `name`, or `undefined` if none. */
export function getAIProvider(name: string): AIProvider | undefined {
  return providers.get(name);
}
