import { useCurrentFrame } from 'brandlyframes';
import { computeCameraTransform } from './camera-transform';
import type { CameraMoveConfig, CameraTransform } from './types';

/**
 * The camera transform for the current frame of the enclosing timeline
 * scope (composition / Sequence / Loop / Freeze). Delegates to
 * {@link computeCameraTransform}, so the result is a pure function of the
 * frame: render frame N twice and you get the same transform.
 *
 * Throws when used outside a `<FrameContextProvider>` (mounted
 * automatically by `<Composition>`) — same as {@link useCurrentFrame}.
 *
 * @param move - camera move config (mode, frame range, mode-specific parameters)
 * @returns `{ translateX, translateY, scaleX, scaleY, rotation, frame, progress, mode }`
 */
export const useCameraTransform = (move: CameraMoveConfig): CameraTransform => {
  const frame = useCurrentFrame();
  return computeCameraTransform(frame, move);
};
