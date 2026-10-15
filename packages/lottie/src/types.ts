/**
 * @brandlyframes/lottie — type definitions for Lottie / Bodymovin JSON.
 *
 * Clean-room TypeScript model of the Bodymovin animation JSON format.
 * See https://airbnb.io/lottie/#/documentation
 */

/** Root Lottie animation JSON (Bodymovin export). */
export interface LottieAnimation {
  /** Animation version. */
  v: string;
  /** Frame rate. */
  fr: number;
  /** In point (frames). */
  ip?: number;
  /** Out point / total frames (frames). */
  op?: number;
  /** Width (px). */
  w: number;
  /** Height (px). */
  h: number;
  /** Layers. */
  layers: LottieLayer[];
  /** Assets (images, precomps, etc.). */
  assets: LottieAsset[];
  /** Markers (time-based cues). */
  markers?: LottieMarker[];
  /** Fonts referenced by the animation. */
  fonts?: LottieFont[];
}

/** Bodymovin marker. */
export interface LottieMarker {
  /** Marker time in seconds. */
  tm: number;
  /** Marker duration (optional). */
  dr?: number;
  /** Marker comment / name. */
  cm: string;
  /** Marker target (optional). */
  t?: number;
}

/** Asset reference. */
export interface LottieAsset {
  id: string;
  w: number;
  h: number;
  u?: string; // relative path / url
  p?: string;
  e?: number;
}

/** Font referenced by lottie. */
export interface LottieFont {
  family: string;
  name: string;
  style: string;
  fFamily: string;
  fWeight: number;
  fClass: string;
  fStyle: string;
  ascent: number;
  w?: number;
  d?: string; // font data (glyphs)
}

/** Layer type discriminator. */
export type LayerType =
  | 'precomp'   // 0 - nested composition
  | 'solid'     // 1 - solid layer
  | 'image'     // 2 - image layer
  | 'null'      // 3 - null layer
  | 'shape';    // 4 - shape layer

/** Transform property block. */
export interface Transform {
  a: KeyframeGroup; // anchor point
  p: KeyframeGroup; // position
  s: KeyframeGroup; // scale
  r: KeyframeGroup; // rotation (degrees)
  o: KeyframeGroup; // opacity (0-100)
  sk?: KeyframeGroup; // skew
  sa?: KeyframeGroup; // skew axis
}

/** A single keyframe group for an animated property. */
export interface KeyframeGroup {
  k: Keyframe[]; // keyframes (or a static value when not animated)
  a: number; // animated flag (0/1)
}

/** A single keyframe. */
export interface Keyframe {
  t: number; // time (frames)
  s?: any; // start value
  e?: any; // end value
  o?: { x: number; y: number }; // out tangent
  i?: { x: number; y: number }; // in tangent
  to?: any; // end value (alt)
  ti?: any; // in value (alt)
}

/** Base layer. */
export interface LottieLayer {
  /** Layer id. */
  ind: number;
  /** Layer name. */
  nm: string;
  /** Layer type. */
  ty: LayerType;
  /** In frame. */
  ip: number;
  /** Out frame. */
  op: number;
  /** Stretch (time remap). */
  st: number;
  /** Transform. */
  ks: Transform;
  /** Static opacity (0-100). */
  opacity?: number;
  /** Parent layer index. */
  parent?: number;
  /** Matte mode. */
  mat?: number;
  /** Time remap. */
  tm?: KeyframeGroup;
  /** Layer in-point override. */
  sr?: number;
  /** Asset reference id (image/precomp layers). */
  refId?: string;
}

/** Shape layer base. */
export interface ShapeLayer extends LottieLayer {
  ty: 'shape';
  /** Shapes array. */
  shapes: ShapeItem[];
}

/** Solid layer. */
export interface SolidLayer extends LottieLayer {
  ty: 'solid';
  /** Solid width. */
  sw?: number;
  /** Solid height. */
  sh?: number;
  /** Solid color. */
  sc?: number;
}

/** Image layer. */
export interface ImageLayer extends LottieLayer {
  ty: 'image';
  /** Asset ref id. */
  refId: string;
}

/** Precomp layer. */
export interface PrecompLayer extends LottieLayer {
  ty: 'precomp';
  /** Referenced precomp animation ref id. */
  refId: string;
  w: number;
  h: number;
}

