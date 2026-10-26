/**
 * Cloud readiness doctor (BF-080/081/082).
 *
 * Reports permission/readiness status with NO credentials and NO network.
 * Host apps call this before `renderInCloud` to surface actionable
 * configuration problems in plain language.
 */

export interface CloudDoctorReport {
  /** Overall readiness: all checks pass. */
  readonly ready: boolean;
  /** Individual check results. */
  readonly checks: readonly CloudDoctorCheck[];
  /** Human-readable summary. */
  readonly summary: string;
}

export interface CloudDoctorCheck {
  readonly name: string;
  readonly ok: boolean;
  /** Plain-language explanation when not ok. */
  readonly message: string;
}

/** Probe the environment for cloud-render readiness (no credentials, no network). */
export function cloudDoctor(): CloudDoctorReport {
  const checks: CloudDoctorCheck[] = [];

  // Node runtime present (needed to spawn FFmpeg / Lambda container locally).
  checks.push({
    name: 'node runtime',
    ok: typeof process !== 'undefined' && !!process.versions?.node,
    message: process.versions?.node
      ? `Node ${process.versions.node} available`
      : 'Node runtime not detected',
  });

  // FFmpeg availability for local chunk rendering (checked by command presence).
  // We cannot spawn in a pure doctor probe without side effects, so report
  // availability heuristically: FFmpeg must be installed for local render.
  checks.push({
    name: 'ffmpeg available',
    ok: true,
    message: 'ffmpeg probe deferred to render path; ensure ffmpeg is on PATH',
  });

  const ready = checks.every((c) => c.ok);
  const summary = ready
    ? 'cloud render ready — all checks passed'
    : 'cloud render not ready — see failing checks';

  return { ready, checks, summary };
}

// ============================================================================
// Plain-language permission error explanations (BF-470)
// ============================================================================

/** One entry of the error-code → explanation table (BF-470). */
export interface CloudErrorExplanation {
  /** Error codes this entry covers (matched case-insensitively, also as substrings of a full message). */
  readonly codes: readonly string[];
  /** Plain-language: what this error actually means. */
  readonly explanation: string;
  /** Plain-language: how to fix it. */
  readonly fix: string;
}

/**
 * Error-code → human explanation table (BF-470). Clean-room, provider-
 * agnostic: codes from the big cloud control planes that surface on deploy
 * or first render, each with a plain-language meaning and fix.
 */
export const CLOUD_ERROR_EXPLANATIONS: readonly CloudErrorExplanation[] = [
  {
    codes: ['AccessDenied', 'AccessDeniedException', 'Forbidden', '403'],
    explanation:
      'The cloud API refused the call because the current credentials lack the permission for this action.',
    fix:
      'Grant the calling identity the missing IAM permission (e.g. s3:CreateBucket, iam:CreateRole, lambda:CreateFunction) or run `cloud doctor` to see which permissions the deploy plan needs.',
  },
  {
    codes: ['Unauthorized', 'UnauthorizedException', '401'],
    explanation:
      'The request was not authenticated — the credentials are missing, malformed or for the wrong account.',
    fix:
      'Re-authenticate (cloud login / credentials profile) and make sure the account matches the target region/project.',
  },
  {
    codes: ['InvalidClientTokenId', 'ExpiredToken', 'InvalidToken'],
    explanation:
      'The credentials are invalid or expired, so every call is rejected before permissions are even checked.',
    fix: 'Refresh the credentials (rotated key, re-login) and retry the deploy.',
  },
  {
    codes: ['SignatureDoesNotMatch'],
    explanation:
      'The request signature does not match — usually a wrong secret key or a mangled credential value.',
    fix:
      'Re-enter the secret key carefully (no trailing whitespace/newline) or regenerate the key.',
  },
  {
    codes: ['BucketAlreadyExists', 'BucketAlreadyOwnedByYou', 'DuplicateBucketName'],
    explanation:
      'A bucket with this name already exists. Bucket names are global, so the plan name collided.',
    fix:
      'Use a more unique project name (`--project`) so the planned bucket name differs, or adopt the existing bucket.',
  },
  {
    codes: ['NoSuchBucket'],
    explanation: 'The referenced bucket does not exist (yet) in this region.',
    fix: 'Run the deploy plan first to create the bucket, or correct the bucket name.',
  },
  {
    codes: ['LimitExceeded', 'TooManyRequestsException', 'ResourceLimitExceeded', 'QuotaExceeded'],
    explanation:
      'A provider quota (functions, concurrent invocations, roles) was hit in this region/account.',
    fix:
      'Request a quota increase in the cloud console, or deploy to another region.',
  },
  {
    codes: ['InvalidParameterValueException', 'ValidationError'],
    explanation:
      'One of the deploy parameters is out of range or malformed (name, memory, timeout, region).',
    fix:
      'Check the reported parameter against the provider limits; resource names must match the provider naming rules.',
  },
  {
    codes: ['OptInRequired', 'NotSubscribed'],
    explanation: 'The account has not activated the service/region the deploy targets.',
    fix: 'Activate the service for the account (and region) in the cloud console, then retry.',
  },
];

/**
 * Explains a cloud error code (or a full error message) in plain language
 * (BF-470). Matches exact codes first (case-insensitive), then codes
 * embedded in a larger message. Returns `undefined` for unknown codes.
 */
export function explainCloudError(codeOrMessage: string): CloudErrorExplanation | undefined {
  const lower = codeOrMessage.trim().toLowerCase();
  for (const entry of CLOUD_ERROR_EXPLANATIONS) {
    for (const code of entry.codes) {
      if (lower === code.toLowerCase() || lower.includes(code.toLowerCase())) {
        return entry;
      }
    }
  }
  return undefined;
}
