import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  splitFrameRange,
  createChunkRequests,
  estimateJobCost,
  checkCostBudget,
  generateConcatFileList,
  createDefaultCloudJob,
  getCloudAdapter,
  sendWebhook,
  checkDrift,
  runDriftTest,
  CloudProvider,
  CloudRenderJob,
  DriftCheckResult,
} from '../src/index';

describe('Cloud package', () => {
  describe('splitFrameRange (re-exported from renderer)', () => {
    it('splits frames into chunks', () => {
      const ranges = splitFrameRange(0, 100, 30);
      expect(ranges).toEqual([
        { start: 0, end: 30 },
        { start: 30, end: 60 },
        { start: 60, end: 90 },
        { start: 90, end: 100 },
      ]);
    });
  });

  describe('createChunkRequests', () => {
    it('creates chunk requests from a job', () => {
      const job: CloudRenderJob = createDefaultCloudJob({
        id: 'test-job',
        compositionId: 'my-comp',
        chunkSize: 100,
        frameRange: { start: 0, end: 250 },
      });
      
      const chunks = createChunkRequests(job);
      
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toMatchObject({
        jobId: 'test-job',
        chunkIndex: 0,
        frameRange: { start: 0, end: 100 },
        compositionId: 'my-comp',
      });
      expect(chunks[1]).toMatchObject({
        chunkIndex: 1,
        frameRange: { start: 100, end: 200 },
      });
      expect(chunks[2]).toMatchObject({
        chunkIndex: 2,
        frameRange: { start: 200, end: 250 },
      });
    });

    it('uses default frame range when not specified', () => {
      const job = createDefaultCloudJob({
        chunkSize: 150,
        // No frameRange - should use default 300 frames
      });
      
      const chunks = createChunkRequests(job);
      
      expect(chunks).toHaveLength(2); // 300 / 150 = 2
      expect(chunks[0].frameRange).toEqual({ start: 0, end: 150 });
      expect(chunks[1].frameRange).toEqual({ start: 150, end: 300 });
    });
  });

  describe('estimateJobCost', () => {
    it('returns a cost estimate with all fields', () => {
      const job = createDefaultCloudJob({
        chunkSize: 300,
        frameRange: { start: 0, end: 18000 }, // 10 minutes at 30fps
      });
      
      const estimate = estimateJobCost(job);
      
      expect(estimate).toHaveProperty('computeUsd');
      expect(estimate).toHaveProperty('storageUsd');
      expect(estimate).toHaveProperty('egressUsd');
      expect(estimate).toHaveProperty('totalUsd');
      expect(estimate).toHaveProperty('perChunkUsd');
      expect(estimate).toHaveProperty('assumptions');
      
      expect(estimate.totalUsd).toBeGreaterThan(0);
      expect(estimate.perChunkUsd).toBeGreaterThan(0);
      expect(estimate.assumptions.avgChunkDurationMs).toBeGreaterThan(0);
    });

    it('scales per-chunk cost with chunk size', () => {
      const jobSmall = createDefaultCloudJob({ chunkSize: 600, frameRange: { start: 0, end: 1800 } });
      const jobLarge = createDefaultCloudJob({ chunkSize: 100, frameRange: { start: 0, end: 1800 } });
      
      const estimateSmall = estimateJobCost(jobSmall);
      const estimateLarge = estimateJobCost(jobLarge);
      
      // Same total frames, but different chunk sizes = different per-chunk cost
      expect(estimateLarge.perChunkUsd).toBeLessThan(estimateSmall.perChunkUsd);
      // Total cost should be similar (same total compute)
      expect(Math.abs(estimateLarge.totalUsd - estimateSmall.totalUsd) / estimateSmall.totalUsd).toBeLessThan(0.1);
    });
  });

  describe('checkCostBudget', () => {
    it('returns true when no budget is set', () => {
      const job = createDefaultCloudJob();
      const estimate = estimateJobCost(job);
      
      expect(checkCostBudget(job, estimate)).toBe(true);
    });

    it('returns true when estimate is under budget', () => {
      const job = createDefaultCloudJob({ costBudgetUsd: 100 });
      const estimate = estimateJobCost(job);
      
      expect(checkCostBudget(job, estimate)).toBe(true);
    });

    it('returns false when estimate exceeds budget', () => {
      const job = createDefaultCloudJob({ costBudgetUsd: 0.0001 }); // Very low budget
      const estimate = estimateJobCost(job);
      
      expect(checkCostBudget(job, estimate)).toBe(false);
    });
  });

  describe('createDefaultCloudJob', () => {
    it('creates a job with sensible defaults', () => {
      const job = createDefaultCloudJob();
      
      expect(job.id).toMatch(/^job-\d+/);
      expect(job.compositionId).toBe('main');
      expect(job.encoding.format).toBe('mp4');
      expect(job.encoding.codec).toBe('h264');
      expect(job.chunkSize).toBe(300);
      expect(job.maxConcurrency).toBe(10);
      expect(job.storage.backend).toBe('s3');
      expect(job.retry?.maxAttempts).toBe(3);
      expect(job.createdAt).toBeGreaterThan(0);
    });

    it('allows overriding defaults', () => {
      const job = createDefaultCloudJob({
        compositionId: 'custom',
        chunkSize: 500,
        maxConcurrency: 5,
        storage: { backend: 'gcs', bucket: 'my-bucket', keyPrefix: 'custom' },
      });
      
      expect(job.compositionId).toBe('custom');
      expect(job.chunkSize).toBe(500);
      expect(job.maxConcurrency).toBe(5);
      expect(job.storage.backend).toBe('gcs');
      expect(job.storage.bucket).toBe('my-bucket');
    });
  });

  describe('getCloudAdapter', () => {
    it('returns AWS Lambda adapter for aws-lambda', () => {
      const adapter = getCloudAdapter('aws-lambda');
      expect(adapter.name).toBe('aws-lambda');
    });

    it('returns GCP Cloud Run adapter for gcp-cloudrun', () => {
      const adapter = getCloudAdapter('gcp-cloudrun');
      expect(adapter.name).toBe('gcp-cloudrun');
    });

    it('throws for unknown provider', () => {
      expect(() => getCloudAdapter('unknown' as CloudProvider)).toThrow(/Unknown cloud provider/);
    });
  });

  describe('AwsLambdaAdapter', () => {
    it('can deploy a function', async () => {
      const adapter = getCloudAdapter('aws-lambda');
      const deployment = await adapter.deployFunction({
        region: 'us-east-1',
        memoryMb: 1024,
        timeoutSeconds: 300,
      });
      
      expect(deployment.name).toContain('brandlyframes-renderer');
      expect(deployment.url).toContain('lambda.amazonaws.com');
      expect(deployment.version).toBe('1');
    });

    it('can invoke a chunk', async () => {
      const adapter = getCloudAdapter('aws-lambda');
      await adapter.deployFunction({ region: 'us-east-1', memoryMb: 1024, timeoutSeconds: 300 });
      
      const result = await adapter.invokeChunk({
        jobId: 'test-job',
        chunkIndex: 0,
        frameRange: { start: 0, end: 30 },
        compositionId: 'test',
        encoding: { format: 'mp4', codec: 'h264' },
        uploadTarget: { backend: 's3', bucket: 'test', key: 'chunk-0.mp4' },
      });
      
      expect(result.jobId).toBe('test-job');
      expect(result.chunkIndex).toBe(0);
      expect(result.outputUrl).toContain('s3://');
      expect(result.costUsd).toBeGreaterThan(0);
    });
  });

  describe('GcpCloudRunAdapter', () => {
    it('can deploy a function', async () => {
      const adapter = getCloudAdapter('gcp-cloudrun');
      const deployment = await adapter.deployFunction({
        region: 'us-central1',
        memoryMb: 1024,
        timeoutSeconds: 300,
      });

      expect(deployment.name).toContain('brandlyframes-renderer');
      expect(deployment.url).toContain('run.app');
      expect(deployment.version).toBe('1');
    });

    it('can invoke a chunk', async () => {
      const adapter = getCloudAdapter('gcp-cloudrun');
      await adapter.deployFunction({ region: 'us-central1', memoryMb: 1024, timeoutSeconds: 300 });

      const result = await adapter.invokeChunk({
        jobId: 'test-job',
        chunkIndex: 0,
        frameRange: { start: 0, end: 30 },
        compositionId: 'test',
        encoding: { format: 'mp4', codec: 'h264' },
        uploadTarget: { backend: 'gcs', bucket: 'test', key: 'chunk-0.mp4' },
      });

      expect(result.jobId).toBe('test-job');
      expect(result.chunkIndex).toBe(0);
      expect(result.outputUrl).toContain('gcs://');
      expect(result.costUsd).toBeGreaterThan(0);
    });
  });
});

