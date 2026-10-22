/**
 * @brandlyframes/camera — types.
 *
 * Every camera move is a pure function of the frame number: the same frame
 * always yields the same transform, so previews and renders match
 * (`frame -> transform`). No `Math.random`, no `Date.now`, no wall clock.
 */

/**
 * Camera move mode.
 * - `dolly` — zoom in/out around the center (scale changes, no translation).
 * - `pan` — horizontal/vertical movement (translation changes, no scale).
 * - `parallax` — layered depth movement: a pan scaled by a per-layer depth
 *   factor, so layers at different depths move at different rates.
 */
export type CameraMode = 'dolly' | 'pan' | 'parallax';

/**
 * A generic 2D transform: translation in pixels, scale per axis, rotation in
 * degrees. The low-level value a camera move resolves to for one frame.
 */
export interface Transform2D {
  /** Horizontal translation in pixels (positive = right). */
  readonly translateX: number;
  /** Vertical translation in pixels (positive = down). */
  readonly translateY: number;
  /** Horizontal scale (1 = natural size). */
  readonly scaleX: number;
  /** Vertical scale (1 = natural size). */
  readonly scaleY: number;
  /** Rotation in degrees (positive = clockwise). */
  readonly rotation: number;
}

/**
 * The resolved camera transform for a single frame: a {@link Transform2D}
 * plus the frame it was computed for and the progress through the move range.
 */
export interface CameraTransform extends Transform2D {
  /** The frame number this transform was computed for. */
  readonly frame: number;
  /** Progress through the move range, clamped to 0..1 (0 = start, 1 = end). */
  readonly progress: number;
  /** The mode that produced this transform. */
  readonly mode: CameraMode;
}

/**
 * Inputs shared by every camera move: the frame range the move plays over.
 * Outside the range the transform is clamped to the start or end value.
 */
export interface CameraMove {
  readonly mode: CameraMode;
  /** First frame of the move (inclusive). */
  readonly startFrame: number;
  /** Last frame of the move (inclusive). */
  readonly endFrame: number;
}

/**
 * Dolly move: zoom from 1 to `zoom` over the range.
 */
export interface DollyMove extends CameraMove {
  readonly mode: 'dolly';
  /** Target scale at `endFrame` (1 = no zoom, > 1 zoom in, < 1 zoom out). */
  readonly zoom: number;
}

/**
 * Pan move: translate by (`panX`, `panY`) pixels over the range.
 */
export interface PanMove extends CameraMove {
  readonly mode: 'pan';
  /** Horizontal pixels traveled by `endFrame` (positive = right). */
  readonly panX: number;
  /** Vertical pixels traveled by `endFrame` (positive = down). */
  readonly panY: number;
}

/**
 * Parallax move: a pan scaled by `depth`. A layer at depth `d` travels `d`
 * times the base pan — combine layers with different depths for a parallax
 * effect where nearer layers move faster than far ones.
 */
export interface ParallaxMove extends CameraMove {
  readonly mode: 'parallax';
  /** Horizontal pixels traveled by `endFrame` at depth 1 (positive = right). */
  readonly panX: number;
  /** Vertical pixels traveled by `endFrame` at depth 1 (positive = down). */
  readonly panY: number;
  /** Depth multiplier (1 = base pan, > 1 moves faster, < 1 moves slower). */
  readonly depth: number;
}

/**
 * Any camera move config, discriminated by `mode`.
 */
export type CameraMoveConfig = DollyMove | PanMove | ParallaxMove;

import type { ReactNode } from 'react';

/**
 * `<Camera>` props: one deterministic move applied to the wrapped children.
 */
export interface CameraProps {
  /** The camera move: mode, frame range and mode-specific parameters. */
  readonly move: CameraMoveConfig;
  /** Children rendered inside the moving camera frame. */
  readonly children?: ReactNode;
}
