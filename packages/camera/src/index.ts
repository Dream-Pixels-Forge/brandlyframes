/**
 * @brandlyframes/camera — deterministic camera moves (dolly, pan, parallax)
 * for BrandlyFrames 2D layers.
 *
 * Every camera move is a pure function of the frame number
 * (`frame -> transform`): no `Math.random`, no `Date.now`, no wall clock.
 * Use {@link Camera} to move a subtree, or {@link useCameraTransform} to
 * drive custom layers from the current frame.
 */
export { Camera, type CameraProps } from './camera';
export { computeCameraTransform } from './camera-transform';
export { useCameraTransform } from './use-camera-transform';
export type { CameraMode, Transform2D, CameraTransform, CameraMoveConfig, DollyMove, PanMove, ParallaxMove } from './types';
