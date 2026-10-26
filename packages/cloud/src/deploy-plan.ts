/**
 * One-command cloud deploy — plan/dry-run mode (BF-470).
 *
 * `planCloudDeploy` computes the IAM roles, buckets and functions a deploy
 * WOULD create, and `formatDeployPlan` prints them. Planning is pure: no
 * cloud calls, no credentials, no network. The real mutating deploy stays
 * behind a provider adapter (not part of this module).
 */

import type { CloudProvider, StorageBackend } from './index';

/** Options for {@link planCloudDeploy}. */
export interface DeployPlanOptions {
  /** Target provider. */
  readonly provider: CloudProvider;
  /** Deployment region (e.g. `us-east-1`, `europe-west1`). */
  readonly region: string;
  /** Project namespace used in resource names (default `brandlyframes`). */
  readonly projectName?: string;
  /** Environment stage baked into names (default `dev`). */
  readonly stage?: string;
  /** Storage backend to plan buckets for (default `s3`). */
  readonly storageBackend?: StorageBackend;
}

/** One would-be resource in a deploy plan. */
export interface DeployPlanResource {
  /** Resource kind. */
  readonly kind: 'iam-role' | 'bucket' | 'function';
  /** Would-be resource name (deterministic from the options). */
  readonly name: string;
  /** Plain-language reason this resource is needed. */
  readonly purpose: string;
}

/** A dry-run deploy plan: everything a real deploy would create. */
export interface DeployPlan {
  /** Target provider. */
  readonly provider: CloudProvider;
  /** Deployment region. */
  readonly region: string;
  /** Would-be resources, in creation order. */
  readonly resources: readonly DeployPlanResource[];
  /** Human-readable one-liner. */
  readonly summary: string;
}

const DEFAULT_PROJECT = 'brandlyframes';
const DEFAULT_STAGE = 'dev';
const DEFAULT_BACKEND: StorageBackend = 's3';

/**
 * Builds the would-be resource list for a deploy. Deterministic: identical
 * options always yield identical names, so plans can be diffed like code.
 */
export function planCloudDeploy(options: DeployPlanOptions): DeployPlan {
  const project = (options.projectName ?? DEFAULT_PROJECT).toLowerCase();
  const stage = options.stage ?? DEFAULT_STAGE;
  const backend = options.storageBackend ?? DEFAULT_BACKEND;
  const region = options.region;
  const base = `${project}-${stage}`;

  const resources: DeployPlanResource[] = [
    {
      kind: 'iam-role',
      name: `${base}-renderer-role`,
      purpose:
        'execution identity for the renderer: read input props, write chunk outputs',
    },
    {
      kind: 'bucket',
      name: `${backend === 's3' ? 's3' : 'gs'}://${base}-renders-${region.replace(/-/g, '')}`,
      purpose: 'stores chunk outputs and the final render',
    },
    {
      kind: 'function',
      name: `${base}-renderer-${options.provider}`,
      purpose: 'renders one frame-range chunk per invocation',
    },
  ];

  return {
    provider: options.provider,
    region,
    resources,
    summary: `dry-run: ${resources.length} resources would be created for ${options.provider} in ${region}`,
  };
}

/**
 * Formats a plan for terminal printing (`brandlyframes cloud deploy --dry-run`).
 * Always states it is a dry run — nothing is created by printing.
 */
export function formatDeployPlan(plan: DeployPlan): string {
  const lines: string[] = [
    `DRY-RUN deploy plan — ${plan.provider} / ${plan.region}`,
    'No resources are created in dry-run mode.',
    '',
  ];
  for (const resource of plan.resources) {
    lines.push(`  [${resource.kind}] ${resource.name}`);
    lines.push(`      ${resource.purpose}`);
  }
  lines.push('', plan.summary);
  return lines.join('\n');
}
