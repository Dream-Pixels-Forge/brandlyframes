/**
 * BF-120 visual timeline — pure timeline model shared by the TimelinePanel
 * UI and the AST write-back (BF-122): clips, markers, frame↔pixel math and
 * the drag/trim reducers. No React, no DOM — deterministic and testable.
 *
 * A clip mirrors a user `<Sequence from={from} durationInFrames={d}>`; the
 * reducers keep clips inside the composition (`from + durationInFrames` never
 * exceeds the composition duration, duration never drops below one frame).
 */

export interface TimelineClip {
  /** Stable id (the AST parse assigns `clip-N` in source order). */
  readonly id: string;
  /** Human label (derived from the first child element tag or `clip-N`). */
  readonly label: string;
  /** Sequence `from` (absolute composition frame, ≥ 0 in the timeline UI). */
  readonly from: number;
  /** Sequence `durationInFrames` (≥ 1). */
  readonly durationInFrames: number;
}

export interface TimelineMarker {
  readonly id: string;
  /** Absolute composition frame. */
  readonly frame: number;
  readonly label: string;
}

/** Partial clip update emitted by drag/trim interactions. */
export interface TimelineClipPatch {
  readonly from?: number;
  readonly durationInFrames?: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Pixels per frame for a timeline of `durationInFrames` frames across `widthPx`. */
export const pxPerFrame = (widthPx: number, durationInFrames: number): number =>
  durationInFrames > 0 ? widthPx / durationInFrames : 0;

export const frameToPx = (frame: number, pxf: number): number => frame * pxf;

export const pxToFrame = (px: number, pxf: number): number =>
  pxf > 0 ? Math.round(px / pxf) : 0;

/**
 * Move a clip by `deltaFrames`, clamped so it stays inside
 * `[0, durationInFrames]` of the composition.
 */
export const moveClip = (
  clip: TimelineClip,
  deltaFrames: number,
  durationInFrames: number,
): TimelineClip => ({
  ...clip,
  from: clamp(clip.from + deltaFrames, 0, Math.max(0, durationInFrames - clip.durationInFrames)),
});

/**
 * Drag the start (left) trim handle: moves `from` and keeps the end edge
 * fixed; the clip never shrinks below one frame or starts before frame 0.
 * (The composition duration is irrelevant here — the end edge cannot move.)
 */
export const trimClipStart = (clip: TimelineClip, deltaFrames: number): TimelineClip => {
  const end = clip.from + clip.durationInFrames;
  const from = clamp(clip.from + deltaFrames, 0, Math.max(0, end - 1));
  return { ...clip, from, durationInFrames: end - from };
};

/**
 * Drag the end (right) trim handle: keeps `from` fixed, clamps the clip
 * inside the composition and never below one frame.
 */
export const trimClipEnd = (
  clip: TimelineClip,
  deltaFrames: number,
  durationInFrames: number,
): TimelineClip => ({
  ...clip,
  durationInFrames: clamp(
    clip.durationInFrames + deltaFrames,
    1,
    Math.max(1, durationInFrames - clip.from),
  ),
});

/** SMPTE-style `HH:MM:SS:FF` for a composition frame (DESIGN.md §4). */
export const formatTimecode = (frame: number, fps: number): string => {
  const f = Math.max(0, Math.floor(frame));
  const ff = f % fps;
  const totalSeconds = Math.floor(f / fps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
};