describe('generateConcatFileList (BF-080)', () => {
  it('writes one file line per chunk URL', () => {
    const chunkUrls = [
      's3://bucket/job/chunk-0.mp4',
      's3://bucket/job/chunk-1.mp4',
      's3://bucket/job/chunk-2.mp4',
    ];
    const list = generateConcatFileList(chunkUrls);
    const lines = list.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("file 's3://bucket/job/chunk-0.mp4'");
    expect(lines[1]).toBe("file 's3://bucket/job/chunk-1.mp4'");
    expect(lines[2]).toBe("file 's3://bucket/job/chunk-2.mp4'");
  });

  it('handles empty chunk list', () => {
    const list = generateConcatFileList([]);
    expect(list).toBe('');
  });
});

describe('sendWebhook (BF-080)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the payload and resolves on success', async () => {
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendWebhook('https://example.com/webhook', { jobId: 'test' });
    expect(logMock).toHaveBeenCalledWith(
      'Webhook to https://example.com/webhook:',
      { jobId: 'test' }
    );
    expect(logMock).toHaveBeenCalledTimes(1);
    logMock.mockRestore();
  });

  it('retries on console error', async () => {
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('down');
    });

    await expect(sendWebhook('https://example.com/webhook', { jobId: 'test' }, 2)).rejects.toThrow();
    expect(logMock).toHaveBeenCalledTimes(2); // retries=2 means 2 attempts
    logMock.mockRestore();
  });

  it('respects custom retry count', async () => {
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('down');
    });

    await expect(sendWebhook('https://example.com/webhook', { jobId: 'test' }, 1)).rejects.toThrow();
    expect(logMock).toHaveBeenCalledTimes(1);
    logMock.mockRestore();
  });
});

describe('checkDrift / runDriftTest (BF-082)', () => {
  it('checkDrift reports no drift (mock result)', async () => {
    const result = await checkDrift('/tmp/test-output.mp4', 30);
    expect(result.hasDrift).toBe(false);
    expect(result.maxDriftMs).toBe(0);
    expect(result.driftedFrames).toEqual([]);
    expect(result.comparisons).toEqual([]);
  });

  it('runDriftTest returns a DriftCheckResult', async () => {
    const result = await runDriftTest('aws-lambda', {} as any, { format: 'mp4', codec: 'h264', preset: 'medium' } as any);
    expect(result).toMatchObject<DriftCheckResult>({
      hasDrift: false,
      maxDriftMs: 0,
      driftedFrames: [],
      comparisons: [],
    });
  });
});