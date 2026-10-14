import { describe, expect, it } from 'vitest';
import type { VideoConfig } from '../../src/context/frame-context';
import {
  validateFrame,
  validateLayout,
  validatePositiveInteger,
  validateVideoConfig,
} from '../../src/timing/validate-frame-inputs';

const validConfig: VideoConfig = { fps: 30, width: 1080, height: 1920, durationInFrames: 120 };

describe('validateFrame', () => {
  it('accepts any integer, including zero and negative frames', () => {
    expect(() => validateFrame(0, 'frame')).not.toThrow();
    expect(() => validateFrame(-30, 'frame')).not.toThrow();
    expect(() => validateFrame(9000, 'frame')).not.toThrow();
  });

  it('rejects fractional frames and names the offending value', () => {
    expect(() => validateFrame(1.5, '<Sequence> from')).toThrow(/<Sequence> from must be an integer, but got 1\.5/);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => validateFrame(Number.NaN, 'frame')).toThrow(/must be an integer/);
    expect(() => validateFrame(Number.POSITIVE_INFINITY, 'frame')).toThrow(/must be an integer/);
  });

  it('rejects non-number values at runtime', () => {
    expect(() => validateFrame('3' as unknown as number, 'frame')).toThrow(/must be an integer/);
  });
});

describe('validatePositiveInteger', () => {
  it('accepts positive integers', () => {
    expect(() => validatePositiveInteger(1, 'durationInFrames')).not.toThrow();
    expect(() => validatePositiveInteger(120, 'durationInFrames')).not.toThrow();
  });

  it('rejects zero and negatives with the given description', () => {
    expect(() => validatePositiveInteger(0, '<Loop> times')).toThrow(/<Loop> times must be a positive integer, but got 0/);
    expect(() => validatePositiveInteger(-3, 'durationInFrames')).toThrow(/must be a positive integer/);
  });

  it('rejects fractional, NaN and infinite values', () => {
    expect(() => validatePositiveInteger(1.5, 'x')).toThrow(/must be a positive integer/);
    expect(() => validatePositiveInteger(Number.NaN, 'x')).toThrow(/must be a positive integer/);
    expect(() => validatePositiveInteger(Number.POSITIVE_INFINITY, 'x')).toThrow(/must be a positive integer/);
  });
});

describe('validateLayout', () => {
  it('accepts absolute-fill and none', () => {
    expect(() => validateLayout('absolute-fill', '<Sequence>')).not.toThrow();
    expect(() => validateLayout('none', '<Sequence>')).not.toThrow();
  });

  it('rejects unknown layouts', () => {
    expect(() => validateLayout('flex', '<Sequence>')).toThrow(
      /<Sequence> layout must be either 'absolute-fill' or 'none'/,
    );
  });
});

describe('validateVideoConfig', () => {
  it('accepts a valid config (fractional fps allowed)', () => {
    expect(() => validateVideoConfig(validConfig)).not.toThrow();
    expect(() => validateVideoConfig({ ...validConfig, fps: 29.97 })).not.toThrow();
  });

  it('rejects a non-positive or non-finite fps', () => {
    expect(() => validateVideoConfig({ ...validConfig, fps: 0 })).toThrow(/fps must be a positive number/);
    expect(() => validateVideoConfig({ ...validConfig, fps: -30 })).toThrow(/fps must be a positive number/);
    expect(() => validateVideoConfig({ ...validConfig, fps: Number.NaN })).toThrow(/fps must be a positive number/);
  });

  it('rejects non-positive-integer width, height and durationInFrames', () => {
    expect(() => validateVideoConfig({ ...validConfig, width: 0 })).toThrow(/width must be a positive integer/);
    expect(() => validateVideoConfig({ ...validConfig, width: 10.5 })).toThrow(/width must be a positive integer/);
    expect(() => validateVideoConfig({ ...validConfig, height: 0 })).toThrow(/height must be a positive integer/);
    expect(() =>
      validateVideoConfig({ ...validConfig, durationInFrames: 0 }),
    ).toThrow(/durationInFrames must be a positive integer/);
  });

  it('rejects a non-object config at runtime', () => {
    expect(() => validateVideoConfig(undefined as unknown as VideoConfig)).toThrow(/Invalid video config/);
  });
});
