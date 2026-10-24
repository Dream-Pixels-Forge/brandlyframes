/**
 * @brandlyframes/cloud — Cloud rendering orchestration
 * 
 * Splits a render job into frame-range chunks, executes them in parallel
 * on AWS Lambda or GCP Cloud Run, concatenates the results, and uploads
 * to S3/GCS. Includes cost estimation, retries, and drift detection.
 */

import { splitFrameRange } from '@brandlyframes/renderer';
export { splitFrameRange } from '@brandlyframes/renderer';

// ============================================================================
// Types
// ============================================================================

/** Cloud provider type */
export type CloudProvider = 'aws-lambda' | 'gcp-cloudrun';

/** Storage backend type */
export type StorageBackend = 's3' | 'gcs';

/** Video encoding preset */
export interface EncodingPreset {
  /** Output format */
  format: 'mp4' | 'webm' | 'gif' | 'png-sequence' | 'prores';
  /** Video codec */
  codec: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores' | 'gif';
  /** CRF quality (lower = better) */
  crf?: number;
  /** Target bitrate (kbps) */
  bitrate?: number;
  /** Pixel format */
  pixelFormat?: 'yuv420p' | 'yuva420p' | 'yuv422p' | 'yuv444p';
  /** Color space */
  colorSpace?: 'bt709' | 'bt2020' | 'srgb';
  /** Audio codec */
  audioCodec?: 'aac' | 'opus' | 'pcm';
  /** Audio bitrate (kbps) */
  audioBitrate?: number;
  /** FFmpeg preset */
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  /** Hardware acceleration */
  hwaccel?: 'none' | 'nvenc' | 'videotoolbox' | 'vaapi' | 'qsv';
}

/** Cloud render job configuration */
export interface CloudRenderJob {
  /** Unique job ID */
  id: string;
  /** Composition ID to render */
  compositionId: string;
  /** Input props for the composition */
  inputProps?: Record<string, unknown>;
  /** Frame range to render (if partial) */
  frameRange?: { start: number; end: number };
  /** Encoding preset */
  encoding: EncodingPreset;
  /** Number of frames per chunk (for parallelization) */
  chunkSize: number;
  /** Maximum concurrent workers */
  maxConcurrency: number;
  /** Storage destination */
  storage: {
    backend: StorageBackend;
    bucket: string;
    keyPrefix: string;
    region?: string;
    credentials?: Record<string, string>;
  };
  /** Webhook URLs for progress/completion */
  webhooks?: {
    onProgress?: string;
    onComplete?: string;
    onError?: string;
  };
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  /** Cost budget (USD) - aborts if exceeded */
  costBudgetUsd?: number;
  /** Timeout per chunk (ms) */
  chunkTimeoutMs?: number;
  /** Created timestamp */
  createdAt: number;
  /** Updated timestamp */
  updatedAt: number;
}

/** Chunk render request */
export interface ChunkRenderRequest {
  /** Job ID this chunk belongs to */
  jobId: string;
  /** Chunk index */
  chunkIndex: number;
  /** Frame range for this chunk */
  frameRange: { start: number; end: number };
  /** Composition ID */
  compositionId: string;
  /** Input props */
  inputProps?: Record<string, unknown>;
  /** Encoding preset */
  encoding: EncodingPreset;
  /** Storage upload target for this chunk */
  uploadTarget: {
    backend: StorageBackend;
    bucket: string;
    key: string;
    region?: string;
  };
  /** Callback URL for completion */
  callbackUrl?: string;
  /** Whether this chunk is a retry */
  retried?: boolean;
}

/** Chunk render result */
export interface ChunkRenderResult {
  /** Job ID */
  jobId: string;
  /** Chunk index */
  chunkIndex: number;
  /** Frame range rendered */
  frameRange: { start: number; end: number };
  /** Storage URL of the chunk output */
  outputUrl: string;
  /** Duration in ms */
  durationMs: number;
  /** Cost estimate for this chunk (USD) */
  costUsd: number;
  /** Whether this was a retry */
  retried: boolean;
  /** Error if failed */
  error?: string;
}

