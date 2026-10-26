/**
 * Safe multi-tenant rendering (BF-475).
 *
 * For SaaS apps rendering user-supplied props: a prop validation entry
 * point, per-render resource/time limits, a sandboxed-network flag, and
 * per-tenant quotas enforced in the mock orchestrator. No real rendering —
 * the render step is an injected mock; no real network — the sandbox flag
 * is carried on the invocation context for the (host-provided) runtime.
 */

import {
  estimatePropsBytes,
  type PropRefHandle,
  isPropRef,
} from './prop-ref';

// ============================================================================
// Limits (resource + time)
// ============================================================================

/** Hard limits applied to every render submitted by a tenant (BF-475). */
export interface TenantRenderLimits {
  /** Maximum serialized size of input props (bytes). */
  readonly maxPropBytes: number;
  /** Maximum composition duration accepted per render (frames). */
  readonly maxDurationInFrames: number;
  /** Maximum wall-clock time per render (ms). */
  readonly renderTimeoutMs: number;
  /**
   * Sandboxed network flag: when true, the render runtime must run with
   * network egress disabled (the orchestrator only carries the flag; the
   * runtime enforces it).
   */
  readonly networkSandbox: boolean;
}

/** Reasonable defaults: 256 KiB props, 10 min of video, 15 min wall clock. */
export const DEFAULT_TENANT_LIMITS: TenantRenderLimits = {
  maxPropBytes: 256 * 1024,
  maxDurationInFrames: 30 * 60 * 10,
  renderTimeoutMs: 15 * 60 * 1000,
  networkSandbox: true,
};

// ============================================================================
// Prop validation entry point (BF-475)
// ============================================================================

/** Result of {@link validateTenantProps}. */
export interface TenantPropValidationResult {
  /** Whether the props may be rendered. */
  readonly ok: boolean;
  /** Plain-language problems (empty when ok). */
  readonly errors: readonly string[];
}

/** Maximum props nesting depth accepted from tenants. */
export const MAX_PROPS_DEPTH = 32;

/**
 * Prop validation entry point for tenant-supplied props (BF-475): enforces
 * the byte limit and JSON-safety (no functions/symbols — they silently
 * vanish in serialization), and a nesting-depth bound.
 */
export function validateTenantProps(
  props: unknown,
  limits: Pick<TenantRenderLimits, 'maxPropBytes'>
): TenantPropValidationResult {
  const errors: string[] = [];

  const bytes = estimatePropsBytes(props);
  if (bytes > limits.maxPropBytes) {
    errors.push(
      `props size ${bytes} bytes exceeds the tenant limit of ${limits.maxPropBytes} bytes — pass large values by reference (createPropRef)`
    );
  }

  const checkDepthAndTypes = (value: unknown, depth: number, path: string): void => {
    if (errors.length >= 16) return; // cap report size
    if (depth > MAX_PROPS_DEPTH) {
      errors.push(`props nesting at ${path} exceeds the depth limit of ${MAX_PROPS_DEPTH}`);
      return;
    }
    if (typeof value === 'function' || typeof value === 'symbol') {
      errors.push(`props at ${path} contain a non-JSON-safe ${typeof value}`);
      return;
    }
    if (typeof value === 'undefined') {
      errors.push(`props at ${path} contain an undefined value`);
      return;
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        checkDepthAndTypes(value[i], depth + 1, `${path}[${i}]`);
      }
      return;
    }
    if (typeof value === 'object' && value !== null && !isPropRef(value)) {
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        checkDepthAndTypes(item, depth + 1, `${path}.${key}`);
      }
    }
  };
  checkDepthAndTypes(props, 0, 'props');

  return { ok: errors.length === 0, errors };
}

/** Error thrown when tenant props fail validation (BF-475). */
export class PropValidationError extends Error {
  /** The validation problems. */
  readonly errors: readonly string[];
  constructor(errors: readonly string[]) {
    super(`tenant props failed validation: ${errors.join('; ')}`);
    this.name = 'PropValidationError';
    this.errors = errors;
  }
}

/** Error thrown when a tenant hits a resource/time limit (BF-475). */
export class TenantLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantLimitExceededError';
  }
}

/** Error thrown when a tenant exceeds its quota (BF-475). */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

// ============================================================================
// Per-tenant quotas (BF-475)
// ============================================================================

/** Quota configuration for one tenant. */
export interface TenantQuota {
  /** Maximum simultaneously running renders. */
  readonly maxConcurrentRenders: number;
  /** Maximum renders started within one {@link windowMs} window. */
  readonly maxRendersPerWindow: number;
  /** Fixed quota window length (ms). */
  readonly windowMs: number;
}

/** In-memory per-tenant quota ledger (BF-475). */
export class TenantQuotaLedger {
  private readonly active = new Map<string, number>();
  private readonly windows = new Map<string, { start: number; count: number }>();

  /**
   * Records one render start for `tenantId`; throws {@link QuotaExceededError}
   * when either quota is exceeded. `now` comes from the (mocked) clock.
   */
  consume(tenantId: string, quota: TenantQuota, now: number): void {
    const activeRenders = this.active.get(tenantId) ?? 0;
    if (activeRenders >= quota.maxConcurrentRenders) {
      throw new QuotaExceededError(
        `tenant ${tenantId} is at the concurrent-render quota (${quota.maxConcurrentRenders})`
      );
    }
    const window = this.windows.get(tenantId);
    if (!window || now - window.start >= quota.windowMs) {
      this.windows.set(tenantId, { start: now, count: 1 });
    } else {
      if (window.count >= quota.maxRendersPerWindow) {
        throw new QuotaExceededError(
          `tenant ${tenantId} exceeded ${quota.maxRendersPerWindow} renders per ${quota.windowMs}ms window`
        );
      }
      window.count += 1;
    }
    this.active.set(tenantId, activeRenders + 1);
  }

