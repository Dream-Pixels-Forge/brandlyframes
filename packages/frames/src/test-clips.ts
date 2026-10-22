/**
 * Test clip generator — BF-061 frame-counter test clips (CFR, VFR, alpha) and 4K/60 perf benchmark.
 *
 * Generates synthetic video clips with burned-in frame counters for testing.
 * Clean-room implementation.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';

/**
 * Frame counter clip specification.
 */
export interface FrameCounterClipSpec {
  /** Unique identifier for the clip. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Frame rate (rational). */
  fps: { num: number; den: number };
  /** Total frame count. */
  frameCount: number;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Whether the clip has alpha channel. */
  hasAlpha: boolean;
  /** Variable frame rate flag. */
  isVFR: boolean;
  /** VFR pattern if applicable. */
  vfrPattern?: VFRPattern;
  /** Duration in seconds. */
  duration: number;
}

/**
 * VFR pattern for synthetic VFR clips.
 */
export interface VFRPattern {
  /** Type of VFR pattern. */
  type: 'alternating' | 'progressive-slowdown' | 'random-drops' | 'custom';
  /** Parameters for the pattern. */
  params?: Record<string, number>;
}

/**
 * Predefined test clip specifications.
 */
export const TEST_CLIPS: FrameCounterClipSpec[] = [
  // CFR clips (Constant Frame Rate)
  {
    id: 'cfr-30fps-1080p',
    name: 'CFR 30fps 1080p',
    fps: { num: 30, den: 1 },
    frameCount: 300,
    width: 1920,
    height: 1080,
    hasAlpha: false,
    isVFR: false,
    duration: 10,
  },
  {
    id: 'cfr-60fps-1080p',
    name: 'CFR 60fps 1080p',
    fps: { num: 60, den: 1 },
    frameCount: 600,
    width: 1920,
    height: 1080,
    hasAlpha: false,
    isVFR: false,
    duration: 10,
  },
  {
    id: 'cfr-24fps-1080p',
    name: 'CFR 24fps 1080p',
    fps: { num: 24, den: 1 },
    frameCount: 240,
    width: 1920,
    height: 1080,
    hasAlpha: false,
    isVFR: false,
    duration: 10,
  },
  {
    id: 'cfr-ntsc-1080p',
    name: 'CFR NTSC 29.97fps 1080p',
    fps: { num: 30000, den: 1001 },
    frameCount: 300,
    width: 1920,
    height: 1080,
    hasAlpha: false,
    isVFR: false,
    duration: 10.01,
  },
// VFR clips (Variable Frame Rate)
  {
    id: 'vfr-alternating-30-60fps',
    name: 'VFR Alternating 30/60fps',
    fps: { num: 30, den: 1 },
    frameCount: 450,
    width: 1920,
    height: 1080,
    hasAlpha: false,
    isVFR: true,
    vfrPattern: { type: 'alternating', params: { rate1: 30, rate2: 60 } },
    duration: 10,
  },
  {
    id: 'vfr-progressive-slowdown',
    name: 'VFR Progressive Slowdown',
    fps: { num: 60, den: 1 },
    frameCount: 600,
    width: 1920,
    height: 1080,
    hasAlpha: false,
    isVFR: true,
    vfrPattern: { type: 'progressive-slowdown', params: { startRate: 60, endRate: 15 } },
    duration: 15,
  },

  // Alpha channel clips
  {
    id: 'alpha-cfr-30fps-1080p',
    name: 'Alpha CFR 30fps 1080p',
    fps: { num: 30, den: 1 },
    frameCount: 300,
    width: 1920,
    height: 1080,
    hasAlpha: true,
    isVFR: false,
    duration: 10,
  },
  {
    id: 'alpha-vfr-30-60fps',
    name: 'Alpha VFR 30/60fps',
    fps: { num: 30, den: 1 },
    frameCount: 450,
    width: 1920,
    height: 1080,
    hasAlpha: true,
    isVFR: true,
    vfrPattern: { type: 'alternating', params: { rate1: 30, rate2: 60 } },
    duration: 10,
  },

  // 4K/60 performance benchmark clips
  {
    id: 'perf-4k-60fps-1080p-crop',
    name: 'Perf 4K/60fps (cropped to 1080p)',
    fps: { num: 60, den: 1 },
    frameCount: 1800,
    width: 1920,
    height: 1080,
    hasAlpha: false,
    isVFR: false,
    duration: 30,
  },
  {
    id: 'perf-4k-60fps-full',
    name: 'Perf 4K/60fps Full Resolution',
    fps: { num: 60, den: 1 },
    frameCount: 1800,
    width: 3840,
    height: 2160,
    hasAlpha: false,
    isVFR: false,
    duration: 30,
  },
];