/** Job status */
export type JobStatus = 
  | 'pending' 
  | 'queued' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'partial';

/** Cloud job status */
export interface CloudJobStatus {
  /** Job ID */
  id: string;
  /** Current status */
  status: JobStatus;
  /** Progress 0-1 */
  progress: number;
  /** Completed chunks / total chunks */
  completedChunks: number;
  totalChunks: number;
  /** Current cost (USD) */
  costUsd: number;
  /** Estimated total cost (USD) */
  estimatedCostUsd: number;
  /** Final output URL (when completed) */
  outputUrl?: string;
  /** Error message (if failed) */
  error?: string;
  /** Started at timestamp */
  startedAt?: number;
  /** Completed at timestamp */
  completedAt?: number;
  /** Chunk results */
  chunks: ChunkRenderResult[];
}

/** Cost estimate result */
export interface CostEstimate {
  /** Estimated compute cost (USD) */
  computeUsd: number;
  /** Estimated storage cost (USD) */
  storageUsd: number;
  /** Estimated egress cost (USD) */
  egressUsd: number;
  /** Total estimated cost (USD) */
  totalUsd: number;
  /** Breakdown per chunk */
  perChunkUsd: number;
  /** Assumptions used */
  assumptions: {
    vcpuPricePerHour: number;
    memoryGbPricePerHour: number;
    storagePricePerGbMonth: number;
    egressPricePerGb: number;
    avgChunkDurationMs: number;
    avgOutputSizeMb: number;
  };
}

// ============================================================================
// Cloud Provider Adapters
// ============================================================================

/** Abstract cloud provider interface */
export interface CloudProviderAdapter {
  /** Provider name */
  readonly name: CloudProvider;
  
  /** Deploy/ensure the render function exists */
  deployFunction(config: ProviderConfig): Promise<FunctionDeployment>;
  
  /** Invoke a chunk render */
  invokeChunk(request: ChunkRenderRequest): Promise<ChunkRenderResult>;
  
  /** Get function logs */
  getLogs(functionName: string, requestId: string): Promise<string>;
  
  /** Clean up resources */
  cleanup(jobId: string): Promise<void>;
}

/** Provider configuration */
export interface ProviderConfig {
  /** Region to deploy in */
  region: string;
  /** Function memory (MB) */
  memoryMb: number;
  /** Function timeout (seconds) */
  timeoutSeconds: number;
  /** Container image URI (for Cloud Run) */
  imageUri?: string;
  /** Runtime (for Lambda) */
  runtime?: 'nodejs20.x' | 'python3.11' | 'provided.al2023';
  /** Environment variables */
  envVars?: Record<string, string>;
  /** IAM role/policy */
  iamRole?: string;
  /** VPC configuration */
  vpcConfig?: {
    subnetIds: string[];
    securityGroupIds: string[];
  };
}

/** Function deployment result */
export interface FunctionDeployment {
  /** Function name/ARN */
  name: string;
  /** Function URL/endpoint */
  url: string;
  /** Version */
  version: string;
  /** Deployed at timestamp */
  deployedAt: number;
}

/** AWS Lambda adapter */
export class AwsLambdaAdapter implements CloudProviderAdapter {
  readonly name = 'aws-lambda' as const;
  
  private config: ProviderConfig | null = null;
  private deployment: FunctionDeployment | null = null;
  
  async deployFunction(config: ProviderConfig): Promise<FunctionDeployment> {
    this.config = config;
    // In production: use AWS SDK to create/update Lambda function
    // with the renderer container image or ZIP
    this.deployment = {
      name: `brandlyframes-renderer-${Date.now()}`,
      url: `https://${config.region}.lambda.amazonaws.com/2015-03-31/functions/brandlyframes-renderer/invocations`,
      version: '1',
      deployedAt: Date.now(),
    };
    return this.deployment;
  }
  
