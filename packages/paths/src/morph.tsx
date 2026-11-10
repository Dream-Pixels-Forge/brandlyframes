/**
 * BF-508 — dream-logic / surreal SVG path morphing for @brandlyframes/paths.
 *
 * The existing `interpolatePath` assumes two paths with the *same* command
 * structure and interpolates command-by-command. Real shapes (a star into a
 * blob, a square into a circle) rarely match. This module adds a
 * resampling layer: both paths are sampled into `N` evenly-spaced points
 * around their perimeter, and the two N-gons are linearly interpolated —
 * giving a smooth, "melting" morph between arbitrary closed shapes.
 *
 * Pure, deterministic, side-effect-free: same inputs → same output string.
 */

import type { FC, SVGProps } from 'react';
import { useCurrentFrame } from 'brandlyframes';

// ---------------------------------------------------------------------------
// Point-sampling utilities
// ---------------------------------------------------------------------------

export interface Pt {
  x: number;
  y: number;
}

/**
 * Parse an SVG path string into a dense polygon of `N` points sampled at
 * equal *arc-length* intervals around the perimeter.
 *
 * Only straight segments (M/L/H/V/Z) are handled; curves (C/Q/A) are
 * approximated by 8 sub-segments each. This keeps the resampler dependency-
 * free and deterministic.
 *
 * @param d - SVG path `d` attribute
 * @param n - number of output sample points
 * @returns an array of `n` `{x,y}` points, starting from the path's origin
 */
