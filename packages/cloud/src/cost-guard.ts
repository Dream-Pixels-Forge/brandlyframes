/**
 * Cost guard (BF-471).
 *
 * Pre-render cost estimate + budget cap that aborts safely. Host apps call
 * runWithBudget before rendering so a job estimated over budget never
 * starts, avoiding surprise spend.
 */

import { estimateJobCost, type CostEstimate, type CloudRenderJob } from './index';

/** Budget guard result. */
export interface BudgetGuardResult {
  /** Whether the budget allows the render. */
  readonly allowed: boolean;
  /** The estimate used for the decision. */
  readonly estimate: CostEstimate;
  /** Reason when not allowed. */
  readonly reason?: string;
}

/** Check whether `budget` permits the estimated cost of `job`. */
export function budgetGuard(
  budget: number,
  estimate: CostEstimate
): BudgetGuardResult {
  if (!Number.isFinite(budget) || budget <= 0) {
    return {
      allowed: false,
      estimate,
      reason: `budget must be a positive number, got ${budget}`,
    };
  }
  if (estimate.totalUsd > budget) {
    return {
      allowed: false,
      estimate,
      reason: `estimated cost $${estimate.totalUsd.toFixed(4)} exceeds budget $${budget.toFixed(4)}`,
    };
  }
  return { allowed: true, estimate };
}

/** Run `renderFn` only when the job's estimated cost is within `budget`.
 *
 * Returns the render result when allowed, or throws a BudgetExceededError
 * before any rendering happens when over budget — so no spend occurs.
 */
export async function runWithBudget<T>(
  job: CloudRenderJob,
  budget: number,
  renderFn: () => Promise<T>
): Promise<T> {
  const estimate = estimateJobCost(job);
  const guard = budgetGuard(budget, estimate);
  if (!guard.allowed) {
    throw new BudgetExceededError(guard.reason ?? 'budget exceeded', estimate);
  }
  return renderFn();
}

/** Error thrown by runWithBudget when over budget. */
export class BudgetExceededError extends Error {
  readonly estimate: CostEstimate;
  readonly budgetExceeded = true as const;
  constructor(message: string, estimate: CostEstimate) {
    super(message);
    this.name = 'BudgetExceededError';
    this.estimate = estimate;
  }
}
