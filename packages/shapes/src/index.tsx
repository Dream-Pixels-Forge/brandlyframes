/**
 * @brandlyframes/shapes — vector shape components [BF-070]
 *
 * Frame-exact shape rendering for BrandlyFrames compositions.
 * Clean-room implementation.
 */

import type { FC, SVGAttributes } from 'react';
import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

/**
 * Shape style options.
 */
export interface ShapeStyle {
  /** Fill color. */
  fill?: string;
  /** Stroke color. */
  stroke?: string;
  /** Stroke width. */
  strokeWidth?: number;
  /** Opacity (0-1). */
  opacity?: number;
  /** Transform origin. */
  transformOrigin?: string;
}

/**
 * Base shape props.
 */
export interface ShapeProps extends SVGAttributes<SVGElement> {
  /** Shape style. */
  style?: ShapeStyle;
  /** Animation duration in frames. */
  durationFrames?: number;
  /** Easing function. */
  easing?: (t: number) => number;
}

/**
 * Rectangle shape component.
 */
export const Rect: FC<ShapeProps & { width: number; height: number; x?: number; y?: number; rx?: number; ry?: number }> = ({
  width,
  height,
  x = 0,
  y = 0,
  rx = 0,
  ry = 0,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  children,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  return (
    <rect
      x={x * easedProgress}
      y={y * easedProgress}
      width={width}
      height={height}
      rx={rx}
      ry={ry}
      fill={style.fill || 'none'}
      stroke={style.stroke || 'none'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      transformOrigin={style.transformOrigin || 'center'}
      {...rest}
    />
  );
};

/**
 * Circle shape component.
 */
export const Circle: FC<ShapeProps & { cx?: number; cy?: number; r: number }> = ({
  cx = 0,
  cy = 0,
  r,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  return (
    <circle
      cx={cx * easedProgress}
      cy={cy * easedProgress}
      r={r}
      fill={style.fill || 'none'}
      stroke={style.stroke || 'none'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      {...rest}
    />
  );
};

/**
 * Ellipse shape component.
 */
export const Ellipse: FC<ShapeProps & { cx?: number; cy?: number; rx: number; ry: number }> = ({
  cx = 0,
  cy = 0,
  rx,
  ry,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  return (
    <ellipse
      cx={cx * easedProgress}
      cy={cy * easedProgress}
      rx={rx}
      ry={ry}
      fill={style.fill || 'none'}
      stroke={style.stroke || 'none'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      {...rest}
    />
  );
};

/**
 * Line shape component.
 */
export const Line: FC<ShapeProps & { x1?: number; y1?: number; x2: number; y2: number }> = ({
  x1 = 0,
  y1 = 0,
  x2,
  y2,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2 * easedProgress}
      y2={y2 * easedProgress}
      stroke={style.stroke || 'currentColor'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      {...rest}
    />
  );
};

/**
 * Polyline shape component.
 */
export const Polyline: FC<ShapeProps & { points: string }> = ({
  points,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  // For polyline, we animate the stroke-dasharray to create a drawing effect
  const pathLength = 1000; // Approximate, would need actual calculation
  const strokeDasharray = `${pathLength * easedProgress} ${pathLength}`;

  return (
    <polyline
      points={points}
      fill="none"
      stroke={style.stroke || 'currentColor'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      strokeDasharray={strokeDasharray}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  );
};

/**
 * Polygon shape component.
 */
export const Polygon: FC<ShapeProps & { points: string }> = ({
  points,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  return (
    <polygon
      points={points}
      fill={style.fill || 'none'}
      stroke={style.stroke || 'none'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      transform={`scale(${easedProgress})`}
      transformOrigin="center"
      {...rest}
    />
  );
};

/**
 * Path shape component for complex shapes.
 */
export const Path: FC<ShapeProps & { d: string }> = ({
  d,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  // For path, animate stroke-dasharray for drawing effect
  const pathLength = 1000; // Would need actual path length calculation
  const strokeDasharray = `${pathLength * easedProgress} ${pathLength}`;

  return (
    <path
      d={d}
      fill={style.fill || 'none'}
      stroke={style.stroke || 'currentColor'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      strokeDasharray={strokeDasharray}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  );
};

/**
 * Star shape component.
 */
export const Star: FC<ShapeProps & { cx?: number; cy?: number; spikes: number; outerRadius: number; innerRadius: number }> = ({
  cx = 0,
  cy = 0,
  spikes = 5,
  outerRadius = 50,
  innerRadius = 25,
  style = {},
  durationFrames = 1,
  easing = (t) => t,
  ...rest
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(frame / durationFrames, 1);
  const easedProgress = easing(progress);

  // Generate star points
  const rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  let points = '';
  for (let i = 0; i < spikes; i++) {
    const x = cx + Math.cos(rot + i * step) * outerRadius;
    const y = cy + Math.sin(rot + i * step) * outerRadius;
    points += `${x},${y} `;
    const x2 = cx + Math.cos(rot + (i + 0.5) * step) * innerRadius;
    const y2 = cy + Math.sin(rot + (i + 0.5) * step) * innerRadius;
    points += `${x2},${y2} `;
  }

  return (
    <polygon
      points={points.trim()}
      fill={style.fill || 'none'}
      stroke={style.stroke || 'none'}
      strokeWidth={style.strokeWidth || 1}
      opacity={style.opacity ?? 1}
      transform={`scale(${easedProgress})`}
      transformOrigin="center"
      {...rest}
    />
  );
};

export default {
  Rect,
  Circle,
  Ellipse,
  Line,
  Polyline,
  Polygon,
  Path,
  Star,
};