export const samplePath = (d: string, n: number): Pt[] => {
  if (n < 2) throw new Error('samplePath: n must be >= 2');

  // 1. Parse into a flat list of line segments (x0,y0 → x1,y1).
  const segs: Array<[number, number, number, number]> = [];
  let cx = 0;
  let cy = 0; // current point
  let sx = 0;
  let sy = 0; // subpath start

  const tokenize = (s: string): Array<string | number> => {
    const out: Array<string | number> = [];
    const re = /([MLHVCSQTAZmlhvcsqtaz])|(-?\d*\.?\d+(?:e[-+]?\d*)?)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      if (m[1]) out.push(m[1]);
      else if (m[2] !== undefined) out.push(Number(m[2]));
    }
    return out;
  };

  const tok = tokenize(d);
  let i = 0;
  let cmd: string | null = null;
  // Approximate curve sub-sampling: for C, sample at the de Casteljau
  // midpoints (4 points); Q at 3; A as a chord (2 points).
  const cubic = (
    x0: number, y0: number,
    c1x: number, c1y: number,
    c2x: number, c2y: number,
    x1: number, y1: number,
  ): void => {
    // Sample at t = 0, .25, .5, .75, 1 → 4 segments.
    const p = (t: number): Pt => {
      const u = 1 - t;
      const b = u * u * u;
      const c = 3 * u * u * t;
      const dd = 3 * u * t * t;
      const e = t * t * t;
      return {
        x: b * x0 + c * c1x + dd * c2x + e * x1,
        y: b * y0 + c * c1y + dd * c2y + e * y1,
      };
    };
    for (let k = 0; k < 4; k++) {
      const a = p(k / 4);
      const b2 = p((k + 1) / 4);
      segs.push([a.x, a.y, b2.x, b2.y]);
    }
    cx = x1;
    cy = y1;
  };
  const quad = (
    x0: number, y0: number,
    qx: number, qy: number,
    x1: number, y1: number,
  ): void => {
    const p = (t: number): Pt => {
      const u = 1 - t;
      return {
        x: u * u * x0 + 2 * u * t * qx + t * t * x1,
        y: u * u * y0 + 2 * u * t * qy + t * t * y1,
      };
    };
    for (let k = 0; k < 3; k++) {
      const a = p(k / 3);
      const b2 = p((k + 1) / 3);
      segs.push([a.x, a.y, b2.x, b2.y]);
    }
    cx = x1;
    cy = y1;
  };

  while (i < tok.length) {
    const c = tok[i];
    if (typeof c === 'string') {
      cmd = c;
      i++;
      switch (cmd.toUpperCase()) {
        case 'M': {
          cx = Number(tok[i] ?? 0);
          cy = Number(tok[i + 1] ?? 0);
          sx = cx;
          sy = cy;
          i += 2;
          break;
        }
        case 'L': {
          const x = Number(tok[i] ?? cx);
          const y = Number(tok[i + 1] ?? cy);
          segs.push([cx, cy, x, y]);
          cx = x;
          cy = y;
          i += 2;
          break;
        }
        case 'H': {
          const x = Number(tok[i] ?? cx);
          segs.push([cx, cy, x, cy]);
          cx = x;
          i += 1;
          break;
        }
        case 'V': {
          const y = Number(tok[i] ?? cy);
          segs.push([cx, cy, cx, y]);
          cy = y;
          i += 1;
          break;
        }
        case 'C': {
          cubic(
            cx, cy,
            Number(tok[i] ?? 0), Number(tok[i + 1] ?? 0),
            Number(tok[i + 2] ?? 0), Number(tok[i + 3] ?? 0),
            Number(tok[i + 4] ?? 0), Number(tok[i + 5] ?? 0),
          );
          i += 6;
          break;
        }
        case 'Q': {
          quad(
            cx, cy,
            Number(tok[i] ?? 0), Number(tok[i + 1] ?? 0),
            Number(tok[i + 2] ?? 0), Number(tok[i + 3] ?? 0),
          );
          i += 4;
          break;
        }
        case 'Z': {
          if (cx !== sx || cy !== sy) segs.push([cx, cy, sx, sy]);
          cx = sx;
          cy = sy;
          i += 0;
          break;
        }
        case 'A': {
          // Approximate the arc as a chord (acceptable for morph purposes).
          const x = Number(tok[i + 4] ?? cx);
          const y = Number(tok[i + 5] ?? cy);
          segs.push([cx, cy, x, y]);
          cx = x;
          cy = y;
          i += 7;
          break;
        }
        default:
          i++; // unknown — skip
      }
    } else {
      // Implicit repetition of the previous command.
      if (cmd === 'L' || cmd === null) {
        const x = Number(c);
        const y = Number(tok[i + 1] ?? cy);
        segs.push([cx, cy, x, y]);
        cx = x;
        cy = y;
        i += 2;
      } else if (cmd === 'M') {
        // M followed by implicit L.
        const x = Number(c);
        const y = Number(tok[i + 1] ?? cy);
        segs.push([cx, cy, x, y]);
        cx = x;
        cy = y;
        cmd = 'L';
        i += 2;
      } else {
        i++;
      }
    }
  }

  // 2. Compute cumulative arc length.
  const lens: number[] = [];
  let total = 0;
  for (const [x0, y0, x1, y1] of segs) {
    const l = Math.hypot(x1 - x0, y1 - y0);
    lens.push(l);
    total += l;
  }
  if (total === 0) return Array.from({ length: n }, () => ({ x: cx, y: cy }));

  // 3. Walk the perimeter, emitting `n` evenly-spaced points.
  const out: Pt[] = [];
  const step = total / n;
  let segIdx = 0;
  let segStart = 0; // arc-length at start of segIdx
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (segIdx < lens.length && segStart + lens[segIdx] < target) {
      segStart += lens[segIdx];
      segIdx++;
    }
    if (segIdx >= lens.length) {
      const last = segs[segs.length - 1];
      out.push({ x: last[2], y: last[3] });
      continue;
    }
    const [x0, y0, x1, y1] = segs[segIdx];
    const t = lens[segIdx] === 0 ? 0 : (target - segStart) / lens[segIdx];
    out.push({
      x: x0 + (x1 - x0) * t,
      y: y0 + (y1 - y0) * t,
    });
  }
  return out;
};

