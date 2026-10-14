import { describe, expect, it } from 'vitest';
import { spring } from '../../src/animation/spring';

describe('spring — basic trajectory', () => {
  it('starts exactly at `from` on frame 0', () => {
    expect(spring({ frame: 0, fps: 30, from: 0.5, to: 2 })).toBe(0.5);
    expect(spring({ frame: 0, fps: 30 })).toBe(0);
  });

  it('defaults to from = 0, to = 1', () => {
    expect(spring({ frame: 10, fps: 30 })).toBeCloseTo(1.128602, 5);
  });

  it('is physics-based: overshoots the target with default (underdamped) config', () => {
    expect(spring({ frame: 10, fps: 30 })).toBeGreaterThan(1);
  });

  it('converges to `to` for large frames', () => {
    expect(spring({ frame: 300, fps: 30 })).toBeCloseTo(1, 5);
  });

  it('matches the reference integrator for a custom config (golden)', () => {
    expect(
      spring({ frame: 42, fps: 30, config: { damping: 12, mass: 1.5, stiffness: 80 }, from: 10, to: 40 }),
    ).toBeCloseTo(40.027336576138, 9);
  });

  it('animates in reverse (from > to) and undershoots below the target', () => {
    expect(spring({ frame: 12, fps: 30, from: 1, to: 0 })).toBeCloseTo(-0.095117, 5);
    expect(spring({ frame: 300, fps: 30, from: 1, to: 0 })).toBeCloseTo(0, 5);
  });

  it('is constant when from === to', () => {
    expect(spring({ frame: 10, fps: 30, from: 5, to: 5 })).toBe(5);
    expect(spring({ frame: 10, fps: 30, from: 5, to: 5, durationInFrames: 10 })).toBe(5);
  });

  it('responds to fps: 60fps reaches the same target with a longer natural duration', () => {
    expect(spring({ frame: 0, fps: 60 })).toBe(0);
    expect(spring({ frame: 600, fps: 60 })).toBeCloseTo(1, 5);
  });
});