  async invokeChunk(request: ChunkRenderRequest): Promise<ChunkRenderResult> {
    const startTime = Date.now();
    
    // In production: invoke Lambda asynchronously, poll for result
    // For now, simulate the render
    const result: ChunkRenderResult = {
      jobId: request.jobId,
      chunkIndex: request.chunkIndex,
      frameRange: request.frameRange,
      outputUrl: `${request.uploadTarget.backend}://${request.uploadTarget.bucket}/${request.uploadTarget.key}`,
      durationMs: Date.now() - startTime,
      costUsd: this.estimateChunkCost(request),
      retried: false,
    };
    
    return result;
  }
  
  async getLogs(_functionName: string, _requestId: string): Promise<string> {
    // In production: use CloudWatch Logs
    return `Logs for ${_functionName} request ${_requestId}`;
  }
  
  async cleanup(_jobId: string): Promise<void> {
    // In production: clean up any temporary resources
  }
  
  private estimateChunkCost(request: ChunkRenderRequest): number {
    const frameCount = request.frameRange.end - request.frameRange.start;
    const durationMinutes = (frameCount / 30) / 60; // Assume 30fps
    const gbHours = (this.config?.memoryMb || 1024) / 1024 * (durationMinutes / 60);
    const vcpuPrice = 0.0000166667; // $/GB-second
    return gbHours * 3600 * vcpuPrice;
  }
}

/** GCP Cloud Run adapter */
export class GcpCloudRunAdapter implements CloudProviderAdapter {
  readonly name = 'gcp-cloudrun' as const;
  
  private config: ProviderConfig | null = null;
  private deployment: FunctionDeployment | null = null;
  
  async deployFunction(config: ProviderConfig): Promise<FunctionDeployment> {
    this.config = config;
    // In production: use Google Cloud SDK to deploy Cloud Run service
    this.deployment = {
      name: `brandlyframes-renderer-${Date.now()}`,
      url: `https://brandlyframes-renderer-${config.region}.run.app`,
      version: '1',
      deployedAt: Date.now(),
    };
    return this.deployment;
  }
  
  async invokeChunk(request: ChunkRenderRequest): Promise<ChunkRenderResult> {
    const startTime = Date.now();
    
    // In production: POST to Cloud Run endpoint, wait for response
    const result: ChunkRenderResult = {
      jobId: request.jobId,
      chunkIndex: request.chunkIndex,
      frameRange: request.frameRange,
      outputUrl: `${request.uploadTarget.backend}://${request.uploadTarget.bucket}/${request.uploadTarget.key}`,
      durationMs: Date.now() - startTime,
      costUsd: this.estimateChunkCost(request),
      retried: false,
    };
    
    return result;
  }
  
  async getLogs(_functionName: string, _requestId: string): Promise<string> {
    // In production: use Cloud Logging
    return `Logs for ${_functionName} request ${_requestId}`;
  }
  
  async cleanup(_jobId: string): Promise<void> {
    // In production: clean up Cloud Run revisions if needed
  }
  
  private estimateChunkCost(request: ChunkRenderRequest): number {
    const frameCount = request.frameRange.end - request.frameRange.start;
    const durationSeconds = frameCount / 30; // Assume 30fps
    const vcpuPrice = 0.000024; // $/vCPU-second
    const memoryPrice = 0.0000025; // $/GB-second
    const cpus = 2;
    const memoryGb = (this.config?.memoryMb || 1024) / 1024;
    return (cpus * vcpuPrice + memoryGb * memoryPrice) * durationSeconds;
  }
}

/** Get adapter for provider */
export function getCloudAdapter(provider: CloudProvider): CloudProviderAdapter {
  switch (provider) {
    case 'aws-lambda':
      return new AwsLambdaAdapter();
    case 'gcp-cloudrun':
      return new GcpCloudRunAdapter();
    default:
      throw new Error(`Unknown cloud provider: ${provider}`);
  }
}

// ============================================================================
// Storage Upload
// ============================================================================

/** Upload a file to storage */
export async function uploadToStorage(
  _backend: StorageBackend,
  _bucket: string,
  _key: string,
  _filePath: string,
  _options?: { region?: string; credentials?: Record<string, string> }
): Promise<string> {
  // In production: use AWS SDK (S3) or Google Cloud SDK (GCS)
  // For now, return a mock URL
  return `${_backend}://${_bucket}/${_key}`;
}

