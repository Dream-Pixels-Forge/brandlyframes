/**
 * @brandlyframes/lottie — parser for Bodymovin / Lottie JSON.
 *
 * Converts raw lottie JSON into the internal AnimationModel used by the
 * renderer. Clean-room implementation — no lottie-web dependency.
 */

import type {
  AnimationModel,
  Keyframe,
  KeyframeGroup,
  LayerModel,
  LottieAnimation,
  LottieLayer,
  MarkerModel,
  ShapeItem,
  ShapeItemType,
  ShapeModel,
  TransformModel,
  ValueAccessor,
} from './types';

/** Resolve a static value or keyframe group into a ValueAccessor. */
function makeValueAccessor(
  k: KeyframeGroup | any,
  fallback: any = 0,
): ValueAccessor {
  // If it's not a keyframe group (no `k` array / `a` flag), treat as static.
  if (!k || typeof k !== 'object' || !Array.isArray((k as KeyframeGroup).k)) {
    const staticValue = k ?? fallback;
    return {
      get: () => staticValue,
    };
  }

  const group = k as KeyframeGroup;
  const frames = group.k;

  return {
    get: (frame: number) => interpolateKeyframes(frames, frame, fallback),
  };
}

/** Interpolate between keyframes for a given frame. */
function interpolateKeyframes(
  keyframes: Keyframe[],
  frame: number,
  fallback: any,
): any {
  if (keyframes.length === 0) return fallback;
  if (keyframes.length === 1) return keyframes[0].s ?? keyframes[0].e ?? fallback;

  // Before first keyframe.
  if (frame <= keyframes[0].t) {
    return keyframes[0].s ?? keyframes[0].e ?? fallback;
  }
  // After last keyframe.
  const last = keyframes[keyframes.length - 1];
  if (frame >= last.t) {
    return last.e ?? last.s ?? fallback;
  }

  // Find the bracketing keyframes.
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    if (frame >= k0.t && frame <= k1.t) {
      const span = k1.t - k0.t;
      const t = span === 0 ? 1 : (frame - k0.t) / span;
      return lerp(k0.s ?? k0.e, k1.e ?? k1.s, t);
    }
  }

  return fallback;
}

/** Linear interpolate between two values. */
function lerp(a: any, b: any, t: number): any {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.map((v, i) => lerp(v, b[i], t));
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a + (b - a) * t;
  }
  // Fallback: snap to b after midpoint.
  return t < 0.5 ? a : b;
}

/** Parse a transform block into a TransformModel. */
function parseTransform(ks: any): TransformModel {
  return {
    anchor: makeValueAccessor(ks.a, { x: 0, y: 0, z: 0 }),
    position: makeValueAccessor(ks.p, { x: 0, y: 0, z: 0 }),
    scale: makeValueAccessor(ks.s, [100, 100]),
    rotation: makeValueAccessor(ks.r, 0),
    opacity: makeValueAccessor(ks.o, 100),
    ...(ks.sk ? { skew: makeValueAccessor(ks.sk, 0) } : {}),
    ...(ks.sa ? { skewAxis: makeValueAccessor(ks.sa, 0) } : {}),
  };
}

