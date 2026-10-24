/**
 * Cost guard (BF-471): budgetGuard + runWithBudget abort over-budget renders.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CostEstimate } from '../src/index';
import {
  budgetGuard,
  runWithBudget,
  BudgetExceededError,
} from '../src/cost-guard';
import { createDefaultCloudJob } from '../src/index';

describe('budgetGuard (BF-471)', () => {
  it('allows when estimate under budget', () => {
    const estimate = { totalUsd: 1 } as unknown as CostEstimate;
    const result = budgetGuard(10, estimate);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejects when estimate exceeds budget', () => {
    const estimate = { totalUsd: 100 } as unknown as CostEstimate;
    const result = budgetGuard(10, estimate);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceeds budget');
  });

  it('rejects non-positive budget', () => {
    const estimate = { totalUsd: 1 } as unknown as CostEstimate;
    expect(budgetGuard(0, estimate).allowed).toBe(false);
    expect(budgetGuard(-5, estimate).allowed).toBe(false);
    expect(budgetGuard(NaN, estimate).allowed).toBe(false);
  });
});

describe('runWithBudget (BF-471)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders when within budget', async () => {
    const job = createDefaultCloudJob({ costBudgetUsd: 1000 });
    const renderFn = vi.fn().mockResolvedValue('rendered');
    const result = await runWithBudget(job, 1000, renderFn);
    expect(result).toBe('rendered');
    expect(renderFn).toHaveBeenCalledTimes(1);
  });

  it('aborts before rendering when over budget', async () => {
    const job = createDefaultCloudJob({ costBudgetUsd: 0.0001 });
    const renderFn = vi.fn().mockResolvedValue('rendered');
    await expect(runWithBudget(job, 0.0001, renderFn)).rejects.toThrow(
      BudgetExceededError
    );
    expect(renderFn).not.toHaveBeenCalled();
  });

  it('throws BudgetExceededError with estimate attached', async () => {
    const job = createDefaultCloudJob({ costBudgetUsd: 0.0001 });
    try {
      await runWithBudget(job, 0.0001, async () => 'x');
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      expect((err as BudgetExceededError).budgetExceeded).toBe(true);
      expect((err as BudgetExceededError).estimate.totalUsd).toBeGreaterThan(0);
    }
  });
});
