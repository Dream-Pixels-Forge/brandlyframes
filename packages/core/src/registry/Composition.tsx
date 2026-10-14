/**
 * `<Composition>` — declaratively registers a composition (BF-002). Like the
 * registry it has no rendering side effects: it validates its props, stores
 * the composition and renders nothing. The Studio/Player/renderer mount
 * `component` themselves, wrapped in the frame context.
 */

import { registerComposition } from './composition-registry';
import type { CompositionConfig } from './composition-registry';

/**
 * Declares one renderable composition. Renders nothing — registering is the
 * side effect. Throws a helpful error for duplicate ids, invalid
 * fps/dimensions/duration, or defaultProps that violate the Zod `schema`
 * (BF-008).
 */
export function Composition<Props extends object = Record<string, unknown>>(
  props: CompositionConfig<Props>,
): null {
  registerComposition(props);
  return null;
}