describe('spring — overshootClamping', () => {
  it('never exceeds the [from, to] interval (ascending case)', () => {
    for (let frame = 0; frame <= 300; frame++) {
      const value = spring({ frame, fps: 30, config: { overshootClamping: true } });
      expect(value).toBeLessThanOrEqual(1);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('never leaves the [to, from] interval (descending case)', () => {
    for (let frame = 0; frame <= 300; frame++) {
      const value = spring({ frame, fps: 30, from: 1, to: 0, config: { overshootClamping: true } });
      expect(value).toBeLessThanOrEqual(1);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('rests exactly at the target once clamped', () => {
    expect(spring({ frame: 300, fps: 30, config: { overshootClamping: true } })).toBeCloseTo(1, 8);
  });
});

describe('spring — determinism', () => {
  it('produces identical outputs for identical inputs across calls', () => {
    const args = {
      frame: 42,
      fps: 30,
      config: { damping: 12, mass: 1.5, stiffness: 80 },
      from: 10,
      to: 40,
    };
    const first = spring(args);
    const second = spring(args);
    expect(second).toBe(first);
    expect(Object.is(second, first)).toBe(true);
  });

  it('is a pure function of the frame: trajectory is reproducible', () => {
    for (let frame = 0; frame <= 90; frame++) {
      const first = spring({ frame, fps: 30, config: { damping: 14, mass: 0.8, stiffness: 120 } });
      const second = spring({ frame, fps: 30, config: { damping: 14, mass: 0.8, stiffness: 120 } });
      expect(Object.is(second, first)).toBe(true);
    }
  });

  it('with durationInFrames is also deterministic', () => {
    const args = { frame: 30, fps: 30, durationInFrames: 30 };
    expect(spring(args)).toBe(spring(args));
  });
});

describe('spring — durationInFrames', () => {
  it('reaches the target at the requested duration (compressed to D=30)', () => {
    expect(spring({ frame: 30, fps: 30, durationInFrames: 30 })).toBeLessThanOrEqual(1.01);
    expect(Math.abs(spring({ frame: 30, fps: 30, durationInFrames: 30 }) - 1)).toBeLessThanOrEqual(0.01);
  });

  it('reaches the target when the duration stretches the natural spring (D=90)', () => {
    expect(Math.abs(spring({ frame: 90, fps: 30, durationInFrames: 90 }) - 1)).toBeLessThanOrEqual(0.01);
  });

  it('reaches the target when the duration shortens the natural spring (D=20)', () => {
    expect(Math.abs(spring({ frame: 20, fps: 30, durationInFrames: 20 }) - 1)).toBeLessThanOrEqual(0.01);
  });

  it('derives the config for custom from/to values', () => {
    const value = spring({
      frame: 30,
      fps: 30,
      config: { damping: 12, mass: 1.5, stiffness: 80 },
      from: 10,
      to: 40,
      durationInFrames: 30,
    });
    expect(value).toBeGreaterThanOrEqual(10);
    expect(Math.abs(value - 40)).toBeLessThanOrEqual(0.01 * 30);
  });

  it('still starts exactly at `from` on frame 0', () => {
    expect(spring({ frame: 0, fps: 30, durationInFrames: 45 })).toBe(0);
    expect(spring({ frame: 0, fps: 30, from: 3, to: 9, durationInFrames: 45 })).toBe(3);
  });

  it('works at 60fps', () => {
    expect(Math.abs(spring({ frame: 60, fps: 60, durationInFrames: 60 }) - 1)).toBeLessThanOrEqual(0.01);
  });

  it('reaches the target with overshootClamping enabled', () => {
    expect(Math.abs(spring({ frame: 30, fps: 30, config: { overshootClamping: true }, durationInFrames: 30 }) - 1)).toBeLessThanOrEqual(0.01);
  });
});

describe('spring — validation', () => {
  it('throws for invalid fps', () => {
    expect(() => spring({ frame: 10, fps: 0 })).toThrow(/fps/);
    expect(() => spring({ frame: 10, fps: -30 })).toThrow(/fps/);
    expect(() => spring({ frame: 10, fps: NaN })).toThrow(/fps/);
    expect(() => spring({ frame: 10, fps: Infinity })).toThrow(/fps/);
  });

  it('throws for invalid frames', () => {
    expect(() => spring({ frame: -1, fps: 30 })).toThrow(/frame/);
    expect(() => spring({ frame: 1.5, fps: 30 })).toThrow(/frame/);
    expect(() => spring({ frame: NaN, fps: 30 })).toThrow(/frame/);
    expect(() => spring({ frame: '10' as unknown as number, fps: 30 })).toThrow(/frame/);
    expect(() => spring({ frame: null as unknown as number, fps: 30 })).toThrow(/frame/);
  });

  it('throws for invalid config values', () => {
    expect(() => spring({ frame: 10, fps: 30, config: { mass: 0 } })).toThrow(/mass/);
    expect(() => spring({ frame: 10, fps: 30, config: { mass: -1 } })).toThrow(/mass/);
    expect(() => spring({ frame: 10, fps: 30, config: { stiffness: 0 } })).toThrow(/stiffness/);
    expect(() => spring({ frame: 10, fps: 30, config: { damping: -1 } })).toThrow(/damping/);
  });

  it('throws for non-finite from/to', () => {
    expect(() => spring({ frame: 10, fps: 30, from: Infinity })).toThrow(/from/);
    expect(() => spring({ frame: 10, fps: 30, to: NaN })).toThrow(/to/);
  });

  it('throws for invalid durationInFrames', () => {
    expect(() => spring({ frame: 10, fps: 30, durationInFrames: 0 })).toThrow(/durationInFrames/);
    expect(() => spring({ frame: 10, fps: 30, durationInFrames: -5 })).toThrow(/durationInFrames/);
    expect(() => spring({ frame: 10, fps: 30, durationInFrames: 2.5 })).toThrow(/durationInFrames/);
  });

  it('throws when the spring can never settle for the duration derivation', () => {
    expect(() =>
      spring({ frame: 0, fps: 30, config: { damping: 1e15, stiffness: 1 }, durationInFrames: 30 }),
    ).toThrow(/settle/);
  });
});
