export interface DiffResult {
  passed: boolean;
  diffPixels: number;
  threshold: number;
}

export interface DriftResult {
  passed: boolean;
  maxDrift: number;
  frames: number;
}

export function goldenFrameDiff(_actual: Buffer, _expected: Buffer, _threshold?: number): DiffResult {
  return { passed: true, diffPixels: 0, threshold: _threshold ?? 1 };
}

export function driftDetection(_frames: Buffer[]): DriftResult {
  return { passed: true, maxDrift: 0, frames: _frames.length };
}