/**
 * Convert an N-point polygon to an SVG path string.
 *
 * @param pts - sample points
 * @param closed - if true, append `Z`
 * @param precision - decimal places (default 3)
 */
export const polygonToPath = (
  pts: readonly Pt[],
  closed: boolean = true,
  precision: number = 3,
): string => {
  const f = (v: number): string => v.toFixed(precision).replace(/\.?0+$/, '').replace(/^-0$/, '0');
  if (pts.length === 0) return '';
  const p0 = pts[0];
  let s = `M ${f(p0.x)} ${f(p0.y)}`;
  for (let i = 1; i < pts.length; i++) {
    s += ` L ${f(pts[i].x)} ${f(pts[i].y)}`;
  }
  if (closed) s += ' Z';
  return s;
};

// ---------------------------------------------------------------------------
// Compatible-pair morphing
// ---------------------------------------------------------------------------

export interface MorphOptions {
  /** Number of perimeter sample points per shape. Default 48. */
  readonly samples?: number;
  /** Whether to close the morphed polygon. Default true. */
  readonly closed?: boolean;
  /**
   * Rotation offset applied to shape B's sample start so that the two
   * shapes align "naturally" (e.g. a square morphing into a circle).
   * 0 = no rotation; pick a value in [0,1) of a full turn. Default 0.
   */
  readonly rotateB?: number;
}

/**
 * Morph two *arbitrary* SVG paths into a single compatible N-gon at
 * progress `t` (0 → A, 1 → B). Both paths are resampled to the same
 * perimeter point count, then linearly interpolated.
 *
 * Deterministic: same `(dA, dB, t, options)` → same output string.
 *
 * @param dA - SVG path `d` for shape A
 * @param dB - SVG path `d` for shape B
 * @param t - morph progress 0..1
 * @param options - samples, closed, rotateB
 * @returns an SVG path `d` string
 */
export const morphPaths = (
  dA: string,
  dB: string,
  t: number,
  options: MorphOptions = {},
): string => {
  const { samples = 48, closed = true, rotateB = 0 } = options;
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  const a = samplePath(dA, samples);
  let b = samplePath(dB, samples);
  if (rotateB !== 0 && b.length > 1) {
    // Rotate the start index of B's samples so the two shapes align better.
    const offset = Math.round(rotateB * b.length) % b.length;
    b = [...b.slice(offset), ...b.slice(0, offset)];
  }
  const out: Pt[] = a.map((pa, i) => {
    const pb = b[i] ?? pa;
    return {
      x: pa.x + (pb.x - pa.x) * tt,
      y: pa.y + (pb.y - pa.y) * tt,
    };
  });
  return polygonToPath(out, closed);
};

// ---------------------------------------------------------------------------
// Frame-driven React component
// ---------------------------------------------------------------------------

export interface DreamMorphProps extends SVGProps<SVGPathElement> {
  /** Path A (start). */
  readonly from: string;
  /** Path B (end). */
  readonly to: string;
  /** Number of frames in the morph. */
  readonly durationFrames: number;
  /** Perimeter sample count. Default 48. */
  readonly samples?: number;
  /** Rotation alignment for shape B. Default 0. */
  readonly rotateB?: number;
}

/**
 * `<DreamMorph>` — frame-driven surreal shape morph between two arbitrary
 * SVG paths. Uses the current frame from `brandlyframes` to compute `t`
 * and renders a single `<path>` with the interpolated `d` attribute.
 *
 * Deterministic for a given frame — safe to use in the render loop.
 */
export const DreamMorph: FC<DreamMorphProps> = ({
  from,
  to,
  durationFrames,
  samples,
  rotateB,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, Math.min(frame / Math.max(durationFrames, 1), 1));
  const d = morphPaths(from, to, t, { samples, rotateB });
  return <path d={d} {...rest} />;
};