  /** Records one render end (frees a concurrency slot). */
  release(tenantId: string): void {
    const activeRenders = this.active.get(tenantId) ?? 0;
    this.active.set(tenantId, Math.max(0, activeRenders - 1));
  }

  /** Currently running renders for a tenant. */
  activeRenders(tenantId: string): number {
    return this.active.get(tenantId) ?? 0;
  }
}

// ============================================================================
// Mock tenant orchestrator (BF-475)
// ============================================================================

/** One tenant render submission. */
export interface TenantRenderRequest {
  /** Tenant identifier (must exist in the quota map). */
  readonly tenantId: string;
  /** Composition to render. */
  readonly compositionId: string;
  /** User-supplied input props (validated before anything runs). */
  readonly inputProps: Record<string, unknown>;
  /** Render duration in frames (checked against the time limit). */
  readonly durationInFrames: number;
}

/** Invocation context handed to the (mock) render step. */
export interface TenantRenderInvocation {
  readonly tenantId: string;
  readonly compositionId: string;
  /** Resolved input props (already validated). */
  readonly inputProps: Record<string, unknown>;
  /** Sandbox flag from the limits — the runtime must honor it. */
  readonly networkSandbox: boolean;
  /** Wall-clock budget for this render (ms). */
  readonly timeoutMs: number;
}

/** Outcome of a tenant render. */
export interface TenantRenderOutcome {
  readonly tenantId: string;
  readonly compositionId: string;
  readonly ok: boolean;
  /** Where the output would live (mock). */
  readonly outputUrl?: string;
  /** Whether the render ran network-sandboxed. */
  readonly networkSandboxed: boolean;
  /** Error message when the render failed. */
  readonly error?: string;
}

/** Options for {@link MockTenantOrchestrator}. */
export interface MockTenantOrchestratorOptions {
  /** Resource/time limits applied to every submission. */
  readonly limits: TenantRenderLimits;
  /** Per-tenant quotas; unknown tenants are rejected. */
  readonly quotas: Record<string, TenantQuota>;
  /** Mocked clock for quota windows (default: real Date.now). */
  readonly clock?: () => number;
  /** The (mock) render step. Default: a no-op success. */
  readonly renderFn?: (invocation: TenantRenderInvocation) => Promise<Omit<TenantRenderOutcome, 'tenantId' | 'compositionId' | 'networkSandboxed'>>;
}

/**
 * Mock orchestrator enforcing BF-475 in one place: prop validation entry →
 * resource/time limits → per-tenant quotas (concurrency + fixed window) →
 * injected render with the sandboxed-network flag → slot release on settle.
 */
export class MockTenantOrchestrator {
  private readonly ledger = new TenantQuotaLedger();
  private readonly limits: TenantRenderLimits;
  private readonly quotas: Record<string, TenantQuota>;
  private readonly clock: () => number;
  private readonly renderFn: (invocation: TenantRenderInvocation) => Promise<Omit<TenantRenderOutcome, 'tenantId' | 'compositionId' | 'networkSandboxed'>>;

  constructor(options: MockTenantOrchestratorOptions) {
    this.limits = options.limits;
    this.quotas = options.quotas;
    this.clock = options.clock ?? (() => Date.now());
    this.renderFn =
      options.renderFn ??
      (async () => ({ ok: true, outputUrl: 'mock://render-output' }));
  }

  /** Currently running renders for a tenant. */
  activeRenders(tenantId: string): number {
    return this.ledger.activeRenders(tenantId);
  }

  /** Validates and runs one tenant render (or throws before rendering). */
  async submit(request: TenantRenderRequest): Promise<TenantRenderOutcome> {
    const quota = this.quotas[request.tenantId];
    if (!quota) {
      throw new QuotaExceededError(`unknown tenant ${request.tenantId}`);
    }

    // 1. Prop validation entry point (BF-475).
    const validation = validateTenantProps(request.inputProps, this.limits);
    if (!validation.ok) {
      throw new PropValidationError(validation.errors);
    }

    // 2. Resource/time limits (BF-475).
    if (
      !Number.isFinite(request.durationInFrames) ||
      request.durationInFrames < 1 ||
      request.durationInFrames > this.limits.maxDurationInFrames
    ) {
      throw new TenantLimitExceededError(
        `duration ${request.durationInFrames} frames is outside the tenant limit of 1..${this.limits.maxDurationInFrames} frames`
      );
    }

    // 3. Per-tenant quotas (BF-475).
    this.ledger.consume(request.tenantId, quota, this.clock());

    // 4. Run the (mock) render with the sandboxed-network flag; the slot is
    // always released, and render failures propagate to the caller.
    try {
      const result = await this.renderFn({
        tenantId: request.tenantId,
        compositionId: request.compositionId,
        inputProps: request.inputProps,
        networkSandbox: this.limits.networkSandbox,
        timeoutMs: this.limits.renderTimeoutMs,
      });
      return {
        tenantId: request.tenantId,
        compositionId: request.compositionId,
        networkSandboxed: this.limits.networkSandbox,
        ...result,
      };
    } finally {
      this.ledger.release(request.tenantId);
    }
  }
}

/** Re-exported for hosts that resolve prop refs before tenant submission. */
export type { PropRefHandle };
