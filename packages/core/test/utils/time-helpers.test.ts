import { describe, expect, it } from 'vitest';
import { ms, sec, tc } from '../../src/utils';

describe('sec() (BF-401)', () => {
  it('converts seconds to frames at the given fps', () => {
    expect(sec(2, 30)).toBe(60);
    expect(sec(2.5, 30)).toBe(75);
    expect(sec(1, 60)).toBe(60);
  });

  it('rounds to the nearest frame — exact halves round up toward +Infinity', () => {
    // 0.5 frames at 30 fps
    expect(sec(0.5 / 30, 30)).toBe(1);
    // 1.4 frames at 30 fps -> 1
    expect(sec(1.4 / 30, 30)).toBe(1);
    // 1.6 frames at 30 fps -> 2
    expect(sec(1.6 / 30, 30)).toBe(2);
  });

  it('never rounds to -0', () => {
    expect(Object.is(sec(-0.4 / 30, 30), 0)).toBe(true);
  });

  it('handles fractional fps with nearest-frame rounding', () => {
    // 10 seconds at 29.97 fps = 299.7 -> 300
    expect(sec(10, 29.97)).toBe(300);
  });

  it('allows negative inputs (pure math, unclamped)', () => {
    expect(sec(-2, 30)).toBe(-60);
  });

  it('throws a helpful error on non-finite input or invalid fps', () => {
    expect(() => sec(Number.NaN, 30)).toThrowError(/sec/);
    expect(() => sec(Number.POSITIVE_INFINITY, 30)).toThrowError(/sec/);
    expect(() => sec(1, 0)).toThrowError(/fps/);
    expect(() => sec(1, -30)).toThrowError(/fps/);
  });
});

describe('ms() (BF-401)', () => {
  it('converts milliseconds to frames at the given fps', () => {
    expect(ms(400, 30)).toBe(12);
    expect(ms(1000, 30)).toBe(30);
    expect(ms(500, 60)).toBe(30);
  });

  it('rounds to the nearest frame — exact halves round up toward +Infinity', () => {
    expect(ms(500, 30)).toBe(15);
    expect(ms(499, 30)).toBe(15);
    expect(ms(483, 30)).toBe(14);
  });

  it('throws a helpful error on non-finite input or invalid fps', () => {
    expect(() => ms(Number.NaN, 30)).toThrowError(/ms/);
    expect(() => ms(100, 0)).toThrowError(/fps/);
  });
});

describe('tc() (BF-401)', () => {
  it('converts HH:MM:SS:FF timecode to frames at the given fps', () => {
    expect(tc('00:00:01:15', 30)).toBe(45);
    expect(tc('00:01:00:00', 30)).toBe(1800);
    expect(tc('01:00:00:00', 25)).toBe(90_000);
    expect(tc('00:00:00:00', 30)).toBe(0);
  });

  it('adds the frame field without multiplying it by fps', () => {
    // 1 second + 5 frames at 30 fps
    expect(tc('00:00:01:05', 30)).toBe(35);
  });

  it('rounds the seconds portion to the nearest frame for fractional fps', () => {
    // 10 seconds at 29.97 fps = 299.7 -> 300 frames, plus 0 frame field
    expect(tc('00:00:10:00', 29.97)).toBe(300);
  });

  it('accepts single-digit hour fields and allows hours above 23', () => {
    expect(tc('1:00:00:00', 30)).toBe(108_000);
    expect(tc('24:00:00:00', 30)).toBe(2_592_000);
  });

  it('rejects malformed timecodes with a helpful error', () => {
    expect(() => tc('00:00:01', 30)).toThrowError(/tc/);
    expect(() => tc('00:00:01:15:30', 30)).toThrowError(/tc/);
    expect(() => tc('00:00:60:00', 30)).toThrowError(/tc/);
    expect(() => tc('-1:00:00:00', 30)).toThrowError(/tc/);
    expect(() => tc('00:00:01:aa', 30)).toThrowError(/tc/);
  });

  it('rejects a frame field outside [0, fps) with a helpful error', () => {
    expect(() => tc('00:00:00:30', 30)).toThrowError(/frame field/);
    expect(() => tc('00:00:00:29', 30)).not.toThrow();
    // Fractional fps: the frame field must stay below floor(fps).
    expect(() => tc('00:00:00:30', 29.97)).toThrowError(/frame field/);
    expect(() => tc('00:00:00:29', 29.97)).not.toThrow();
  });

  it('throws a helpful error on invalid fps', () => {
    expect(() => tc('00:00:01:00', 0)).toThrowError(/fps/);
  });
});
