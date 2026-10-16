/**
 * Caption renderer for BrandlyFrames
 * Renders captions to Canvas 2D or SVG
 */

import type { CaptionCue, CaptionSettings, ParsedCaption } from './index';

export interface RendererOptions {
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  lineHeight?: number;
  padding?: number;
  maxLines?: number;
}

export interface RenderResult {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Create default renderer options
 */
export function createRendererOptions(overrides: Partial<RendererOptions> = {}): RendererOptions {
  return {
    width: 1920,
    height: 1080,
    fontFamily: 'Arial, sans-serif',
    fontSize: 48,
    fontWeight: 'normal',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    outlineColor: '#000000',
    outlineWidth: 2,
    lineHeight: 1.4,
    padding: 20,
    maxLines: 2,
    ...overrides,
  };
}

/**
 * Render caption cue to canvas
 */
export function renderCaptionToCanvas(
  cue: CaptionCue,
  options: RendererOptions,
  canvas?: HTMLCanvasElement | OffscreenCanvas
): RenderResult {
  const ctx = getCanvasContext(canvas, options.width, options.height);
  const canvasEl = ctx.canvas;

  // Clear canvas
  ctx.clearRect(0, 0, options.width, options.height);

  // Set font
  ctx.font = `${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = options.color || '#ffffff';

  // Calculate position
  const { x, y, maxWidth } = calculateCaptionPosition(cue, options);
  const padding = options.padding ?? 20;

  // Wrap text
  const lines = wrapText(ctx, cue.text, maxWidth, options.maxLines ?? 2);

  // Calculate total height
  const lineHeight = options.fontSize * (options.lineHeight ?? 1.4);
  const totalHeight = lines.length * lineHeight + padding * 2;

  // Draw background
  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    const bgX = x - padding;
    const bgY = y - padding;
    const bgWidth = maxWidth + padding * 2;
    const bgHeight = totalHeight;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  // Draw text with outline
  if (options.outlineWidth && options.outlineColor) {
    ctx.strokeStyle = options.outlineColor;
    ctx.lineWidth = options.outlineWidth;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
  }

  ctx.fillStyle = options.color || '#ffffff';

  for (let i = 0; i < lines.length; i++) {
    const lineY = y + i * lineHeight;

    if (options.outlineWidth && options.outlineColor) {
      ctx.strokeText(lines[i], x, lineY, maxWidth);
    }
    ctx.fillText(lines[i], x, lineY, maxWidth);
  }

  return {
    canvas: canvasEl,
    bounds: { x, y, width: maxWidth, height: totalHeight },
  };
}

/**
 * Render multiple cues (for karaoke)
 */
export function renderKaraokeToCanvas(
  karaokeWords: Array<{ text: string; highlighted: boolean; progress: number }>,
  options: RendererOptions,
  canvas?: HTMLCanvasElement | OffscreenCanvas
): RenderResult {
  const ctx = getCanvasContext(canvas, options.width, options.height);
  const canvasEl = ctx.canvas;

  ctx.clearRect(0, 0, options.width, options.height);
  ctx.font = `${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = options.color || '#ffffff';

  const karaokeCue: CaptionCue = { id: 'karaoke', startTime: 0, endTime: 1, text: '', settings: {} };
  const { x, y, maxWidth } = calculateCaptionPosition(karaokeCue, options);
  const lineHeight = options.fontSize * (options.lineHeight ?? 1.4);
  const padding = options.padding ?? 20;

  // Build full text with highlights
  let fullText = '';
  const highlights: Array<{ start: number; end: number; progress: number }> = [];

  for (const word of karaokeWords) {
    const start = fullText.length;
    fullText += word.text + ' ';
    const end = fullText.length - 1; // exclude trailing space
    highlights.push({ start, end, progress: word.progress });
  }

  // Wrap the full text
  const lines = wrapText(ctx, fullText.trim(), maxWidth, options.maxLines ?? 2);

  // Calculate total height
  const totalHeight = lines.length * lineHeight + padding * 2;

  // Draw background
  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    const bgX = x - padding;
    const bgY = y - padding;
    const bgWidth = maxWidth + padding * 2;
    const bgHeight = totalHeight;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  // Draw text with karaoke highlighting
  let charIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY = y + i * lineHeight;

    // Draw outline for whole line first
    if (options.outlineWidth && options.outlineColor) {
      ctx.strokeStyle = options.outlineColor;
      ctx.lineWidth = options.outlineWidth;
      ctx.strokeText(line, x, lineY, maxWidth);
    }

    // Draw each character with appropriate highlight
    let lineX = x;
    for (const char of line) {
      let isHighlighted = false;
      let highlightProgress = 0;

      for (const hl of highlights) {
        if (charIndex >= hl.start && charIndex < hl.end) {
          isHighlighted = true;
          highlightProgress = hl.progress;
          break;
        }
      }

      if (isHighlighted && highlightProgress > 0) {
        // Draw highlighted character
        ctx.globalAlpha = highlightProgress;
        ctx.fillStyle = '#ffff00'; // Yellow highlight
        ctx.fillText(char, lineX, lineY);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = options.color || '#ffffff';
        ctx.fillText(char, lineX, lineY);
      }

      lineX += ctx.measureText(char).width;
      charIndex++;
    }

    // Account for space after line (in wrapText)
    charIndex++; // space
  }

  return {
    canvas: canvasEl,
    bounds: { x, y, width: maxWidth, height: totalHeight },
  };
}

/**
 * Get or create canvas context
 */
function getCanvasContext(
  canvas: HTMLCanvasElement | OffscreenCanvas | undefined,
  width: number,
  height: number
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  if (canvas) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    return ctx;
  }