/** Shape item (group, rect, ellipse, path, fill, stroke, gradient, trim, etc.). */
export interface ShapeItem {
  ty: ShapeItemType;
  /** Item name. */
  nm?: string;
  /** Hidden flag. */
  hd?: boolean;
}

/** Shape item type discriminator. */
export type ShapeItemType =
  | 'gr' // group
  | 'rc' // rectangle
  | 'el' // ellipse
  | 'sh' // path shape
  | 'fl' // fill
  | 'st' // stroke
  | 'gf' // gradient fill
  | 'gs' // gradient stroke
  | 'tm' // trim paths
  | 'tr' // transform (within group)
  | 'rp' // repeater
  | 'mm' // merge paths
  | 'rd'; // rounded corners

/** Group shape item. */
export interface GroupShape extends ShapeItem {
  ty: 'gr';
  /** Child shapes. */
  it: ShapeItem[];
  /** Group transform. */
  transform?: Transform;
}

/** Rectangle shape. */
export interface RectShape extends ShapeItem {
  ty: 'rc';
  /** Size. */
  s: KeyframeGroup;
  /** Position. */
  p: KeyframeGroup;
  /** Rounded corner radius. */
  r?: KeyframeGroup;
}

/** Ellipse shape. */
export interface EllipseShape extends ShapeItem {
  ty: 'el';
  /** Size. */
  s: KeyframeGroup;
  /** Position. */
  p: KeyframeGroup;
}

/** Path shape (vector data). */
export interface PathShape extends ShapeItem {
  ty: 'sh';
  /** Path data (svg-like). */
  k: KeyframeGroup;
}

/** Fill shape. */
export interface FillShape extends ShapeItem {
  ty: 'fl';
  /** Fill color (r,g,b 0-1). */
  c: KeyframeGroup;
  /** Fill opacity (0-100). */
  o: KeyframeGroup;
  /** Fill rule. */
  r?: number; // 1 = nonzero, 2 = evenodd
}

/** Stroke shape. */
export interface StrokeShape extends ShapeItem {
  ty: 'st';
  /** Stroke color (r,g,b 0-1). */
  c: KeyframeGroup;
  /** Stroke opacity (0-100). */
  o: KeyframeGroup;
  /** Stroke width. */
  w: KeyframeGroup;
  /** Line cap. */
  lc: string; // 'butt' | 'round' | 'square'
  /** Line join. */
  lj: string; // 'round' | 'miter' | 'bevel'
  /** Miter limit. */
  ml: number;
}

/** Gradient fill shape. */
export interface GradientFillShape extends ShapeItem {
  ty: 'gf';
  /** Gradient color stops (r,g,b). */
  g: KeyframeGroup;
  /** Opacity stops. */
  o: KeyframeGroup;
  /** Start point. */
  s: KeyframeGroup;
  /** End point. */
  e: KeyframeGroup;
  /** Gradient type (1 = linear, 2 = radial). */
  t: number;
}

/** Gradient stroke shape. */
export interface GradientStrokeShape extends ShapeItem {
  ty: 'gs';
  g: KeyframeGroup;
  o: KeyframeGroup;
  w: KeyframeGroup;
  s: KeyframeGroup;
  e: KeyframeGroup;
  lc: string;
  lj: string;
  ml: number;
}

/** Trim paths shape. */
export interface TrimPathsShape extends ShapeItem {
  ty: 'tm';
  /** Start (0-100). */
  s: KeyframeGroup;
  /** End (0-100). */
  e: KeyframeGroup;
  /** Offset (0-100). */
  o: KeyframeGroup;
  /** Trim mode (1 = individually, 2 = simultaneously). */
  m: number;
}

/** Repeater shape. */
export interface RepeaterShape extends ShapeItem {
  ty: 'rp';
  /** Copies count. */
  c: KeyframeGroup;
  /** Offset. */
  o: KeyframeGroup;
  /** Transform. */
  transform: Transform;
}

/** Internal normalized animation model used by the renderer. */
export interface AnimationModel {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  layers: LayerModel[];
  markers: MarkerModel[];
}

/** Normalized marker. */
export interface MarkerModel {
  time: number; // seconds
  duration: number;
  name: string;
}

