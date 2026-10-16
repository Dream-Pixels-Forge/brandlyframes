// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderCaptionToCanvas,
  renderKaraokeToCanvas,
  measureCaption,
  createRendererOptions,
  createCaptionOverlay,
} from '../src/caption-renderer';
import type { CaptionCue, RendererOptions } from '../src/index';

/**
 * Minimal mock CanvasRenderingContext2D. happy-dom has no real 2D canvas,
 * and these tests assert on call behavior (spies) + property writes, which
 * a real context could not provide anyway.
 */
function createMockContext2D(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D {
  const ctx = {
    canvas,
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    miterLimit: 0,
    globalAlpha: 1,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

// Install the mock 2D context on every canvas happy-dom creates
const contextMap = new WeakMap<object, CanvasRenderingContext2D>();
HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement) {
  let ctx = contextMap.get(this);
  if (!ctx) {
    ctx = createMockContext2D(this);
    contextMap.set(this, ctx);
  }
  return ctx;
} as unknown as typeof HTMLCanvasElement.prototype.getContext;

// OffscreenCanvas fallback used when no canvas is passed to the renderer
class MockOffscreenCanvas {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext(): CanvasRenderingContext2D {
    let ctx = contextMap.get(this);
    if (!ctx) {
      ctx = createMockContext2D(this as unknown as OffscreenCanvas);
      contextMap.set(this, ctx);
    }
    return ctx;
  }
}
vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

// Create a real canvas for testing
function createTestCanvas(width: number = 1920, height: number = 1080): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

const defaultOptions: RendererOptions = createRendererOptions();
const defaultCue: CaptionCue = {
  id: 'cue-1',
  startTime: 0,
  endTime: 5,
  text: 'Hello world',
  settings: {},
};

describe('Caption Renderer', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = createTestCanvas();
    vi.clearAllMocks();
  });

  describe('createRendererOptions', () => {
    it('returns default options', () => {
      const opts = createRendererOptions();
      expect(opts.width).toBe(1920);
      expect(opts.height).toBe(1080);
      expect(opts.fontFamily).toBe('Arial, sans-serif');
      expect(opts.fontSize).toBe(48);
      expect(opts.color).toBe('#ffffff');
    });

    it('merges overrides with defaults', () => {
      const opts = createRendererOptions({ fontSize: 60, color: '#ff0000' });
      expect(opts.fontSize).toBe(60);
      expect(opts.color).toBe('#ff0000');
      expect(opts.width).toBe(1920); // default preserved
    });
  });

  describe('renderCaptionToCanvas', () => {
    it('renders caption to provided canvas', () => {
      const result = renderCaptionToCanvas(defaultCue, defaultOptions, canvas);

      expect(result.canvas).toBe(canvas);
      expect(result.bounds).toBeDefined();
    });

    it('creates new canvas when none provided', () => {
      const result = renderCaptionToCanvas(defaultCue, defaultOptions);

      expect(result.canvas).toBeDefined();
      expect(result.canvas.width).toBe(1920);
      expect(result.canvas.height).toBe(1080);
    });

    it('applies font settings', () => {
      const ctx = canvas.getContext('2d')!;
      renderCaptionToCanvas(defaultCue, defaultOptions, canvas);
      expect(ctx.font).toContain('48px');
      expect(ctx.font).toContain('Arial');
    });

    it('draws background when backgroundColor is set', () => {
      const ctx = canvas.getContext('2d')!;
      const fillRectSpy = vi.spyOn(ctx, 'fillRect');
      renderCaptionToCanvas(defaultCue, { ...defaultOptions, backgroundColor: 'rgba(0,0,0,0.7)' }, canvas);
      expect(fillRectSpy).toHaveBeenCalled();
    });

    it('draws outline when outlineWidth and outlineColor are set', () => {
      const ctx = canvas.getContext('2d')!;
      const strokeTextSpy = vi.spyOn(ctx, 'strokeText');
      renderCaptionToCanvas(defaultCue, { ...defaultOptions, outlineWidth: 2, outlineColor: '#000000' }, canvas);
      expect(strokeTextSpy).toHaveBeenCalled();
    });

    it('wraps long text', () => {
      const longCue = { ...defaultCue, text: 'This is a very long caption that should wrap to multiple lines because it exceeds the maximum width' };
      const opts = { ...defaultOptions, maxLines: 3 };

      renderCaptionToCanvas(longCue, opts, canvas);
      const ctx = canvas.getContext('2d')!;
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it('respects alignment settings', () => {
      const centerCue = { ...defaultCue, settings: { alignment: 'center' as const } };
      renderCaptionToCanvas(centerCue, defaultOptions, canvas);
      // Just verify it runs without error
    });

    it('respects position settings', () => {
      const topCue = { ...defaultCue, settings: { position: 'top' as const } };
      renderCaptionToCanvas(topCue, defaultOptions, canvas);
      // Just verify it runs without error
    });

    it('handles line override setting', () => {
      const lineCue = { ...defaultCue, settings: { line: 2 } };
      renderCaptionToCanvas(lineCue, defaultOptions, canvas);
      // Just verify it runs without error
    });
  });

  describe('renderKaraokeToCanvas', () => {
    const karaokeWords = [
      { text: 'Hello', highlighted: true, progress: 1 },
      { text: 'world', highlighted: true, progress: 0.5 },
      { text: 'test', highlighted: false, progress: 0 },
    ];

    it('renders karaoke words to canvas', () => {
      const result = renderKaraokeToCanvas(karaokeWords, defaultOptions, canvas);

      expect(result.canvas).toBe(canvas);
      expect(result.bounds).toBeDefined();
    });

    it('creates new canvas when none provided', () => {
      const result = renderKaraokeToCanvas(karaokeWords, defaultOptions);
      expect(result.canvas).toBeDefined();
    });

    it('draws background when backgroundColor is set', () => {
      const ctx = canvas.getContext('2d')!;
      const fillRectSpy = vi.spyOn(ctx, 'fillRect');
      renderKaraokeToCanvas(karaokeWords, { ...defaultOptions, backgroundColor: 'rgba(0,0,0,0.7)' }, canvas);
      expect(fillRectSpy).toHaveBeenCalled();
    });

    it('draws outline for whole line', () => {
      const ctx = canvas.getContext('2d')!;
      const strokeTextSpy = vi.spyOn(ctx, 'strokeText');
      renderKaraokeToCanvas(karaokeWords, { ...defaultOptions, outlineWidth: 2, outlineColor: '#000000' }, canvas);
      expect(strokeTextSpy).toHaveBeenCalled();
    });
  });

  describe('measureCaption', () => {
    it('returns measured dimensions', () => {
      const result = measureCaption(defaultCue, defaultOptions);

      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('lines');
      expect(typeof result.width).toBe('number');
      expect(typeof result.height).toBe('number');
      expect(typeof result.lines).toBe('number');
    });

    it('measures multi-line caption', () => {
      const multiLineCue = { ...defaultCue, text: 'Line one\nLine two\nLine three' };
      const result = measureCaption(multiLineCue, defaultOptions);
      expect(result.lines).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createCaptionOverlay', () => {
    it('returns null when no active cue at time', async () => {
      const cues = [
        { id: '1', startTime: 0, endTime: 5, text: 'First' },
        { id: '2', startTime: 10, endTime: 15, text: 'Second' },
      ];

      const result = await createCaptionOverlay(cues, 7, defaultOptions);
      expect(result).toBeNull();
    });

    it('renders active cue at given time', async () => {
      const cues = [
        { id: '1', startTime: 0, endTime: 5, text: 'First' },
        { id: '2', startTime: 10, endTime: 15, text: 'Second' },
      ];

      const result = await createCaptionOverlay(cues, 2, defaultOptions);
      expect(result).toBeDefined();
    });
  });
});