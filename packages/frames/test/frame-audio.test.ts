/**
 * FrameAudio tests — slicing + pitch-preserve [BF-059]
 */

import { describe, it, expect } from 'vitest';
import { mapFrameAudioIndex, FrameAudio } from '../src/frame-audio';

describe('mapFrameAudioIndex — pure audio frame mapping', () => {
  // Basic identity mapping (no options)
  it('maps frame n to source frame n when no options provided', () => {
    expect(mapFrameAudioIndex(0, 100)).toBe(0);
    expect(mapFrameAudioIndex(50, 100)).toBe(50);
    expect(mapFrameAudioIndex(99, 100)).toBe(99);
  });

  // Trim window [from, to)
  it('respects trim window [from, to)', () => {
    // Window [10, 50) → length 40
    expect(mapFrameAudioIndex(0, 100, { trim: [10, 50] })).toBe(10);
    expect(mapFrameAudioIndex(10, 100, { trim: [10, 50] })).toBe(20);
    expect(mapFrameAudioIndex(39, 100, { trim: [10, 50] })).toBe(49);
    // Clamps at window end (never blank frame)
    expect(mapFrameAudioIndex(40, 100, { trim: [10, 50] })).toBe(49);
    expect(mapFrameAudioIndex(100, 100, { trim: [10, 50] })).toBe(49);
  });

  // Playback rate (speed multiplier)
  it('applies playbackRate correctly', () => {
    // 2x speed → every other frame
    expect(mapFrameAudioIndex(0, 100, { playbackRate: 2 })).toBe(0);
    expect(mapFrameAudioIndex(1, 100, { playbackRate: 2 })).toBe(2);
    expect(mapFrameAudioIndex(49, 100, { playbackRate: 2 })).toBe(98);
    expect(mapFrameAudioIndex(50, 100, { playbackRate: 2 })).toBe(99); // clamped

    // 0.5x speed → repeat each frame twice
    expect(mapFrameAudioIndex(0, 100, { playbackRate: 0.5 })).toBe(0);
    expect(mapFrameAudioIndex(1, 100, { playbackRate: 0.5 })).toBe(0);
    expect(mapFrameAudioIndex(2, 100, { playbackRate: 0.5 })).toBe(1);
    expect(mapFrameAudioIndex(3, 100, { playbackRate: 0.5 })).toBe(1);

    // Fractional rate
    expect(mapFrameAudioIndex(0, 100, { playbackRate: 1.5 })).toBe(0);
    expect(mapFrameAudioIndex(1, 100, { playbackRate: 1.5 })).toBe(1);
    expect(mapFrameAudioIndex(2, 100, { playbackRate: 1.5 })).toBe(3);
  });

  // Reverse playback
  it('reverses playback when reverse=true', () => {
    expect(mapFrameAudioIndex(0, 100, { reverse: true })).toBe(99);
    expect(mapFrameAudioIndex(50, 100, { reverse: true })).toBe(49);
    expect(mapFrameAudioIndex(99, 100, { reverse: true })).toBe(0);
  });

  // Freeze single frame
  it('freezes on a single frame when freeze is set', () => {
    expect(mapFrameAudioIndex(0, 100, { freeze: 42 })).toBe(42);
    expect(mapFrameAudioIndex(50, 100, { freeze: 42 })).toBe(42);
    expect(mapFrameAudioIndex(99, 100, { freeze: 42 })).toBe(42);

    // Freeze clamped to valid range
    expect(mapFrameAudioIndex(0, 100, { freeze: -5 })).toBe(0);
    expect(mapFrameAudioIndex(0, 100, { freeze: 150 })).toBe(99);
  });

  // Ping-pong (bounce back and forth)
  it('ping-pongs across the window when pingPong=true', () => {
    // Use trim [0, 10) to get a 10-frame window (indices 0-9)
    // Cycle = 2 * (10 - 1) = 18
    expect(mapFrameAudioIndex(0, 100, { trim: [0, 10], pingPong: true })).toBe(0);
    expect(mapFrameAudioIndex(1, 100, { trim: [0, 10], pingPong: true })).toBe(1);
    expect(mapFrameAudioIndex(8, 100, { trim: [0, 10], pingPong: true })).toBe(8);
    expect(mapFrameAudioIndex(9, 100, { trim: [0, 10], pingPong: true })).toBe(9);
    expect(mapFrameAudioIndex(10, 100, { trim: [0, 10], pingPong: true })).toBe(8);
    expect(mapFrameAudioIndex(11, 100, { trim: [0, 10], pingPong: true })).toBe(7);
    expect(mapFrameAudioIndex(18, 100, { trim: [0, 10], pingPong: true })).toBe(0);
    expect(mapFrameAudioIndex(19, 100, { trim: [0, 10], pingPong: true })).toBe(1);
  });

  // Ping-pong with trim
  it('ping-pongs within trim window', () => {
    // Trim [10, 20) → window length 10, indices 10-19
    expect(mapFrameAudioIndex(0, 100, { trim: [10, 20], pingPong: true })).toBe(10);
    expect(mapFrameAudioIndex(9, 100, { trim: [10, 20], pingPong: true })).toBe(19);
    expect(mapFrameAudioIndex(10, 100, { trim: [10, 20], pingPong: true })).toBe(18);
    expect(mapFrameAudioIndex(18, 100, { trim: [10, 20], pingPong: true })).toBe(10);
  });

  // Ping-pong ignores reverse
  it('ignores reverse when pingPong=true', () => {
    expect(mapFrameAudioIndex(0, 100, { reverse: true, pingPong: true })).toBe(0);
    expect(mapFrameAudioIndex(1, 100, { reverse: true, pingPong: true })).toBe(1);
  });

  // Validation errors
  it('throws on invalid n', () => {
    expect(() => mapFrameAudioIndex(-1, 100)).toThrow('n must be a non-negative integer');
    expect(() => mapFrameAudioIndex(1.5, 100)).toThrow('n must be a non-negative integer');
  });

  it('throws on invalid length', () => {
    expect(() => mapFrameAudioIndex(0, 0)).toThrow('length must be a positive integer');
    expect(() => mapFrameAudioIndex(0, -5)).toThrow('length must be a positive integer');
  });

  it('throws on invalid trim', () => {
    // from > to triggers empty window check first
    expect(() => mapFrameAudioIndex(0, 100, { trim: [10, 5] })).toThrow('trim window [10, 5) intersected with [0, 100) is empty');
    // Negative from triggers integer validation
    expect(() => mapFrameAudioIndex(0, 100, { trim: [-1, 10] })).toThrow('trim must be integers with 0 <= from < to');
    // Non-integer trim
    expect(() => mapFrameAudioIndex(0, 100, { trim: [10.5, 20] })).toThrow('trim must be integers');
  });

  it('throws on invalid playbackRate', () => {
    expect(() => mapFrameAudioIndex(0, 100, { playbackRate: 0 })).toThrow('playbackRate must be a finite number > 0');
    expect(() => mapFrameAudioIndex(0, 100, { playbackRate: -1 })).toThrow('playbackRate must be a finite number > 0');
    expect(() => mapFrameAudioIndex(0, 100, { playbackRate: NaN })).toThrow('playbackRate must be a finite number > 0');
    expect(() => mapFrameAudioIndex(0, 100, { playbackRate: Infinity })).toThrow('playbackRate must be a finite number > 0');
  });

  it('throws on invalid freeze (non-integer)', () => {
    // Non-integer freeze should still throw
    expect(() => mapFrameAudioIndex(0, 100, { freeze: 1.5 })).toThrow('freeze must be null or a non-negative integer');
  });

  it('clamps freeze to valid window range', () => {
    // Negative freeze clamped to window start
    expect(mapFrameAudioIndex(0, 100, { freeze: -5 })).toBe(0);
    // Freeze beyond window end clamped to window end
    expect(mapFrameAudioIndex(0, 100, { freeze: 150 })).toBe(99);
    // With trim window [10, 50), freeze -5 clamped to 10, freeze 100 clamped to 49
    expect(mapFrameAudioIndex(0, 100, { trim: [10, 50], freeze: -5 })).toBe(10);
    expect(mapFrameAudioIndex(0, 100, { trim: [10, 50], freeze: 100 })).toBe(49);
  });

  it('throws on empty trim window', () => {
    // from > to creates empty window
    expect(() => mapFrameAudioIndex(0, 100, { trim: [50, 30] })).toThrow('trim window [50, 30) intersected with [0, 100) is empty');
    // trim window [10, 20) intersected with [0, 5) is empty
    expect(() => mapFrameAudioIndex(0, 5, { trim: [10, 20] })).toThrow('trim window [10, 20) intersected with [0, 5) is empty');
  });
});

describe('FrameAudio — React component', () => {
  it('exports FrameAudio component', () => {
    expect(FrameAudio).toBeDefined();
    expect(typeof FrameAudio).toBe('function');
  });
});