/** Normalized layer model. */
export interface LayerModel {
  id: number;
  name: string;
  type: LayerType;
  inFrame: number;
  outFrame: number;
  transform: TransformModel;
  opacity: number;
  parent?: number;
  shapes?: ShapeModel[];
  refId?: string;
  /** Whether this layer is active at a given frame. */
  activeAt: (frame: number) => boolean;
}

/** Transform model with resolved keyframe accessors. */
export interface TransformModel {
  anchor: ValueAccessor;
  position: ValueAccessor;
  scale: ValueAccessor;
  rotation: ValueAccessor;
  opacity: ValueAccessor;
  skew?: ValueAccessor;
  skewAxis?: ValueAccessor;
}

/** Value accessor resolves a property value at a frame. */
export interface ValueAccessor {
  /** Get interpolated value at frame. */
  get: (frame: number) => any;
}

/** Normalized shape model. */
export interface ShapeModel {
  type: ShapeItemType;
  name?: string;
  hidden?: boolean;
  // Fill
  color?: ValueAccessor;
  fillOpacity?: ValueAccessor;
  fillRule?: number;
  // Stroke
  strokeColor?: ValueAccessor;
  strokeOpacity?: ValueAccessor;
  strokeWidth?: ValueAccessor;
  lineCap?: string;
  lineJoin?: string;
  miterLimit?: number;
  // Gradient
  gradientColors?: ValueAccessor;
  gradientOpacities?: ValueAccessor;
  gradientStart?: ValueAccessor;
  gradientEnd?: ValueAccessor;
  gradientType?: number;
  // Rect
  rectSize?: ValueAccessor;
  rectPosition?: ValueAccessor;
  rectRadius?: ValueAccessor;
  // Ellipse
  ellipseSize?: ValueAccessor;
  ellipsePosition?: ValueAccessor;
  // Path
  pathData?: ValueAccessor;
  // Trim
  trimStart?: ValueAccessor;
  trimEnd?: ValueAccessor;
  trimOffset?: ValueAccessor;
  trimMode?: number;
  // Children (groups)
  children?: ShapeModel[];
  // Group transform
  transform?: TransformModel;
}

/** Public Lottie component props. */
export interface LottieProps {
  /** The lottie animation JSON (Bodymovin). */
  animation: LottieAnimation | string; // string = URL to fetch
  /** Whether to autoplay. */
  autoplay?: boolean;
  /** Whether to loop. */
  loop?: boolean;
  /** Playback speed multiplier. */
  speed?: number;
  /** Initial direction (1 forward, -1 reverse). */
  direction?: 1 | -1;
  /** Renderer type ('canvas' | 'svg'). */
  renderer?: 'canvas' | 'svg';
  /** Width override (px). */
  width?: number;
  /** Height override (px). */
  height?: number;
  /** Callback when animation loads. */
  onLoad?: (animation: AnimationModel) => void;
  /** Callback on each frame render. */
  onFrame?: (frame: number) => void;
  /** Callback on complete. */
  onComplete?: () => void;
  /** Additional className. */
  className?: string;
  /** Canvas ref (canvas renderer). */
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

/** Public useLottie hook return. */
export interface LottieControls {
  /** Current frame. */
  frame: number;
  /** Total frames. */
  totalFrames: number;
  /** Frames per second. */
  fps: number;
  /** Current time (seconds). */
  time: number;
  /** Total duration (seconds). */
  duration: number;
  /** Whether playing. */
  isPlaying: boolean;
  /** Whether loaded. */
  isLoaded: boolean;
  /** Play the animation. */
  play: () => void;
  /** Pause the animation. */
  pause: () => void;
  /** Seek to a frame. */
  seekFrame: (frame: number) => void;
  /** Seek to a time (seconds). */
  seekTime: (time: number) => void;
  /** Go to a marker by name. */
  goToMarker: (name: string) => boolean;
  /** List marker names. */
  markers: string[];
  /** Set speed. */
  setSpeed: (speed: number) => void;
  /** Set loop. */
  setLoop: (loop: boolean) => void;
  /** Subscribe to playback changes. */
  onChange: (cb: (controls: LottieControls) => void) => () => void;
  /** Destroy and release resources. */
  destroy: () => void;
}
