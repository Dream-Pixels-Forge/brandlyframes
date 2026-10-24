/**
 * Runtime primitives for BrandlyFrames: the entry-point bootstrap
 * (`registerRoot`, BF-002), frame-blocking async readiness (`holdFrame`/
 * `releaseFrame`, BF-006), composition markers (`useMarker`, BF-401) and the
 * frame-driven media primitives (`<Img>`, `<Audio>`, `<Video>`, BF-007).
 */
export {
  clearFrameHolds,
  getActiveHolds,
  holdFrame,
  releaseFrame,
  type ActiveFrameHold,
  type FrameHold,
  type HoldFrameOptions,
} from './holds';
export {
  installVirtualClock,
  uninstallVirtualClock,
  setVirtualClockFrame,
  getVirtualClockFrame,
  isVirtualClockActive,
  isWallClockUnsafe,
} from './virtual-clock';
export {
  Audio,
  type AudioProps,
  AudioForPreview,
  type AudioPreviewProps,
  AudioForRendering,
  type AudioRenderingProps,
  Img,
  type ImgProps,
  Video,
  type VideoProps,
  VideoForPreview,
  type VideoPreviewProps,
  VideoForRendering,
  type VideoRenderingProps,
} from './media';
export {
  CompositionMarkersProvider,
  MarkerContext,
  useMarker,
  type CompositionMarkers,
  type CompositionMarkersProviderProps,
} from './markers';
export { getRootComponent, registerRoot } from './register-root';
