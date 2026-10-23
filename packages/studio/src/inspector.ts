/**
 * BF-412 — Frame inspector state logic.
 * Resolves the props of a clicked preview element (explicit registry first,
 * then a React fiber walk) plus its computed styles at the current frame.
 */

type ElementProps = Record<string, unknown>;

export interface InspectedElement {
  props: ElementProps | null;
  styles: Record<string, string>;
}

/** Fiber tags of real components (FunctionComponent, ClassComponent, IndeterminateComponent). */
const COMPONENT_FIBER_TAGS = new Set([0, 1, 2]);

/** Styles commonly driven per-frame in compositions. */
const INSPECTED_STYLES = [
  'opacity',
  'transform',
  'transformOrigin',
  'display',
  'position',
  'width',
  'height',
  'color',
  'backgroundColor',
  'zIndex',
  'filter',
  'clipPath',
] as const;

interface FiberLike {
  tag: number;
  memoizedProps: unknown;
  return: FiberLike | null;
}

function findExpandoKey(element: Element, prefix: string): string | null {
  for (const key of Object.keys(element)) {
    if (key.startsWith(prefix)) return key;
  }
  return null;
}

/**
 * Fiber walk: returns the props of the nearest component fiber above the
 * element; falls back to the host element props React attaches (`__reactProps$`).
 */
export function resolveElementProps(element: Element): ElementProps | null {
  const propsKey = findExpandoKey(element, '__reactProps$');
  const hostProps = propsKey
    ? ((element as unknown as Record<string, unknown>)[propsKey] as ElementProps | undefined)
    : undefined;

  const fiberKey = findExpandoKey(element, '__reactFiber$');
  if (fiberKey) {
    let fiber = (element as unknown as Record<string, unknown>)[fiberKey] as FiberLike | null | undefined;
    while (fiber) {
      if (
        COMPONENT_FIBER_TAGS.has(fiber.tag) &&
        fiber.memoizedProps &&
        typeof fiber.memoizedProps === 'object'
      ) {
        return fiber.memoizedProps as ElementProps;
      }
      fiber = fiber.return;
    }
  }
  return hostProps ?? null;
}

/** Snapshot of computed styles at the current frame (empty values omitted). */
export function getElementStyles(element: Element): Record<string, string> {
  if (typeof getComputedStyle !== 'function') return {};
  const computed = getComputedStyle(element);
  const styles: Record<string, string> = {};
  for (const property of INSPECTED_STYLES) {
    const value = computed.getPropertyValue(property);
    if (value) styles[property] = value;
  }
  return styles;
}

/** Explicit element -> props mapping; registered props win over the fiber walk. */
export class InspectorRegistry {
  private entries = new WeakMap<Element, ElementProps>();

  register(element: Element, props: ElementProps): () => void {
    this.entries.set(element, props);
    return () => this.entries.delete(element);
  }

  resolve(element: Element): ElementProps | null {
    return this.entries.get(element) ?? null;
  }
}

/** Click-target inspection: registry props (priority) + computed styles. */
export function inspectElement(element: Element, registry?: InspectorRegistry): InspectedElement {
  return {
    props: registry?.resolve(element) ?? resolveElementProps(element),
    styles: getElementStyles(element),
  };
}
