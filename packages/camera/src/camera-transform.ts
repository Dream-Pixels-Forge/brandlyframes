import type { CameraMoveConfig, CameraTransform } from './types';

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

/**
 * Linear progress through the move range: 0 at `startFrame`, 1 at
 * `endFrame`, clamped to 0..1 outside the range. A pure function of the
 * frame number — identical input always yields identical output.
 */
const progress = (frame: number, startFrame: number, endFrame: number): number => {
  const span = endFrame - startFrame;
  if (span <= 0) {
    return frame >= startFrame ? 1 : 0;
  }
  return clamp((frame - startFrame) / span, 0, 1);
};

/**
 * Deterministic camera transform for a single frame.
 *
 * @param frame - frame number
 * @param move - camera move config (mode, frame range, mode-specific parameters)
 * @returns the transform for this frame: identical `(frame, move)` always
 *   produces the identical transform — no `Math.random`, no `Date.now`, no
 *   wall clock. Safe in render workers and Node.
 */
export const computeCameraTransform = (frame: number, move: CameraMoveConfig): CameraTransform => {
  const p = progress(frame, move.startFrame, move.endFrame);

  if (move.mode === 'dolly') {
    const scale = 1 + (move.zoom - 1) * p;
    return {
      frame,
      progress: p,
      mode: 'dolly',
      translateX: 0,
      translateY: 0,
      scaleX: scale,
      scaleY: scale,
      rotation: 0,
    };
  }

  const translateX = move.panX * p;
  const translateY = move.panY * p;
  if (move.mode === 'pan') {
    return { frame, progress: p, mode: 'pan', translateX, translateY, scaleX: 1, scaleY: 1, rotation: 0 };
  }

  // parallax: depth-scaled pan — deeper layers move slower
  return {
    frame,
    progress: p,
    mode: 'parallax',
    translateX: translateX * move.depth,
    translateY: translateY * move.depth,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  };
};
