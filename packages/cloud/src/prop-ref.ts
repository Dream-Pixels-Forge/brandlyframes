/**
 * Large props by reference (BF-473).
 *
 * Big props (frame arrays, baked media) are passed as a blob/URL handle
 * instead of inline, keeping invoke payloads under size limits. The renderer
 * resolves handles via {@link resolvePropRefs} right before invoke; stores
 * are injectable ({@link PropRefStore}) with an in-memory adapter. No cloud
 * calls — the store decides where the bytes live.
 */

/** Where a prop-ref payload lives. */
export interface PropRefHandle {
  /** Stable id of the payload within its store. */
  readonly refId: string;
  /** `url` — the handle points at a fetchable URL; `blob` — store-resident bytes. */
  readonly kind: 'url' | 'blob';
  /** Store-specific location (URL, key, path). */
  readonly location: string;
  /** Optional media type of the payload. */
  readonly mediaType?: string;
}

/**
 * Handle for a large prop value (BF-473). Branded so host code can detect
 * it without trusting structural coincidence; `T` is carried phantom-typed.
 */
export interface PropRef<T = unknown> {
  /** Brand marker — never set by hand. */
  readonly __brandlyframesPropRef: true;
  /** The blob/URL handle a store or CDN resolves. */
  readonly handle: PropRefHandle;
  /** Phantom type of the resolved payload (not present at runtime). */
  readonly __propRefValue?: T;
}

/** Storage transport for prop-ref payloads (injectable; no cloud calls here). */
export interface PropRefStore {
  /** Persist `data` and return its handle. */
  put(data: unknown, options?: { mediaType?: string }): Promise<PropRefHandle>;
  /** Fetch the payload for a handle. */
  get(handle: PropRefHandle): Promise<unknown>;
}

/** Detects a prop-ref handle (structural, works across module instances). */
export function isPropRef(value: unknown): value is PropRef<never> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { __brandlyframesPropRef?: unknown; handle?: unknown };
  if (candidate.__brandlyframesPropRef !== true) return false;
  const handle = candidate.handle as PropRefHandle | undefined;
  return (
    typeof handle === 'object' &&
    handle !== null &&
    typeof handle.refId === 'string' &&
    typeof handle.location === 'string'
  );
}

/** Wraps an already-existing handle (e.g. a CDN URL) as a prop ref. */
export function toPropRef<T = unknown>(handle: PropRefHandle): PropRef<T> {
  return { __brandlyframesPropRef: true, handle };
}

/** In-memory prop-ref store (default for tests and local pipelines). */
export class InMemoryPropRefStore implements PropRefStore {
  private readonly payloads = new Map<string, unknown>();
  private counter = 0;

  async put(data: unknown, options?: { mediaType?: string }): Promise<PropRefHandle> {
    this.counter += 1;
    const refId = `propref-${this.counter}`;
    this.payloads.set(refId, data);
    return {
      refId,
      kind: 'blob',
      location: `memory://${refId}`,
      ...(options?.mediaType !== undefined ? { mediaType: options.mediaType } : {}),
    };
  }

  async get(handle: PropRefHandle): Promise<unknown> {
    if (!this.payloads.has(handle.refId)) {
      throw new RangeError(`InMemoryPropRefStore: unknown refId ${handle.refId}`);
    }
    return this.payloads.get(handle.refId);
  }
}

/** Options for {@link createPropRef}. */
export interface CreatePropRefOptions {
  /** Store the payload lives in (default: a module-level in-memory store). */
  readonly store?: PropRefStore;
  /** Optional media type of the payload. */
  readonly mediaType?: string;
}

/** Default in-memory store backing `createPropRef` without an explicit store. */
const defaultPropRefStore = new InMemoryPropRefStore();

/** Creates a prop ref for `data` by storing it and returning the handle. */
export async function createPropRef<T>(
  data: T,
  options: CreatePropRefOptions = {}
): Promise<PropRef<T>> {
  const store = options.store ?? defaultPropRefStore;
  const handle = await store.put(data, { mediaType: options.mediaType });
  return toPropRef<T>(handle);
}

/** Resolver callback: handle → payload (used by the renderer before invoke). */
export type PropRefResolver = (handle: PropRefHandle) => Promise<unknown>;

/**
 * Walks `props` and replaces every prop-ref handle with its resolved payload
 * (renderer-side resolution before invoke). Plain values pass through
 * untouched; already-resolved payloads are not re-walked.
 */
export async function resolvePropRefs<P>(
  props: P,
  resolve: PropRefResolver
): Promise<P> {
  const walk = async (value: unknown): Promise<unknown> => {
    if (isPropRef(value)) {
      return resolve(value.handle);
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map(walk));
    }
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>);
      const resolvedEntries = await Promise.all(
        entries.map(async ([key, item]) => [key, await walk(item)] as const)
      );
      return Object.fromEntries(resolvedEntries);
    }
    return value;
  };
  return (await walk(props)) as P;
}

// ============================================================================
// Inline payload size limits (BF-473)
// ============================================================================

/**
 * Conservative default inline-props budget in bytes (async invoke payload
 * class limit). Props estimated above this must travel by reference.
 */
export const MAX_INLINE_PROP_BYTES = 256 * 1024;

/** Estimates the JSON wire size of props in bytes (UTF-8). */
export function estimatePropsBytes(props: unknown): number {
  return new TextEncoder().encode(JSON.stringify(props ?? null)).length;
}

/** Error thrown when inline props exceed the size limit. */
export class PropSizeExceededError extends Error {
  /** Estimated props size in bytes. */
  readonly actualBytes: number;
  /** Allowed size in bytes. */
  readonly limitBytes: number;
  constructor(actualBytes: number, limitBytes: number) {
    super(
      `inputProps are ${actualBytes} bytes, over the ${limitBytes}-byte inline limit — ` +
        'pass large values by reference with createPropRef() and resolve them before invoke'
    );
    this.name = 'PropSizeExceededError';
    this.actualBytes = actualBytes;
    this.limitBytes = limitBytes;
  }
}

/** Throws {@link PropSizeExceededError} when props exceed `maxBytes`. */
export function assertPropsUnderLimit(
  props: unknown,
  maxBytes: number = MAX_INLINE_PROP_BYTES
): void {
  const actual = estimatePropsBytes(props);
  if (actual > maxBytes) {
    throw new PropSizeExceededError(actual, maxBytes);
  }
}