  // Create new canvas
  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas');
    return ctx;
  }

  // Fallback for environments without OffscreenCanvas
  const fallback = document.createElement('canvas');
  fallback.width = width;
  fallback.height = height;
  const ctx = fallback.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context from fallback canvas');
  return ctx;
}

/**
 * Calculate caption position based on settings
 */
function calculateCaptionPosition(
  cue: CaptionCue,
  options: RendererOptions
): { x: number; y: number; maxWidth: number } {
  const settings = cue.settings || {};
  const padding = options.padding || 20;
  const maxWidth = options.width - padding * 2;

  // Horizontal alignment
  let x = padding;
  if (settings.alignment === 'center') {
    x = options.width / 2;
  } else if (settings.alignment === 'end') {
    x = options.width - padding;
  }

  // Vertical position
  let y: number;
  if (settings.position === 'top') {
    y = padding;
  } else if (settings.position === 'center') {
    y = (options.height - options.fontSize * 2) / 2;
  } else {
    // Default to bottom
    y = options.height - options.fontSize * 3 - padding;
  }

  // Line override
  if (settings.line !== undefined) {
    y = settings.line * (options.fontSize * 1.5);
  }

  return { x, y, maxWidth };
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;

      if (lines.length >= maxLines) {
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  // If we exceeded maxLines, truncate last line
  if (lines.length > maxLines) {
    lines.length = maxLines;
    const lastLine = lines[maxLines - 1];
    // Try to add ellipsis
    while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
      lastLine.slice(0, -1);
    }
    lines[maxLines - 1] = lastLine + '...';
  }

  return lines;
}

/**
 * Measure caption bounds without rendering
 */
export function measureCaption(
  cue: CaptionCue,
  options: RendererOptions
): { width: number; height: number; lines: number } {
  // Create a temporary canvas for measurement
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(1, 1)
    : document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  ctx.font = `${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`;

  const { maxWidth } = calculateCaptionPosition(cue, options);
  const lines = wrapText(ctx, cue.text, maxWidth, options.maxLines ?? 2);
  const lineHeight = options.fontSize * (options.lineHeight ?? 1.4);
  const padding = options.padding ?? 20;

  return {
    width: maxWidth + padding * 2,
    height: lines.length * lineHeight + padding * 2,
    lines: lines.length,
  };
}

/**
 * Create caption overlay image (for video compositing)
 */
export async function createCaptionOverlay(
  cues: CaptionCue[],
  time: number,
  options: RendererOptions
): Promise<HTMLCanvasElement | OffscreenCanvas | null> {
  const activeCue = cues.find(cue => time >= cue.startTime && time < cue.endTime);
  if (!activeCue) return null;

  return renderCaptionToCanvas(activeCue, options).canvas;
}

export * from './index';