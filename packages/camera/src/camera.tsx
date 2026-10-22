import type { FC, CSSProperties } from 'react';
import { useCameraTransform } from './use-camera-transform';
import type { CameraProps } from './types';
export type { CameraProps };

/**
 * Applies a deterministic camera move to its children: the wrapped subtree is
 * translated, scaled and rotated per frame, so the composition appears to be
 * filmed by a moving camera.
 *
 * - `dolly` — zoom in/out around the center.
 * - `pan` — slide horizontally/vertically.
 * - `parallax` — depth-scaled pan; nest cameras or combine layers with
 *   different `depth` values so nearer layers move faster than far ones.
 *
 * The move is a pure function of the current frame (`useCameraTransform`),
 * so previews and renders match exactly.
 */
export const Camera: FC<CameraProps> = ({ move, children }: CameraProps) => {
  const { translateX, translateY, scaleX, scaleY, rotation } = useCameraTransform(move);
  const style: CSSProperties = {
    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`,
    transformOrigin: 'center',
  };
  return <div style={style}>{children}</div>;
};
