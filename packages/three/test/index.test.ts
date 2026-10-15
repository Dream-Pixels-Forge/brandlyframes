/**
 * Three.js integration tests — [BF-071]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ThreeRenderer,
  useThree,
  createFrameTexture,
  createCanvasTexture,
  ThreeText,
  Primitive,
} from '../src/index';

// Mock document for tests
global.document = {
  createElement: vi.fn((tag) => {
    if (tag === 'canvas') {
      return { width: 0, height: 0, getContext: () => ({}) };
    }
    return {};
  }),
} as any;

// Mock Three.js
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Scene: vi.fn(() => ({
      add: vi.fn(),
      children: [],
    })),
    PerspectiveCamera: vi.fn(() => ({
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    })),
    OrthographicCamera: vi.fn(() => ({
      left: -5, right: 5, top: 5, bottom: -5, near: -1000, far: 1000,
      updateProjectionMatrix: vi.fn(),
    })),
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      autoClear: true,
    })),
    Scene: vi.fn(),
    BoxGeometry: vi.fn(),
    MeshNormalMaterial: vi.fn(),
    Mesh: vi.fn(() => ({
      rotation: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    })),
    Texture: vi.fn(),
    CanvasTexture: vi.fn(),
    TextGeometry: vi.fn(() => ({
      center: vi.fn(),
    })),
    Font: vi.fn(),
    Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0, copy: vi.fn(), set: vi.fn() })),
    Euler: vi.fn(),
    Color: vi.fn(),
    MeshNormalMaterial: vi.fn(),
    BufferGeometry: vi.fn(() => ({
      center: vi.fn(),
      copy: vi.fn(),
    })),
  };
});

// Mock brandlyframes hooks
vi.mock('brandlyframes', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1920, height: 1080, durationInFrames: 90 })),
}));

describe('Three.js integration', () => {
  it('exports ThreeRenderer', () => {
    expect(ThreeRenderer).toBeDefined();
    expect(typeof ThreeRenderer).toBe('function');
  });

  it('exports useThree hook', () => {
    expect(useThree).toBeDefined();
    expect(typeof useThree).toBe('function');
  });

  it('exports createFrameTexture', () => {
    expect(createFrameTexture).toBeDefined();
    expect(typeof createFrameTexture).toBe('function');
  });

  it('exports createCanvasTexture', () => {
    expect(createCanvasTexture).toBeDefined();
    expect(typeof createCanvasTexture).toBe('function');
  });

  it('exports ThreeText', () => {
    expect(ThreeText).toBeDefined();
    expect(typeof ThreeText).toBe('function');
  });

  it('exports Primitive', () => {
    expect(Primitive).toBeDefined();
    expect(typeof Primitive).toBe('function');
  });
});

describe('useThree hook', () => {
  it('returns frame, fps, width, height, time', () => {
    const result = useThree();
    expect(result).toHaveProperty('frame');
    expect(result).toHaveProperty('fps');
    expect(result).toHaveProperty('width');
    expect(result).toHaveProperty('height');
    expect(result).toHaveProperty('time');
  });
});

describe('createFrameTexture', () => {
  it('creates a texture from source', () => {
    const mockRenderer = {} as any;
    const mockSource = document.createElement('canvas');
    const texture = createFrameTexture(mockRenderer, mockSource);
    expect(texture).toBeDefined();
  });
});

describe('createCanvasTexture', () => {
  it('creates a canvas texture', () => {
    const drawFn = vi.fn();
    const texture = createCanvasTexture(100, 100, drawFn, 0);
    expect(texture).toBeDefined();
    expect(drawFn).toHaveBeenCalled();
  });
});

describe('ThreeText', () => {
  it('exports ThreeText component', () => {
    expect(ThreeText).toBeDefined();
    expect(typeof ThreeText).toBe('function');
  });
});

describe('Primitive', () => {
  it('exports Primitive component', () => {
    expect(Primitive).toBeDefined();
    expect(typeof Primitive).toBe('function');
  });
});
