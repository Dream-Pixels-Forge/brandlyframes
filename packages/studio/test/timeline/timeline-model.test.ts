/**
 * BF-120 visual timeline — pure model: frame↔pixel math, clip move/trim
 * reducers, and HH:MM:SS:FF timecode formatting. The reducers are the single
 * source of truth the TimelinePanel drag/trim handlers call into, so the
 * clamping rules are tested here, not in the DOM.
 */
import { describe, expect, it } from 'vitest';
import {
  clamp,
  formatTimecode,
  frameToPx,
  moveClip,
  pxPerFrame,
  pxToFrame,
  trimClipEnd,
  trimClipStart,
  type TimelineClip,
} from '../../src/timeline/timeline-model';

const clip = (from: number, durationInFrames: number): TimelineClip => ({
  id: 'clip-1',
  label: 'Intro',
  from,
  durationInFrames,
});

describe('timeline model (BF-120)', () => {
  it('maps frames to pixels and back at a stable scale', () => {
    expect(pxPerFrame(800, 200)).toBe(4);
    expect(frameToPx(25, 4)).toBe(100);
    expect(pxToFrame(100, 4)).toBe(25);
    expect(pxToFrame(101, 4)).toBe(25); // rounds to nearest frame
  });

  it('clamps numbers into range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-2, 0, 3)).toBe(0);
    expect(clamp(1, 0, 3)).toBe(1);
  });

  it('moves a clip and keeps it inside the composition', () => {
    const moved = moveClip(clip(10, 40), 30, 100);
    expect(moved.from).toBe(40);
    expect(moved.durationInFrames).toBe(40);

    const atEnd = moveClip(clip(10, 40), 500, 100);
    expect(atEnd.from).toBe(60); // 100 - 40

    const atStart = moveClip(clip(10, 40), -500, 100);
    expect(atStart.from).toBe(0);
  });

  it('trims the start handle without shrinking below one frame', () => {
    const trimmed = trimClipStart(clip(20, 40), -10);
    expect(trimmed.from).toBe(10);
    expect(trimmed.durationInFrames).toBe(50);

    // dragging the start handle past the end collapses to a 1-frame clip
    const collapsed = trimClipStart(clip(20, 40), 100);
    expect(collapsed.from).toBe(59);
    expect(collapsed.durationInFrames).toBe(1);

    // never before frame 0
    const atZero = trimClipStart(clip(5, 40), -100);
    expect(atZero.from).toBe(0);
    expect(atZero.durationInFrames).toBe(45);
  });

  it('trims the end handle within composition bounds', () => {
    const extended = trimClipEnd(clip(20, 40), 30, 200);
    expect(extended.from).toBe(20);
    expect(extended.durationInFrames).toBe(70);

    const capped = trimClipEnd(clip(50, 40), 500, 100);
    expect(capped.durationInFrames).toBe(50); // composition end

    const shrunk = trimClipEnd(clip(20, 40), -100, 200);
    expect(shrunk.durationInFrames).toBe(1);
  });

  it('formats SMPTE timecode HH:MM:SS:FF', () => {
    expect(formatTimecode(0, 30)).toBe('00:00:00:00');
    expect(formatTimecode(42, 30)).toBe('00:00:01:12');
    expect(formatTimecode(30 * 60, 30)).toBe('00:01:00:00');
    expect(formatTimecode(30 * 3600 + 5, 30)).toBe('01:00:00:05');
  });
});
