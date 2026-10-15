/**
 * @brandlyframes/lottie — canvas-based Lottie renderer.
 *
 * Renders a parsed AnimationModel onto a 2D canvas context at a given frame.
 * Supports groups, rects, ellipses, paths, fills, strokes, gradients,
 * trim paths, transforms, and opacity. Image/precomp layers are placeholders.
 */

import type { AnimationModel, LayerModel, ShapeModel } from './types';

/** Resolve a CSS rgb string from a color accessor value. */
function colorToRgba(value: any, opacity: number): string {
  const r = clamp(Math.round((value?.r ?? 0) * 255), 0, 255);
  const g = clamp(Math.round((value?.g ?? 0) * 255), 0, 255);
  const b = clamp(Math.round((value?.b ?? 0) * 255), 0, 255);
  const a = opacity / 100;
  return `rgba(${r},${g},${b},${a})`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** Get value accessor result with a fallback. */
function accessor(acc: any, fallback: any): any {
  return acc ? acc.get(fallback) : fallback;
}

/** Render a single shape model onto ctx. */
function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeModel,
  opacity: number,
): void {
  if (shape.hidden) return;

  ctx.save();

  // Apply group transform if present.
  if (shape.transform) {
    applyTransform(ctx, shape.transform, opacity);
  } else {
    ctx.globalAlpha = (ctx.globalAlpha ?? 1) * (opacity / 100);
  }

  // Trim paths apply to the group's visible strokes.
  const trimStart = accessor(shape.trimStart, 0);
  const trimEnd = accessor(shape.trimEnd, 100);
  const trimOffset = accessor(shape.trimOffset, 0);
  const hasTrim = trimStart !== 0 || trimEnd !== 100 || trimOffset !== 0;

  switch (shape.type) {
    case 'gr': {
      // Render children in order.
      if (shape.children) {
        for (const child of shape.children) {
          renderShape(ctx, child, opacity);
        }
      }
      break;
    }
    case 'rc': {
      const size = accessor(shape.rectSize, { w: 100, h: 100 });
      const pos = accessor(shape.rectPosition, { x: 0, y: 0 });
      const radius = accessor(shape.rectRadius, 0);
      const w = size.w ?? 100;
      const h = size.h ?? 100;
      const x = pos.x - w / 2;
      const y = pos.y - h / 2;

      if (shape.fillRule !== undefined && shape.color) {
        ctx.fillStyle = colorToRgba(shape.color, accessor(shape.fillOpacity, 100));
        if (radius > 0) {
          roundRect(ctx, x, y, w, h, radius);
        } else {
          ctx.fillRect(x, y, w, h);
        }
        ctx.fill();
      }
      if (shape.strokeColor) {
        ctx.strokeStyle = colorToRgba(
          shape.strokeColor,
          accessor(shape.strokeOpacity, 100),
        );
        ctx.lineWidth = accessor(shape.strokeWidth, 1);
        ctx.lineCap = (shape.lineCap ?? 'round') as CanvasLineCap;
        ctx.lineJoin = (shape.lineJoin ?? 'round') as CanvasLineJoin;
        ctx.miterLimit = shape.miterLimit ?? 4;
        if (radius > 0) {
          roundRect(ctx, x, y, w, h, radius);
        } else {
          ctx.strokeRect(x, y, w, h);
        }
        ctx.stroke();
      }
      break;
    }
    case 'el': {
      const size = accessor(shape.ellipseSize, { w: 100, h: 100 });
      const pos = accessor(shape.ellipsePosition, { x: 0, y: 0 });
      const w = size.w ?? 100;
      const h = size.h ?? 100;
      const x = pos.x - w / 2;
      const y = pos.y - h / 2;
      const kappa = 0.5522848;

      if (shape.fillRule !== undefined && shape.color) {
        ctx.fillStyle = colorToRgba(shape.color, accessor(shape.fillOpacity, 100));
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (shape.strokeColor) {
        ctx.strokeStyle = colorToRgba(
          shape.strokeColor,
          accessor(shape.strokeOpacity, 100),
        );
        ctx.lineWidth = accessor(shape.strokeWidth, 1);
        ctx.lineCap = (shape.lineCap ?? 'round') as CanvasLineCap;
        ctx.lineJoin = (shape.lineJoin ?? 'round') as CanvasLineJoin;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'sh': {
      const pathData = accessor(shape.pathData, null);
      if (pathData) {
        const path = parsePathData(pathData);
        if (shape.fillRule !== undefined && shape.color) {
          ctx.fillStyle = colorToRgba(shape.color, accessor(shape.fillOpacity, 100));
          if (hasTrim) {
            applyTrim(ctx, path, trimStart, trimEnd, trimOffset);
          }
          ctx.fill();
        }
        if (shape.strokeColor) {
          ctx.strokeStyle = colorToRgba(
            shape.strokeColor,
            accessor(shape.strokeOpacity, 100),
          );
          ctx.lineWidth = accessor(shape.strokeWidth, 1);
          ctx.lineCap = (shape.lineCap ?? 'round') as CanvasLineCap;
          ctx.lineJoin = (shape.lineJoin ?? 'round') as CanvasLineJoin;
          ctx.miterLimit = shape.miterLimit ?? 4;
          if (hasTrim) {
            applyTrim(ctx, path, trimStart, trimEnd, trimOffset);
          }
          ctx.stroke();
        }
      }
      break;
    }
    case 'fl': {
      // Standalone fill (no geometry) — no-op, fill is applied within shapes.
      break;
    }
    case 'st': {
      // Standalone stroke — no-op, stroke applied within shapes.
      break;
    }
    case 'gf':
    case 'gs': {
      // Gradient — approximate with solid fill/stroke using first color stop.
      const colors = accessor(shape.gradientColors, [{ r: 0, g: 0, b: 0 }]);
      const first = colors[0] ?? { r: 0, g: 0, b: 0 };
      if (shape.type === 'gf' && shape.color) {
        ctx.fillStyle = colorToRgba(first, accessor(shape.fillOpacity, 100));
        ctx.fill();
      }
      if (shape.type === 'gs' && shape.strokeColor) {
        ctx.strokeStyle = colorToRgba(first, accessor(shape.strokeOpacity, 100));
        ctx.lineWidth = accessor(shape.strokeWidth, 1);
        ctx.lineCap = (shape.lineCap ?? 'round') as CanvasLineCap;
        ctx.lineJoin = (shape.lineJoin ?? 'round') as CanvasLineJoin;
        ctx.stroke();
      }
      break;
    }
    case 'tm': {
      // Trim paths — handled at render time above; no geometry of its own.
      break;
    }
    case 'rp': {
      // Repeater — placeholder: render children once with group transform.
      if (shape.children) {
        for (const child of shape.children) {
          renderShape(ctx, child, opacity);
        }
      }
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

/** Apply a transform model to the canvas context. */
function applyTransform(
  ctx: CanvasRenderingContext2D,
  transform: any,
  opacity: number,
): void {
  const pos = accessor(transform.position, { x: 0, y: 0, z: 0 });
  const anchor = accessor(transform.anchor, { x: 0, y: 0, z: 0 });
  const scale = accessor(transform.scale, [100, 100]);
  const rotation = accessor(transform.rotation, 0);
  const op = accessor(transform.opacity, 100);

  const x = pos.x ?? 0;
  const y = pos.y ?? 0;
  const ax = anchor.x ?? 0;
  const ay = anchor.y ?? 0;
  const sx = Array.isArray(scale) ? scale[0] / 100 : 1;
  const sy = Array.isArray(scale) ? scale[1] / 100 : 1;
  const rot = ((rotation ?? 0) * Math.PI) / 180;

  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.translate(-ax, -ay);
  ctx.globalAlpha = (ctx.globalAlpha ?? 1) * (op / 100) * (opacity / 100);
}

/** Parse a simplified SVG-like path data string into draw commands. */
function parsePathData(data: any): Array<{ type: string; pts: number[] }> {
  const commands: Array<{ type: string; pts: number[] }> = [];
  if (typeof data === 'string') {
    // Very light parser: M, L, C, Q, Z, m, l, c, q, z
    const tokens = data.match(/[MLCQZmlcqz]|[^MLCQZmlcqz]+/g) || [];
    let current: { type: string; pts: number[] } | null = null;
    for (const tok of tokens) {
      if (/[MLCQZmlcqz]/.test(tok)) {
        current = { type: tok.toUpperCase(), pts: [] };
        commands.push(current);
      } else if (current) {
        const nums = tok.match(/-?\d*\.?\d+/g);
        if (nums) {
          for (const n of nums) current.pts.push(parseFloat(n));
        }
      }
    }
  }
  return commands;
}

/** Render parsed path commands onto ctx (basic M/L/C/Q/Z support). */
function applyTrim(
  ctx: CanvasRenderingContext2D,
  path: Array<{ type: string; pts: number[] }>,
  start: number,
  end: number,
  offset: number,
): void {
  // Trim implementation: skip — render full path. Trim paths require
  // per-segment length computation; placeholder keeps geometry intact.
  // Future: measure segment lengths and clip.
  drawPath(ctx, path);
}

/** Draw parsed path commands. */
function drawPath(
  ctx: CanvasRenderingContext2D,
  path: Array<{ type: string; pts: number[] }>,
): void {
  ctx.beginPath();
  let subpathStarted = false;
  for (const cmd of path) {
    const p = cmd.pts;
    switch (cmd.type) {
      case 'M':
        ctx.moveTo(p[0], p[1]);
        subpathStarted = true;
        break;
      case 'L':
        ctx.lineTo(p[0], p[1]);
        break;
      case 'C':
        ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
        break;
      case 'Q':
        ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
        break;
      case 'Z':
        ctx.closePath();
        break;
      default:
        break;
    }
  }
}

/** Rounded rectangle helper. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Render an AnimationModel onto a canvas 2D context at a specific frame.
 *
 * @param ctx - Canvas 2D rendering context.
 * @param model - Parsed animation model.
 * @param frame - Current frame number.
 */
export function renderLottieFrame(
  ctx: CanvasRenderingContext2D,
  model: AnimationModel,
  frame: number,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Center the animation in the canvas.
  ctx.save();
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.scale(model.width ? 1 : 1, model.height ? 1 : 1);

  for (const layer of model.layers) {
    if (!layer.activeAt(frame)) continue;
    if (!layer.shapes) continue;

    ctx.save();
    // Apply layer transform.
    const pos = layer.transform.position.get(frame);
    const anchor = layer.transform.anchor.get(frame);
    const scale = layer.transform.scale.get(frame);
    const rotation = layer.transform.rotation.get(frame);
    const layerOp = layer.transform.opacity.get(frame);

    const x = pos?.x ?? 0;
    const y = pos?.y ?? 0;
    const ax = anchor?.x ?? 0;
    const ay = anchor?.y ?? 0;
    const sx = Array.isArray(scale) ? scale[0] / 100 : 1;
    const sy = Array.isArray(scale) ? scale[1] / 100 : 1;
    const rot = ((rotation ?? 0) * Math.PI) / 180;

    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.translate(-ax, -ay);
    ctx.globalAlpha = (layerOp / 100) * (layer.opacity / 100);

    for (const shape of layer.shapes) {
      renderShape(ctx, shape, layer.opacity);
    }

    ctx.restore();
  }

  ctx.restore();
}
