/**
 * Deploy plan + doctor error explanations (BF-470): dry-run plan printing
 * would-be IAM roles/buckets/functions, and plain-language permission error
 * explanations. Pure — no cloud calls, no credentials.
 */

import { describe, expect, it } from 'vitest';
import {
  planCloudDeploy,
  formatDeployPlan,
  type DeployPlan,
} from '../src/deploy-plan';
import { CLOUD_ERROR_EXPLANATIONS, explainCloudError } from '../src/doctor';

describe('planCloudDeploy (BF-470)', () => {
  it('plans an IAM role, bucket and function for aws-lambda', () => {
    const plan = planCloudDeploy({
      provider: 'aws-lambda',
      region: 'us-east-1',
      projectName: 'acme',
      stage: 'dev',
    });
    const kinds = plan.resources.map((r) => r.kind);
    expect(kinds).toContain('iam-role');
    expect(kinds).toContain('bucket');
    expect(kinds).toContain('function');
    expect(plan.provider).toBe('aws-lambda');
    expect(plan.region).toBe('us-east-1');
    for (const resource of plan.resources) {
      expect(resource.name).toContain('acme');
      expect(resource.purpose.length).toBeGreaterThan(0);
    }
  });

  it('plans deterministic names — same options, same plan', () => {
    const a = planCloudDeploy({ provider: 'gcp-cloudrun', region: 'europe-west1' });
    const b = planCloudDeploy({ provider: 'gcp-cloudrun', region: 'europe-west1' });
    expect(a.resources.map((r) => r.name)).toEqual(b.resources.map((r) => r.name));
  });

  it('keeps bucket names lowercase (cloud naming rules)', () => {
    const plan = planCloudDeploy({
      provider: 'aws-lambda',
      region: 'us-east-1',
      projectName: 'Acme',
    });
    for (const resource of plan.resources) {
      if (resource.kind === 'bucket') {
        expect(resource.name).toBe(resource.name.toLowerCase());
      }
    }
  });

  it('defaults project and stage names', () => {
    const plan = planCloudDeploy({ provider: 'aws-lambda', region: 'us-east-1' });
    expect(plan.resources.length).toBeGreaterThan(0);
    expect(plan.resources.every((r) => r.name.length > 0)).toBe(true);
  });

  it('does not include credentials or secret material', () => {
    const plan = planCloudDeploy({ provider: 'aws-lambda', region: 'us-east-1' });
    const json = JSON.stringify(plan);
    expect(json.toLowerCase()).not.toContain('secretaccesskey');
    expect(json.toLowerCase()).not.toContain('password');
  });
});

describe('formatDeployPlan (BF-470)', () => {
  it('prints would-be resources in a dry-run friendly form', () => {
    const plan: DeployPlan = planCloudDeploy({
      provider: 'aws-lambda',
      region: 'us-east-1',
      projectName: 'acme',
      stage: 'dev',
    });
    const text = formatDeployPlan(plan);
    expect(text).toContain('DRY-RUN');
    expect(text).toContain('iam-role');
    expect(text).toContain('bucket');
    expect(text).toContain('function');
    // Every planned resource appears by name.
    for (const resource of plan.resources) {
      expect(text).toContain(resource.name);
    }
  });
});

describe('explainCloudError (BF-470)', () => {
  it('has a non-empty error-code table', () => {
    expect(CLOUD_ERROR_EXPLANATIONS.length).toBeGreaterThan(0);
    for (const entry of CLOUD_ERROR_EXPLANATIONS) {
      expect(entry.codes.length).toBeGreaterThan(0);
      expect(entry.explanation.length).toBeGreaterThan(0);
      expect(entry.fix.length).toBeGreaterThan(0);
    }
  });

  it('explains AccessDenied in plain language', () => {
    const explained = explainCloudError('AccessDenied');
    expect(explained).toBeDefined();
    expect(explained!.explanation.toLowerCase()).toContain('permission');
    expect(explained!.fix.length).toBeGreaterThan(0);
  });

  it('matches a permission error embedded in a full message', () => {
    const explained = explainCloudError(
      'User arn:aws:iam::123:user/u is not authorized to perform: s3:CreateBucket (AccessDenied)'
    );
    expect(explained).toBeDefined();
  });

  it('returns undefined for unknown codes', () => {
    expect(explainCloudError('DefinitelyNotARealErrorCode42')).toBeUndefined();
  });

  it('is pure — same input, same explanation', () => {
    const a = explainCloudError('AccessDenied');
    const b = explainCloudError('AccessDenied');
    expect(a).toEqual(b);
  });
});