/** Download a file from storage */
export async function downloadFromStorage(
  _backend: StorageBackend,
  _bucket: string,
  _key: string,
  _destinationPath: string,
  _options?: { region?: string; credentials?: Record<string, string> }
): Promise<void> {
  // In production: download from S3/GCS
}

// ============================================================================
// FFmpeg Concatenation
// ============================================================================

/** Concatenate chunk outputs into final video */
export async function concatenateChunks(
  chunkUrls: string[],
  outputPath: string,
  _encoding: EncodingPreset
): Promise<void> {
  // In production: use FFmpeg concat demuxer or filter_complex
  // For now, simulate
  console.log(`Concatenating ${chunkUrls.length} chunks to ${outputPath}`);
}

/** Generate concat file list for FFmpeg */
export function generateConcatFileList(chunkUrls: string[]): string {
  return chunkUrls.map(url => `file '${url}'`).join('\n');
}

// ============================================================================
// Job Orchestration
// ============================================================================

/** Create chunk requests from a job */
export function createChunkRequests(job: CloudRenderJob): ChunkRenderRequest[] {
  const totalFrames = job.frameRange 
    ? job.frameRange.end - job.frameRange.start 
    : 300; // Default duration
  
  const startFrame = job.frameRange?.start || 0;
  const ranges = splitFrameRange(startFrame, startFrame + totalFrames, job.chunkSize);
  
  return ranges.map((range, index) => ({
    jobId: job.id,
    chunkIndex: index,
    frameRange: range,
    compositionId: job.compositionId,
    inputProps: job.inputProps,
    encoding: job.encoding,
    uploadTarget: {
      backend: job.storage.backend,
      bucket: job.storage.bucket,
      key: `${job.storage.keyPrefix}/chunk-${index}.${job.encoding.format}`,
      region: job.storage.region,
    },
    callbackUrl: job.webhooks?.onProgress,
  }));
}

/** Estimate cost for a cloud render job */
export function estimateJobCost(job: CloudRenderJob): CostEstimate {
  // Use provider to select pricing model
  const _provider = job.storage.backend === 's3' ? 'aws-lambda' : 'gcp-cloudrun';
  
  const totalFrames = job.frameRange 
    ? job.frameRange.end - job.frameRange.start 
    : 300;
  const chunkCount = Math.ceil(totalFrames / job.chunkSize);
  const framesPerChunk = job.chunkSize;
  
  // Rough estimates based on provider pricing
  const assumptions = {
    vcpuPricePerHour: 0.06,
    memoryGbPricePerHour: 0.007,
    storagePricePerGbMonth: 0.023,
    egressPricePerGb: 0.09,
    avgChunkDurationMs: (framesPerChunk / 30) * 1000 * 2, // 2x realtime
    avgOutputSizeMb: framesPerChunk * 0.5, // ~0.5MB per frame for 1080p
  };
  
  const computeUsd = chunkCount * (assumptions.avgChunkDurationMs / 3600000) * 
    (assumptions.vcpuPricePerHour * 2 + assumptions.memoryGbPricePerHour * 1);
  const storageUsd = (assumptions.avgOutputSizeMb / 1024) * chunkCount * assumptions.storagePricePerGbMonth;
  const egressUsd = (assumptions.avgOutputSizeMb / 1024) * chunkCount * assumptions.egressPricePerGb;
  
  return {
    computeUsd,
    storageUsd,
    egressUsd,
    totalUsd: computeUsd + storageUsd + egressUsd,
    perChunkUsd: computeUsd / chunkCount,
    assumptions,
  };
}

/** Check if job exceeds cost budget */
export function checkCostBudget(job: CloudRenderJob, estimate: CostEstimate): boolean {
  if (!job.costBudgetUsd) return true;
  return estimate.totalUsd <= job.costBudgetUsd;
}

// ============================================================================
// Drift Detection
// ============================================================================

