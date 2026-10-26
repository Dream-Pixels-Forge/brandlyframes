/**
 * BF-121 keyframe editor — pure keyframe model shared by the
 * KeyframePanel UI and the AST write-back (BF-122). No React, no DOM.
 *
 * A property keyframe track maps a clip's local progress (0..1) to a value.
 * Easing kinds: 'linear', 'bezier' (cubic bezier control points), 'spring'
 * (damped harmonic oscillator config). All pure and deterministic.
 */

import { spring, type SpringConfig } from 'brandlyframes';

/** Easing kind for a keyframe segment. */
export type EasingKind = 'linear' | 'bezier' | 'spring';

/** A single keyframe on a property track. */
export interface Keyframe {
  readonly id: string;
  /** Progress within the clip, 0..1. */
  readonly t: number;
  /** Property value at this keyframe (number). */
  readonly value: number;
  /** Easing to use from this keyframe to the next. */
  readonly easing: EasingKind;
  /** Cubic bezier control points [x1,y1,x2,y2]. Only for easing='bezier'. */
  readonly bezier?: [number, number, number, number];
  /** Spring config. Only for easing='spring'. */
  readonly springConfig?: SpringConfig;
}

/** A keyframe track for a single numeric property on a clip. */
export interface KeyframeTrack {
  readonly clipId: string;
  readonly property: string;
  readonly frames: readonly Keyframe[];
}

/**
 * Evaluate a cubic-bezier easing function at progress t.
 * Newton-Raphson (4 iterations) — accurate enough for UI preview.
 */
export function bezierEasing([x1, y1, x2, y2]: [number, number, number, number]): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (u: number): number => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number): number => ((ay * u + by) * u + cy) * u;
  const sampleDX = (u: number): number => (3 * ax * u + 2 * bx) * u + cx;

  const solveU = (x: number): number => {
    let u = x;
    for (let i = 0; i < 4; i++) {
      const err = sampleX(u) - x;
      const dx = sampleDX(u);
      if (Math.abs(dx) < 1e-7) break;
      u -= err / dx;
    }
    return Math.min(1, Math.max(0, u));
  };

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solveU(t));
  };
}

/** Evaluate a keyframe track at progress p (0..1) → interpolated value. */
export function sampleKeyframeTrack(track: KeyframeTrack, p: number): number {
  const { frames } = track;
  if (frames.length === 0) return 0;
  if (p <= frames[0].t) return frames[0].value;
  const last = frames[frames.length - 1];
  if (p >= last.t) return last.value;

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (p >= a.t && p <= b.t) {
      const local = b.t > a.t ? (p - a.t) / (b.t - a.t) : 0;
      let eased: number;
      switch (a.easing) {
        case 'bezier':
          eased = a.bezier ? bezierEasing(a.bezier)(local) : local;
          break;
        case 'spring': {
          const cfg = a.springConfig ?? {};
          const segFrames = Math.max(1, Math.round((b.t - a.t) * 30));
          eased = spring({
            frame: Math.round(local * segFrames),
            fps: 30,
            from: 0,
            to: 1,
            config: cfg,
            durationInFrames: segFrames,
          });
          break;
        }
        case 'linear':
        default:
          eased = local;
          break;
      }
      return a.value + (b.value - a.value) * eased;
    }
  }
  return last.value;
}

/** Add or update a keyframe in a track (kept sorted by t). */
export function upsertKeyframe(track: KeyframeTrack, kf: Keyframe): KeyframeTrack {
  const frames = [...track.frames.filter((f) => f.id !== kf.id), kf].sort((a, b) => a.t - b.t);
  return { ...track, frames };
}

/** Remove a keyframe by id. */
export function removeKeyframe(track: KeyframeTrack, id: string): KeyframeTrack {
  return { ...track, frames: track.frames.filter((f) => f.id !== id) };
}

/** Move a keyframe to a new t position (clamped to 0..1). */
export function moveKeyframe(track: KeyframeTrack, id: string, newT: number): KeyframeTrack {
  const clamped = Math.max(0, Math.min(1, newT));
  return {
    ...track,
    frames: track.frames.map((f) => (f.id === id ? { ...f, t: clamped } : f)),
  };
}
