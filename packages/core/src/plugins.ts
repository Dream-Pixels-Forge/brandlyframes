/**
 * Plugin registry (BF-301).
 *
 * Plugin API: third-party code registers under a name with an optional
 * `setup` hook the host calls at bootstrap. Registry is DOM-free and
 * network-free so it works in Studio, Player and render workers.
 */

export interface Plugin {
  /** Kind of plugin for grouping/discovery (component, effect, exporter, panel...). */
  readonly kind: string;
  /** Optional one-time setup invoked by the host at registration/bootstrap time. */
  readonly setup?: () => void;
}

const plugins = new Map<string, Plugin>();

/** Register a plugin by name. Re-registering overwrites. */
export function registerPlugin(name: string, plugin: Plugin): void {
  plugins.set(name, plugin);
  plugin.setup?.();
}

/** Return the plugin for `name`, or `undefined` if none. */
export function getPlugin(name: string): Plugin | undefined {
  return plugins.get(name);
}

/** All registered plugin names. */
export function listPlugins(): readonly string[] {
  return [...plugins.keys()];
}

/** Clear all plugins (test isolation / bootstrap reset). */
export function clearPlugins(): void {
  plugins.clear();
}