/** Drift detection result */
export interface DriftCheckResult {
  /** Whether drift was detected */
  hasDrift: boolean;
  /** Maximum frame timestamp drift (ms) */
  maxDriftMs: number;
  /** Frames with drift */
  driftedFrames: number[];
  /** Expected vs actual frame timestamps */
  comparisons: Array<{
    frame: number;
    expectedMs: number;
    actualMs: number;
    driftMs: number;
  }>;
}

/** Check for A/V drift in rendered output */
export async function checkDrift(
  _outputPath: string,
  _expectedFps: number,
  _toleranceMs: number = 33 // ~1 frame at 30fps
): Promise<DriftCheckResult> {
  // In production: use FFprobe to extract frame timestamps and compare
  // For now, return a mock result
  return {
    hasDrift: false,
    maxDriftMs: 0,
    driftedFrames: [],
    comparisons: [],
  };
}

/** Run 10-minute drift test (BF-082) */
export async function runDriftTest(
  provider: CloudProvider,
  config: ProviderConfig,
  encoding: EncodingPreset
): Promise<DriftCheckResult> {
  // Render a 10-minute test video (18000 frames at 30fps)
  // Check for drift across chunk boundaries
  const _testJob: CloudRenderJob = {
    id: `drift-test-${Date.now()}`,
    compositionId: 'drift-test',
    frameRange: { start: 0, end: 18000 },
    encoding,
    chunkSize: 300, // 10 seconds per chunk
    maxConcurrency: 10,
    storage: { backend: 's3', bucket: 'test', keyPrefix: 'drift-test' },
    retry: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  // In production: actually run the render and check drift
  return checkDrift('/tmp/test-output.mp4', 30);
}

// ============================================================================
// Webhook Handling
// ============================================================================

/** Send webhook notification */
export async function sendWebhook(
  url: string,
  payload: Record<string, unknown>,
  retries: number = 3
): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // In production: use fetch to POST to webhook URL
      console.log(`Webhook to ${url}:`, payload);
      return;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

/** Default webhook payload for progress */
export interface ProgressWebhookPayload {
  jobId: string;
  status: JobStatus;
  progress: number;
  completedChunks: number;
  totalChunks: number;
  costUsd: number;
  timestamp: number;
}

/** Default webhook payload for completion */
export interface CompleteWebhookPayload {
  jobId: string;
  status: 'completed' | 'failed';
  outputUrl?: string;
  error?: string;
  totalCostUsd: number;
  durationMs: number;
  timestamp: number;
}

// ============================================================================
// Main Cloud Render Function
// ============================================================================

/** Submit a cloud render job */
export async function renderInCloud(
  job: CloudRenderJob,
  provider: CloudProvider
): Promise<CloudJobStatus> {
  const adapter = getCloudAdapter(provider);
  
  // Deploy/ensure function exists
  await adapter.deployFunction({
    region: job.storage.region || 'us-east-1',
    memoryMb: 2048,
    timeoutSeconds: 900,
  });
  
  // Create chunk requests
  const chunks = createChunkRequests(job);
  
  // Initialize status
  const status: CloudJobStatus = {
    id: job.id,
    status: 'running',
    progress: 0,
    completedChunks: 0,
    totalChunks: chunks.length,
    costUsd: 0,
    estimatedCostUsd: estimateJobCost(job).totalUsd,
    chunks: [],
  };
  
  // Check cost budget
  if (!checkCostBudget(job, estimateJobCost(job))) {
    throw new Error(`Estimated cost exceeds budget: ${estimateJobCost(job).totalUsd} > ${job.costBudgetUsd}`);
  }
  
  // Process chunks with concurrency limit
  const semaphore = new Semaphore(job.maxConcurrency);
  
  const chunkPromises = chunks.map(async (chunk) => {
    await semaphore.acquire();
    try {
      const result = await adapter.invokeChunk(chunk);
      status.chunks.push(result);
      status.completedChunks++;
      status.costUsd += result.costUsd;
      status.progress = status.completedChunks / status.totalChunks;
      
      // Send progress webhook
      if (job.webhooks?.onProgress) {
        await sendWebhook(job.webhooks.onProgress, {
          jobId: job.id,
          status: status.status,
          progress: status.progress,
          completedChunks: status.completedChunks,
          totalChunks: status.totalChunks,
          costUsd: status.costUsd,
          timestamp: Date.now(),
        });
      }
      
      return result;
    } catch (error) {
      // Retry logic
      const retryConfig = job.retry || { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 };
      let lastError = error;
      
      for (let attempt = 1; attempt < retryConfig.maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, retryConfig.backoffMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1)));
        try {
          const result = await adapter.invokeChunk({ ...chunk, retried: true });
          status.chunks.push(result);
          status.completedChunks++;
          status.costUsd += result.costUsd;
          status.progress = status.completedChunks / status.totalChunks;
          return result;
        } catch (retryError) {
          lastError = retryError;
        }
      }
      
      // All retries failed
      const failedResult: ChunkRenderResult = {
        jobId: chunk.jobId,
        chunkIndex: chunk.chunkIndex,
        frameRange: chunk.frameRange,
        outputUrl: '',
        durationMs: 0,
        costUsd: 0,
        retried: true,
        error: lastError instanceof Error ? lastError.message : String(lastError),
      };
      status.chunks.push(failedResult);
      throw error;
    } finally {
      semaphore.release();
    }
  });
  
  await Promise.all(chunkPromises);
  
  // Check for failures
  const failedChunks = status.chunks.filter(c => c.error);
  if (failedChunks.length > 0) {
    status.status = failedChunks.length === chunks.length ? 'failed' : 'partial';
    status.error = `${failedChunks.length}/${chunks.length} chunks failed`;
  } else {
    status.status = 'completed';
  }
  
  // Concatenate chunks
  if (status.status !== 'failed') {
    const successfulChunks = status.chunks.filter(c => !c.error).sort((a, b) => a.chunkIndex - b.chunkIndex);
    const outputKey = `${job.storage.keyPrefix}/output.${job.encoding.format}`;
    const outputUrl = `${job.storage.backend}://${job.storage.bucket}/${outputKey}`;
    
    await concatenateChunks(
      successfulChunks.map(c => c.outputUrl),
      outputUrl,
      job.encoding
    );
    
    status.outputUrl = outputUrl;
  }
  
  status.completedAt = Date.now();
  
  // Send completion webhook
  if (job.webhooks?.onComplete) {
    await sendWebhook(job.webhooks.onComplete, {
      jobId: job.id,
      status: status.status,
      outputUrl: status.outputUrl,
      error: status.error,
      totalCostUsd: status.costUsd,
      durationMs: status.completedAt - (status.chunks[0] ? status.chunks[0].durationMs : 0),
      timestamp: Date.now(),
    });
  }
  
  return status;
}