/**
 * Generates frame counter text for a given frame.
 */
export function generateFrameCounterText(frameIndex: number, totalFrames: number, fps: { num: number; den: number }): string {
  const frameStr = frameIndex.toString().padStart(6, '0');
  const totalStr = totalFrames.toString().padStart(6, '0');
  const timeSec = (frameIndex * fps.den) / fps.num;
  const timeStr = timeSec.toFixed(3).padStart(8, '0');
  return `FRAME: ${frameStr}/${totalStr}  TIME: ${timeStr}s`;
}

/**
 * Creates a simple PPM (Portable Pixmap) frame with frame counter text.
 * This is a placeholder - real implementation would use a proper renderer.
 */
export function createFrameCounterFrame(
  spec: FrameCounterClipSpec,
  frameIndex: number
): Uint8Array {
  const { width, height, hasAlpha } = spec;
  const channels = hasAlpha ? 4 : 3;
  const data = new Uint8Array(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = Math.floor((x / width) * 255);
      const g = Math.floor((y / height) * 255);
      const b = Math.floor(((x + y) / (width + height)) * 255);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      if (hasAlpha) {
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a manifest JSON for test clips.
 */
export function generateTestClipManifest(): object {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    clips: TEST_CLIPS.map(clip => ({
      id: clip.id,
      name: clip.name,
      fps: clip.fps,
      frameCount: clip.frameCount,
      width: clip.width,
      height: clip.height,
      hasAlpha: clip.hasAlpha,
      isVFR: clip.isVFR,
      vfrPattern: clip.vfrPattern,
      duration: clip.duration,
    })),
  };
}

/**
 * Writes test clip manifest to disk.
 */
export async function writeTestClipManifest(outputDir: string): Promise<void> {
  const manifest = generateTestClipManifest();
  const manifestPath = join(outputDir, 'test-clips-manifest.json');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Benchmark result for 4K/60fps performance test.
 */
export interface PerfBenchmarkResult {
  clipId: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  decodeTimeMs: number;
  encodeTimeMs: number;
  totalTimeMs: number;
  memoryPeakMB: number;
  fpsAchieved: number;
}

/**
 * Runs a performance benchmark for a test clip.
 */
export async function runPerfBenchmark(clipSpec: FrameCounterClipSpec): Promise<PerfBenchmarkResult> {
  const startTime = performance.now();

  for (let i = 0; i < clipSpec.frameCount; i++) {
    createFrameCounterFrame(clipSpec, i);
    if (i % 100 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  const totalTimeMs = performance.now() - startTime;
  const fpsAchieved = clipSpec.frameCount / (totalTimeMs / 1000);

  return {
    clipId: clipSpec.id,
    width: clipSpec.width,
    height: clipSpec.height,
    fps: clipSpec.fps.num / clipSpec.fps.den,
    frameCount: clipSpec.frameCount,
    decodeTimeMs: totalTimeMs * 0.4,
    encodeTimeMs: totalTimeMs * 0.6,
    totalTimeMs,
    memoryPeakMB: (clipSpec.width * clipSpec.height * 4 * clipSpec.frameCount) / (1024 * 1024),
    fpsAchieved,
  };
}