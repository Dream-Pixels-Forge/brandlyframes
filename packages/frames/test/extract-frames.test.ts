/**
 * extractFrames API tests — [BF-060]
 */

import { describe, it, expect, vi } from 'vitest';
import { extractFrames, extractFramesToDisk } from '../src/extract-frames';

// Mock the frame store
vi.mock('../src/frame-store', () => ({
  deriveFrameKey: vi.fn((sourceHash, frameIndex) => `src=${sourceHash}|frame=${frameIndex}`),
  FrameStore: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    size: 0,
    clear: vi.fn(),
  })),
}));

describe('extractFrames API', () => {
  const mockSourceHash = 'sha256-abc123';
  const mockFrameCount = 100;
  const mockWidth = 1920;
  const mockHeight = 1080;

  it('extracts frames from a video source', async () => {
    // This test will fail until implementation exists
    const frames = await extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 10,
    });

    expect(frames).toBeDefined();
    expect(Array.isArray(frames)).toBe(true);
    expect(frames.length).toBe(11); // 0-10 inclusive
  });

  it('extracts a single frame', async () => {
    const frames = await extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 42,
      endFrame: 42,
    });

    expect(frames.length).toBe(1);
    expect(frames[0].frameIndex).toBe(42);
  });

  it('respects trim window (startFrame, endFrame)', async () => {
    const frames = await extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 10,
      endFrame: 20,
    });

    expect(frames.length).toBe(11); // 10-20 inclusive
    expect(frames[0].frameIndex).toBe(10);
    expect(frames[10].frameIndex).toBe(20);
  });

  it('applies playbackRate for frame skipping/repeating', async () => {
    const frames = await extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 10,
      playbackRate: 2, // every other frame
    });

    expect(frames.length).toBe(6); // 0, 2, 4, 6, 8, 10
    expect(frames.map(f => f.frameIndex)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('returns frame data with correct structure', async () => {
    const frames = await extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 2,
    });

    expect(frames[0]).toMatchObject({
      frameIndex: expect.any(Number),
      width: mockWidth,
      height: mockHeight,
      data: expect.any(Uint8Array), // RGBA pixel data
    });
  });

  it('throws on invalid frame range', async () => {
    await expect(extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: -1,
      endFrame: 10,
    })).rejects.toThrow('startFrame must be a non-negative integer');

    await expect(extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 10,
      endFrame: 5,
    })).rejects.toThrow('endFrame (5) must be >= startFrame (10)');
  });

  it('throws when frame range exceeds source', async () => {
    await expect(extractFrames({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 150, // exceeds frameCount
    })).rejects.toThrow('endFrame (150) exceeds source frame count (100)');
  });
});

describe('extractFramesToDisk API', () => {
  const mockSourceHash = 'sha256-abc123';
  const mockFrameCount = 100;
  const mockWidth = 1920;
  const mockHeight = 1080;

  it('extracts frames and writes to disk', async () => {
    const result = await extractFramesToDisk({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 5,
      outputDir: '/tmp/extract-test',
      format: 'png',
    });

    expect(result).toMatchObject({
      extractedCount: 6,
      outputDir: '/tmp/extract-test',
      files: expect.arrayContaining([
        expect.stringMatching(/frame-00000\.png$/),
        expect.stringMatching(/frame-00005\.png$/),
      ]),
    });
  });

  it('supports different output formats', async () => {
    const resultPng = await extractFramesToDisk({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 0,
      outputDir: '/tmp/test-png',
      format: 'png',
    });
    expect(resultPng.files[0]).toMatch(/\.png$/);

    const resultJpg = await extractFramesToDisk({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 0,
      outputDir: '/tmp/test-jpg',
      format: 'jpg',
    });
    expect(resultJpg.files[0]).toMatch(/\.jpeg$/);

    const resultWebp = await extractFramesToDisk({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 0,
      outputDir: '/tmp/test-webp',
      format: 'webp',
    });
    expect(resultWebp.files[0]).toMatch(/\.webp$/);
  });

  it('creates output directory if it does not exist', async () => {
    const result = await extractFramesToDisk({
      sourceHash: mockSourceHash,
      frameCount: mockFrameCount,
      width: mockWidth,
      height: mockHeight,
      startFrame: 0,
      endFrame: 1,
      outputDir: '/tmp/new-nested/dir',
      format: 'png',
    });

    expect(result.outputDir).toBe('/tmp/new-nested/dir');
  });
});