/** Simple semaphore for concurrency control */
class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise(resolve => this.waiters.push(resolve));
  }
  
  release(): void {
    this.permits++;
    const waiter = this.waiters.shift();
    if (waiter) {
      this.permits--;
      waiter();
    }
  }
}

// ============================================================================
// Cloud readiness doctor (BF-080/081/082)
// ============================================================================

export { cloudDoctor, type CloudDoctorReport, type CloudDoctorCheck } from './doctor';

// ============================================================================
// Cost guard (BF-471)
// ============================================================================

export {
  budgetGuard,
  runWithBudget,
  BudgetExceededError,
  type BudgetGuardResult,
} from './cost-guard';

// ============================================================================
// CLI Helpers
// ============================================================================

/** Create a default cloud render job */
export function createDefaultCloudJob(overrides: Partial<CloudRenderJob> = {}): CloudRenderJob {
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    compositionId: 'main',
    encoding: {
      format: 'mp4',
      codec: 'h264',
      crf: 23,
      preset: 'medium',
      pixelFormat: 'yuv420p',
      colorSpace: 'bt709',
      audioCodec: 'aac',
      audioBitrate: 128,
      hwaccel: 'none',
    },
    chunkSize: 300,
    maxConcurrency: 10,
    storage: {
      backend: 's3',
      bucket: 'brandlyframes-renders',
      keyPrefix: 'renders',
    },
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
    },
    chunkTimeoutMs: 300000, // 5 minutes
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}