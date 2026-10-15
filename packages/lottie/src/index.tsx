/**
 * @brandlyframes/lottie — main entry point.
 *
 * Lottie (Bodymovin JSON) animation rendering for BrandlyFrames.
 *
 * @example
 * ```tsx
 * import { Lottie, useLottie, loadAnimation, parseAnimation } from '@brandlyframes/lottie';
 *
 * <Lottie animation={json} width={400} height={400} loop />
 * ```
 */

export {
  Lottie,
  useLottie,
  loadAnimation,
  parseAnimation,
  renderLottieFrame,
  createLottiePlayer,
  markerToFrame,
} from './Lottie';

export type {
  LottieAnimation,
  LottieLayer,
  LottieAsset,
  LottieFont,
  LottieMarker,
  Transform,
  KeyframeGroup,
  Keyframe,
  ShapeLayer,
  SolidLayer,
  ImageLayer,
  PrecompLayer,
  ShapeItem,
  FillShape,
  StrokeShape,
  GradientFillShape,
  GradientStrokeShape,
  TrimPathsShape,
  RepeaterShape,
  GroupShape,
  RectShape,
  EllipseShape,
  PathShape,
  AnimationModel,
  LayerModel,
  TransformModel,
  ValueAccessor,
  ShapeModel,
  MarkerModel,
  LottieProps,
  LottieControls,
} from './types';

export { parseAnimationJson } from './parser';
