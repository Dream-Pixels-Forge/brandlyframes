/**
 * Lottie (Bodymovin) package tests — [BF-071]
 */

import { describe, it, expect, vi } from 'vitest';
import {
  Lottie,
  useLottie,
  loadAnimation,
  parseAnimation,
  parseAnimationJson,
  renderLottieFrame,
  createLottiePlayer,
  markerToFrame,
} from '../src/index';

// Mock document for canvas tests
global.document = {
  createElement: vi.fn((tag) => {
    if (tag === 'canvas') {
      const canvas = {
        width: 100,
        height: 100,
        style: {},
        getContext: () => ({
          save: vi.fn(),
          restore: vi.fn(),
          clearRect: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          quadraticCurveTo: vi.fn(),
          closePath: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          ellipse: vi.fn(),
          setTransform: vi.fn(),
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 0,
          lineCap: '',
          lineJoin: '',
          miterLimit: 0,
          globalAlpha: 1,
          arc: vi.fn(),
          rect: vi.fn(),
          canvas: { width: 100, height: 100 }, // ctx.canvas reference
        }),
      };
      return canvas;
    }
    return {};
  }),
} as any;

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number);
global.cancelAnimationFrame = vi.fn((id: number) => clearTimeout(id));
global.performance = {
  now: vi.fn(() => Date.now()),
  timeOrigin: Date.now(),
  eventCounts: {},
  navigation: {} as any,
  onresourcetimingbufferfull: null,
  timing: {} as any,
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntries: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
  toJSON: vi.fn(() => ({})),
} as unknown as Performance;

// Mock brandlyframes hooks
vi.mock('brandlyframes', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1920, height: 1080, durationInFrames: 90 })),
}));

const simpleRectAnimation = {
  v: '5.7.5',
  fr: 30,
  w: 100,
  h: 100,
  op: 30,
  layers: [
    {
      ind: 1,
      nm: 'Rect Layer',
      ty: 'shape',
      ip: 0,
      op: 30,
      st: 1,
      ks: {
        a: { k: [{ t: 0, s: { x: 0, y: 0, z: 0 } }], a: 0 },
        p: { k: [{ t: 0, s: { x: 50, y: 50, z: 0 } }], a: 0 },
        s: { k: [{ t: 0, s: [100, 100] }], a: 0 },
        r: { k: [{ t: 0, s: 0 }], a: 0 },
        o: { k: [{ t: 0, s: 100 }], a: 0 },
      },
      shapes: [
        {
          ty: 'gr',
          nm: 'Group 1',
          it: [
            {
              ty: 'rc',
              nm: 'Rectangle 1',
              s: { k: [{ t: 0, s: { w: 80, h: 60 } }], a: 0 },
              p: { k: [{ t: 0, s: { x: 0, y: 0 } }], a: 0 },
            },
            {
              ty: 'fl',
              nm: 'Fill 1',
              c: { k: [{ t: 0, s: { r: 1, g: 0, b: 0 } }], a: 0 },
              o: { k: [{ t: 0, s: 100 }], a: 0 },
            },
          ],
        },
      ],
    },
  ],
  markers: [{ tm: 0, dr: 0, cm: 'start' }, { tm: 1, dr: 0, cm: 'mid' }],
} as any;

