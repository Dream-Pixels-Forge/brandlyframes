/**
 * Safe multi-tenant rendering (BF-475): prop validation entry point,
 * resource/time limits, sandboxed network flag, and per-tenant quotas
 * enforced in the mock orchestrator. No real rendering — injected mock only.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  MockTenantOrchestrator,
  PropValidationError,
  QuotaExceededError,
  TenantLimitExceededError,
  TenantQuotaLedger,
  validateTenantProps,
  type TenantQuota,
  type TenantRenderLimits,
} from '../src/tenant-safety';

const LIMITS: TenantRenderLimits = {
  maxPropBytes: 1024,
  maxDurationInFrames: 300,
  renderTimeoutMs: 60_000,
  networkSandbox: true,
};

const QUOTA: TenantQuota = {
  maxConcurrentRenders: 2,
  maxRendersPerWindow: 3,
  windowMs: 1000,
};

describe('validateTenantProps (BF-475)', () => {
  it('accepts plain JSON props within limits', () => {
    const result = validateTenantProps({ title: 'hello', count: 3 }, LIMITS);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects props over the byte limit', () => {
    const result = validateTenantProps({ blob: 'x'.repeat(2000) }, LIMITS);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('size');
  });

  it('rejects non-JSON-safe values (functions, symbols)', () => {
    const result = validateTenantProps(
      { callback: () => undefined } as unknown as Record<string, unknown>,
      LIMITS
    );
    expect(result.ok).toBe(false);
  });

  it('rejects deeply nested props', () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 100; i++) {
      deep = { nested: deep };
    }
    const result = validateTenantProps(deep, LIMITS);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('depth');
  });
});

describe('MockTenantOrchestrator (BF-475)', () => {
  it('renders a valid submission through the injected render fn', async () => {
    const renderFn = vi.fn().mockResolvedValue({ ok: true, outputUrl: 'mock://out' });
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': QUOTA },
      renderFn,
    });
    const outcome = await orchestrator.submit({
      tenantId: 'tenant-a',
      compositionId: 'main',
      inputProps: { title: 'hello' },
      durationInFrames: 90,
    });
    expect(renderFn).toHaveBeenCalledTimes(1);
    expect(outcome.ok).toBe(true);
    expect(outcome.networkSandboxed).toBe(true);
  });

  it('rejects oversized props with PropValidationError before rendering', async () => {
    const renderFn = vi.fn();
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': QUOTA },
      renderFn,
    });
    await expect(
      orchestrator.submit({
        tenantId: 'tenant-a',
        compositionId: 'main',
        inputProps: { blob: 'x'.repeat(2000) },
        durationInFrames: 10,
      })
    ).rejects.toThrow(PropValidationError);
    expect(renderFn).not.toHaveBeenCalled();
  });

  it('rejects renders over the duration limit', async () => {
    const renderFn = vi.fn();
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': QUOTA },
      renderFn,
    });
    await expect(
      orchestrator.submit({
        tenantId: 'tenant-a',
        compositionId: 'main',
        inputProps: {},
        durationInFrames: LIMITS.maxDurationInFrames + 1,
      })
    ).rejects.toThrow(TenantLimitExceededError);
    expect(renderFn).not.toHaveBeenCalled();
  });

  it('enforces per-tenant concurrent render quotas', async () => {
    const renderFn = vi.fn(
      () => new Promise<{ ok: true }>((resolve) => setTimeout(() => resolve({ ok: true }), 5))
    );
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': { ...QUOTA, maxConcurrentRenders: 1 } },
      renderFn,
    });
    const first = orchestrator.submit({
      tenantId: 'tenant-a',
      compositionId: 'main',
      inputProps: {},
      durationInFrames: 1,
    });
    await expect(
      orchestrator.submit({
        tenantId: 'tenant-a',
        compositionId: 'main',
        inputProps: {},
        durationInFrames: 1,
      })
    ).rejects.toThrow(QuotaExceededError);
    await first;
  });

  it('enforces per-window render-count quotas', async () => {
    const clock = { now: 0 };
    const renderFn = vi.fn().mockResolvedValue({ ok: true });
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': { maxConcurrentRenders: 5, maxRendersPerWindow: 2, windowMs: 100 } },
      clock: () => clock.now,
      renderFn,
    });
    const submit = () =>
      orchestrator.submit({
        tenantId: 'tenant-a',
        compositionId: 'main',
        inputProps: {},
        durationInFrames: 1,
      });
    await submit();
    await submit();
    await expect(submit()).rejects.toThrow(QuotaExceededError);
    // Window elapses (mocked clock advances) → quota resets.
    clock.now = 200;
    await expect(submit()).resolves.toBeTruthy();
  });

  it('quotas are per tenant, not global', async () => {
    const renderFn = vi.fn().mockResolvedValue({ ok: true });
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: {
        'tenant-a': { maxConcurrentRenders: 5, maxRendersPerWindow: 1, windowMs: 1000 },
        'tenant-b': { maxConcurrentRenders: 5, maxRendersPerWindow: 1, windowMs: 1000 },
      },
      renderFn,
    });
    await orchestrator.submit({
      tenantId: 'tenant-a',
      compositionId: 'main',
      inputProps: {},
      durationInFrames: 1,
    });
    await expect(
      orchestrator.submit({
        tenantId: 'tenant-b',
        compositionId: 'main',
        inputProps: {},
        durationInFrames: 1,
      })
    ).resolves.toBeTruthy();
  });

  it('releases the concurrency slot when a render settles', async () => {
    const renderFn = vi.fn().mockResolvedValue({ ok: true });
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': { maxConcurrentRenders: 1, maxRendersPerWindow: 10, windowMs: 1000 } },
      renderFn,
    });
    const submit = () =>
      orchestrator.submit({
        tenantId: 'tenant-a',
        compositionId: 'main',
        inputProps: {},
        durationInFrames: 1,
      });
    await submit();
    await expect(submit()).resolves.toBeTruthy();
    expect(orchestrator.activeRenders('tenant-a')).toBe(0);
  });

  it('passes the sandboxed-network flag into the render invocation', async () => {
    const renderFn = vi.fn().mockResolvedValue({ ok: true });
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': QUOTA },
      renderFn,
    });
    await orchestrator.submit({
      tenantId: 'tenant-a',
      compositionId: 'main',
      inputProps: {},
      durationInFrames: 1,
    });
    const invocation = renderFn.mock.calls[0]![0] as { networkSandbox: boolean };
    expect(invocation.networkSandbox).toBe(true);
  });

  it('still releases the slot when the render fails', async () => {
    const renderFn = vi.fn().mockRejectedValue(new Error('boom'));
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': { maxConcurrentRenders: 1, maxRendersPerWindow: 10, windowMs: 1000 } },
      renderFn,
    });
    await expect(
      orchestrator.submit({
        tenantId: 'tenant-a',
        compositionId: 'main',
        inputProps: {},
        durationInFrames: 1,
      })
    ).rejects.toThrow('boom');
    expect(orchestrator.activeRenders('tenant-a')).toBe(0);
  });

  it('rejects unknown tenants', async () => {
    const orchestrator = new MockTenantOrchestrator({
      limits: LIMITS,
      quotas: { 'tenant-a': QUOTA },
      renderFn: async () => ({ ok: true }),
    });
    await expect(
      orchestrator.submit({
        tenantId: 'stranger',
        compositionId: 'main',
        inputProps: {},
        durationInFrames: 1,
      })
    ).rejects.toThrow(QuotaExceededError);
  });
});

describe('TenantQuotaLedger (BF-475)', () => {
  it('tracks concurrent usage per tenant', () => {
    const ledger = new TenantQuotaLedger();
    ledger.consume('t', { maxConcurrentRenders: 1, maxRendersPerWindow: 5, windowMs: 1000 }, 0);
    expect(ledger.activeRenders('t')).toBe(1);
    ledger.release('t');
    expect(ledger.activeRenders('t')).toBe(0);
  });

  it('throws QuotaExceededError over concurrent quota', () => {
    const ledger = new TenantQuotaLedger();
    ledger.consume('t', { maxConcurrentRenders: 1, maxRendersPerWindow: 5, windowMs: 1000 }, 0);
    expect(() =>
      ledger.consume('t', { maxConcurrentRenders: 1, maxRendersPerWindow: 5, windowMs: 1000 }, 0)
    ).toThrow(QuotaExceededError);
  });

  it('resets the window count after windowMs elapses', () => {
    const quota = { maxConcurrentRenders: 5, maxRendersPerWindow: 1, windowMs: 100 };
    const ledger = new TenantQuotaLedger();
    ledger.consume('t', quota, 0);
    expect(() => ledger.consume('t', quota, 50)).toThrow(QuotaExceededError);
    expect(() => ledger.consume('t', quota, 100)).not.toThrow();
  });
});