/** Parse a shape item into a ShapeModel. */
function parseShapeItem(item: ShapeItem): ShapeModel {
  const base: ShapeModel = {
    type: item.ty,
    name: item.nm,
    hidden: item.hd,
  };

  switch (item.ty) {
    case 'gr': {
      const group = item as any;
      return {
        ...base,
        children: (group.it || []).map(parseShapeItem),
        ...(group.transform ? { transform: parseTransform(group.transform) } : {}),
      };
    }
    case 'rc': {
      const rect = item as any;
      return {
        ...base,
        rectSize: makeValueAccessor(rect.s, { w: 100, h: 100 }),
        rectPosition: makeValueAccessor(rect.p, { x: 0, y: 0 }),
        ...(rect.r ? { rectRadius: makeValueAccessor(rect.r, 0) } : {}),
      };
    }
    case 'el': {
      const el = item as any;
      return {
        ...base,
        ellipseSize: makeValueAccessor(el.s, { w: 100, h: 100 }),
        ellipsePosition: makeValueAccessor(el.p, { x: 0, y: 0 }),
      };
    }
    case 'sh': {
      const path = item as any;
      return {
        ...base,
        pathData: makeValueAccessor(path.k, null),
      };
    }
    case 'fl': {
      const fill = item as any;
      return {
        ...base,
        color: makeValueAccessor(fill.c, { r: 0, g: 0, b: 0 }),
        fillOpacity: makeValueAccessor(fill.o, 100),
        fillRule: fill.r ?? 1,
      };
    }
    case 'st': {
      const stroke = item as any;
      return {
        ...base,
        strokeColor: makeValueAccessor(stroke.c, { r: 0, g: 0, b: 0 }),
        strokeOpacity: makeValueAccessor(stroke.o, 100),
        strokeWidth: makeValueAccessor(stroke.w, 1),
        lineCap: stroke.lc ?? 'round',
        lineJoin: stroke.lj ?? 'round',
        miterLimit: stroke.ml ?? 4,
      };
    }
    case 'gf': {
      const gf = item as any;
      return {
        ...base,
        gradientColors: makeValueAccessor(gf.g, [{ r: 0, g: 0, b: 0 }]),
        gradientOpacities: makeValueAccessor(gf.o, [100]),
        gradientStart: makeValueAccessor(gf.s, { x: 0, y: 0 }),
        gradientEnd: makeValueAccessor(gf.e, { x: 100, y: 0 }),
        gradientType: gf.t ?? 1,
      };
    }
    case 'gs': {
      const gs = item as any;
      return {
        ...base,
        gradientColors: makeValueAccessor(gs.g, [{ r: 0, g: 0, b: 0 }]),
        gradientOpacities: makeValueAccessor(gs.o, [100]),
        gradientStart: makeValueAccessor(gs.s, { x: 0, y: 0 }),
        gradientEnd: makeValueAccessor(gs.e, { x: 100, y: 0 }),
        gradientType: gs.t ?? 1,
        strokeWidth: makeValueAccessor(gs.w, 1),
        lineCap: gs.lc ?? 'round',
        lineJoin: gs.lj ?? 'round',
        miterLimit: gs.ml ?? 4,
      };
    }
    case 'tm': {
      const tm = item as any;
      return {
        ...base,
        trimStart: makeValueAccessor(tm.s, 0),
        trimEnd: makeValueAccessor(tm.e, 100),
        trimOffset: makeValueAccessor(tm.o, 0),
        trimMode: tm.m ?? 1,
      };
    }
    case 'rp': {
      const rp = item as any;
      return {
        ...base,
        ...(rp.transform ? { transform: parseTransform(rp.transform) } : {}),
        // Repeater copies/offset handled at render time; expose via raw group below.
      } as any;
    }
    default:
      return base;
  }
}

/** Parse a raw Bodymovin layer into a LayerModel. */
function parseLayer(layer: LottieLayer): LayerModel {
  const model: LayerModel = {
    id: layer.ind,
    name: layer.nm,
    type: layer.ty,
    inFrame: layer.ip,
    outFrame: layer.op,
    transform: parseTransform(layer.ks),
    opacity: 100,
    activeAt: (frame: number) => frame >= layer.ip && frame <= layer.op,
  };

  if (layer.op !== undefined) model.opacity = layer.op;
  if (layer.parent !== undefined) model.parent = layer.parent;
  if (layer.refId !== undefined) model.refId = layer.refId;

  if ((layer as any).shapes) {
    model.shapes = (layer as any).shapes.map(parseShapeItem);
  }

  return model;
}

/**
 * Parse a LottieAnimation JSON into an AnimationModel.
 *
 * @param anim - Raw lottie animation JSON.
 * @returns Normalized animation model.
 */
export function parseAnimation(anim: LottieAnimation): AnimationModel {
  const fps = anim.fr || 30;
  const width = anim.w || 0;
  const height = anim.h || 0;
  const durationInFrames = anim.op != null ? anim.op : anim.layers.reduce((m, l) => Math.max(m, l.op), 0);

  return {
    fps,
    width,
    height,
    durationInFrames,
    layers: anim.layers.map(parseLayer),
    markers: (anim.markers || []).map((m) => ({
      time: m.tm,
      duration: m.dr ?? 0,
      name: m.cm,
    })),
  };
}

/**
 * Parse a lottie animation from a JSON string.
 */
export function parseAnimationJson(json: string): AnimationModel {
  return parseAnimation(JSON.parse(json) as LottieAnimation);
}