describe('@brandlyframes/lottie', () => {
  describe('exports', () => {
    it('exports Lottie component', () => {
      expect(Lottie).toBeDefined();
      expect(typeof Lottie).toBe('function');
    });

    it('exports useLottie hook', () => {
      expect(useLottie).toBeDefined();
      expect(typeof useLottie).toBe('function');
    });

    it('exports loadAnimation', () => {
      expect(loadAnimation).toBeDefined();
      expect(typeof loadAnimation).toBe('function');
    });

    it('exports parseAnimation', () => {
      expect(parseAnimation).toBeDefined();
      expect(typeof parseAnimation).toBe('function');
    });

    it('exports renderLottieFrame', () => {
      expect(renderLottieFrame).toBeDefined();
      expect(typeof renderLottieFrame).toBe('function');
    });

    it('exports createLottiePlayer', () => {
      expect(createLottiePlayer).toBeDefined();
      expect(typeof createLottiePlayer).toBe('function');
    });

    it('exports markerToFrame', () => {
      expect(markerToFrame).toBeDefined();
      expect(typeof markerToFrame).toBe('function');
    });
  });

  describe('parseAnimation', () => {
    it('parses a simple lottie animation into a model', () => {
      const model = parseAnimation(simpleRectAnimation);
      expect(model.fps).toBe(30);
      expect(model.width).toBe(100);
      expect(model.height).toBe(100);
      expect(model.durationInFrames).toBe(30);
      expect(model.layers).toHaveLength(1);
      expect(model.layers[0].name).toBe('Rect Layer');
      expect(model.layers[0].type).toBe('shape');
      expect(model.markers).toHaveLength(2);
      expect(model.markers[0].name).toBe('start');
      expect(model.markers[1].name).toBe('mid');
    });

    it('parses JSON string input', () => {
      const model = parseAnimationJson(JSON.stringify(simpleRectAnimation));
      expect(model.fps).toBe(30);
      expect(model.layers).toHaveLength(1);
    });

    it('computes duration from layers when op missing', () => {
      const anim = { ...simpleRectAnimation };
      delete anim.op;
      anim.layers[0].op = 45;
      const model = parseAnimation(anim);
      expect(model.durationInFrames).toBe(45);
    });
  });

  describe('renderLottieFrame', () => {
    it('renders a frame without throwing', () => {
      const model = parseAnimation(simpleRectAnimation);
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d') as any;
      expect(() => renderLottieFrame(ctx, model, 0)).not.toThrow();
      expect(() => renderLottieFrame(ctx, model, 15)).not.toThrow();
      expect(() => renderLottieFrame(ctx, model, 30)).not.toThrow();
    });

    it('skips inactive layers', () => {
      const model = parseAnimation(simpleRectAnimation);
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d') as any;
      // Frame outside layer range should not throw.
      expect(() => renderLottieFrame(ctx, model, 100)).not.toThrow();
    });
  });

  describe('createLottiePlayer', () => {
    it('creates playback controls', () => {
      const model = parseAnimation(simpleRectAnimation);
      const controls = createLottiePlayer(model);
      expect(controls.frame).toBe(0);
      expect(controls.totalFrames).toBe(30);
      expect(controls.isPlaying).toBe(false);
      expect(controls.isLoaded).toBe(true);
      expect(controls.markers).toEqual(['start', 'mid']);
    });

    it('play / pause / seekFrame', () => {
      const model = parseAnimation(simpleRectAnimation);
      const controls = createLottiePlayer(model);
      controls.play();
      expect(controls.isPlaying).toBe(true);
      controls.pause();
      expect(controls.isPlaying).toBe(false);
      controls.seekFrame(10);
      expect(controls.frame).toBe(10);
    });

    it('seekTime converts seconds to frames', () => {
      const model = parseAnimation(simpleRectAnimation);
      const controls = createLottiePlayer(model);
      controls.seekTime(0.5); // 0.5s * 30fps = 15 frames
      expect(controls.frame).toBe(15);
      expect(controls.time).toBe(0.5);
    });

    it('goToMarker finds marker by name', () => {
      const model = parseAnimation(simpleRectAnimation);
      const controls = createLottiePlayer(model);
      expect(controls.goToMarker('mid')).toBe(true);
      // 'mid' at 1s * 30fps = 30 frames
      expect(controls.frame).toBe(30);
      expect(controls.goToMarker('nonexistent')).toBe(false);
    });

    it('setSpeed and setLoop', () => {
      const model = parseAnimation(simpleRectAnimation);
      const controls = createLottiePlayer(model);
      controls.setSpeed(2);
      controls.setLoop(false);
      expect(controls.isPlaying).toBe(false);
    });

    it('destroy stops playback', () => {
      const model = parseAnimation(simpleRectAnimation);
      const controls = createLottiePlayer(model);
      controls.destroy();
      expect(controls.isPlaying).toBe(false);
    });

    it('markerToFrame returns null for missing marker', () => {
      const model = parseAnimation(simpleRectAnimation);
      expect(markerToFrame(model, 'start')).toBe(0);
      expect(markerToFrame(model, 'missing')).toBeNull();
    });
  });

  describe('Lottie component', () => {
    it('renders Lottie component (defined)', () => {
      expect(Lottie).toBeDefined();
    });
  });
});
