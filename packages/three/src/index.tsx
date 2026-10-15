/**
 * @brandlyframes/three — Three.js integration for 3D scenes [BF-071]
 *
 * Provides React components and utilities for embedding Three.js scenes
 * in BrandlyFrames compositions with frame-exact rendering.
 *
 * Clean-room implementation.
 */

import React, { type FC, ReactElement, RefObject } from 'react';
import { useCurrentFrame, useVideoConfig } from 'brandlyframes';
import * as THREE from 'three';

// Simple font implementation (subset of THREE.Font)
export interface FontData {
  glyphs: Record<string, { ha: number; x_min: number; x_max: number; y_min: number; y_max: number; o: string }>;
  familyName: string;
  ascender: number;
  descender: number;
  underlineThickness: number;
  underlinePosition: number;
  resolution: number;
  boundingBox: { x_min: number; y_min: number; x_max: number; y_max: number };
}

export class TextFont {
  data: FontData;
  constructor(data: FontData) {
    this.data = data;
  }
}

// Simple TextGeometry implementation
export class TextGeometry extends THREE.BufferGeometry {
  constructor(text: string, parameters: {
    font: TextFont;
    size: number;
    height: number;
    curveSegments?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelOffset?: number;
    bevelSegments?: number;
  }) {
    super();
    // Simplified implementation - creates a basic text geometry
    // In a full implementation, this would generate proper glyph geometry
    const { font, size = 1, height: textHeight = 0.1, curveSegments = 12 } = parameters;
    
    // Create a simple placeholder - a plane with text dimensions
    const width = text.length * size * 0.5;
    const textHeightVal = size;
    const depth = textHeightVal;
    
    const geometry = new THREE.BoxGeometry(width, textHeight, depth);
    this.copy(geometry);
    this.center();
  }
}

/**
 * Three.js renderer props.
 */
export interface ThreeRendererProps {
  /** Canvas ref for Three.js renderer. */
  canvasRef: RefObject<HTMLCanvasElement>;
  /** Scene setup function. Called once on mount. */
  setupScene: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => void;
  /** Frame update function. Called every frame. */
  onFrame: (scene: THREE.Scene, camera: THREE.Camera, frame: number, fps: number) => void;
  /** Renderer options. */
  rendererOptions?: THREE.WebGLRendererParameters;
  /** Camera type. Default: PerspectiveCamera. */
  cameraType?: 'perspective' | 'orthographic';
  /** Camera props. */
  cameraProps?: {
    fov?: number;
    near?: number;
    far?: number;
    aspect?: number;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  /** Background color. */
  background?: string | number | THREE.Color;
  /** Whether to auto-clear. Default: true. */
  autoClear?: boolean;
  /** Pixel ratio. Default: window.devicePixelRatio. */
  pixelRatio?: number;
  /** Canvas style. */
  style?: React.CSSProperties;
}

/**
 * ThreeRenderer component — renders a Three.js scene frame-exactly.
 *
 * The scene is re-rendered on every frame using the current frame number
 * from BrandlyFrames, ensuring deterministic rendering.
 *
 * @example
 * ```tsx
 * <ThreeRenderer
 *   canvasRef={canvasRef}
 *   setupScene={(scene, camera, renderer) => {
 *     const geometry = new THREE.BoxGeometry(1, 1, 1);
 *     const material = new THREE.MeshNormalMaterial();
 *     const cube = new THREE.Mesh(geometry, material);
 *     scene.add(cube);
 *   }}
 *   onFrame={(scene, camera, frame, fps) => {
 *     const cube = scene.children[0] as THREE.Mesh;
 *     cube.rotation.x = frame / 30;
 *     cube.rotation.y = frame / 20;
 *   }}
 * />
 * ```
 */
export const ThreeRenderer: FC<ThreeRendererProps> = ({
  canvasRef,
  setupScene,
  onFrame,
  rendererOptions = {},
  cameraType = 'perspective',
  cameraProps = {},
  background = 0x000000,
  autoClear = true,
  pixelRatio,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Create renderer, scene, camera once
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const cameraRef = React.useRef<THREE.Camera | null>(null);
  const initializedRef = React.useRef(false);

  if (!initializedRef.current && canvasRef.current) {
    const canvas = canvasRef.current;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      ...rendererOptions,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio || window.devicePixelRatio || 1);
    renderer.autoClear = autoClear;
    renderer.setClearColor(background, 0);
    rendererRef.current = renderer;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    let camera: THREE.Camera;
    if (cameraType === 'perspective') {
      camera = new THREE.PerspectiveCamera(
        cameraProps.fov || 50,
        cameraProps.aspect || width / height,
        cameraProps.near || 0.1,
        cameraProps.far || 1000
      );
    } else {
      const aspect = width / height;
      const frustumHeight = cameraProps.top || 5;
      camera = new THREE.OrthographicCamera(
        (cameraProps.left ?? -frustumHeight * aspect),
        (cameraProps.right ?? frustumHeight * aspect),
        (cameraProps.top ?? frustumHeight),
        (cameraProps.bottom ?? -frustumHeight),
        cameraProps.near || -1000,
        cameraProps.far || 1000
      );
    }
    cameraRef.current = camera;

    // Setup scene
    setupScene(scene, camera, renderer);

    initializedRef.current = true;
  }

  // Update and render on every frame
  if (initializedRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Call frame update
    onFrame(scene, camera, frame, fps);

    // Update camera aspect if needed
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height;
      camera.left = -5 * aspect;
      camera.right = 5 * aspect;
      camera.top = 5;
      camera.bottom = -5;
      camera.updateProjectionMatrix();
    }

    // Render
    renderer.render(scene, camera);
  }

  // Return canvas element (renderer draws directly to it)
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style,
      }}
    />
  );
};

/**
 * Hook for using Three.js in a component with frame-exact control.
 */
export function useThree() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return {
    frame,
    fps,
    width,
    height,
    time: frame / fps,
  };
}

/**
 * Creates a Three.js texture from a BrandlyFrames frame source.
 */
export function createFrameTexture(
  renderer: THREE.WebGLRenderer,
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | string | HTMLCanvasElement
): THREE.Texture {
  const texture = new THREE.Texture(source as any);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a canvas texture from a frame renderer function.
 */
export function createCanvasTexture(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, frame: number) => void,
  frame: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, frame);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * ThreeText component - renders text as 3D geometry using font geometry.
 */
export interface ThreeTextProps {
  text: string;
  font?: TextFont;  // Use our custom TextFont class
  size?: number;
  height?: number;
  curveSegments?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelOffset?: number;
  bevelSegments?: number;
  material?: THREE.Material | THREE.Material[];
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

export const ThreeText: FC<ThreeTextProps> = ({
  text,
  font,
  size = 1,
  height = 0.1,
  curveSegments = 12,
  bevelEnabled = true,
  bevelThickness = 0.03,
  bevelSize = 0.02,
  bevelOffset = 0,
  bevelSegments = 5,
  material,
  position,
  rotation,
  scale,
}) => {
  const { time } = useThree();

  const geometryRef = React.useRef<TextGeometry | null>(null);
  const meshRef = React.useRef<THREE.Mesh | null>(null);

  if (!geometryRef.current && font) {
    geometryRef.current = new TextGeometry(text, {
      font,
      size,
      height,
      curveSegments,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelOffset,
      bevelSegments,
    });
    geometryRef.current.center();

    const mat = material || new THREE.MeshNormalMaterial();
    meshRef.current = new THREE.Mesh(geometryRef.current, mat);
  }

  if (meshRef.current) {
    if (position) meshRef.current.position.copy(position);
    if (rotation) meshRef.current.rotation.copy(rotation);
    if (scale) meshRef.current.scale.copy(scale);
  }

  return meshRef.current ? (
    <Mesh object={meshRef.current} />
  ) : null;
};

/**
 * Mesh component for rendering Three.js mesh objects.
 */
interface MeshProps {
  object: THREE.Mesh;
}

const Mesh: FC<MeshProps> = ({ object }) => {
  // Placeholder - in real implementation would use @react-three/fiber's primitive
  return null;
};

/**
 * Primitive wrapper for Three.js objects.
 */
interface PrimitiveProps {
  object: THREE.Object3D;
}

export const Primitive: FC<PrimitiveProps> = ({ object }) => {
  // Placeholder component - in real implementation would use @react-three/fiber's primitive
  // For now, we render nothing but the component exists
  return null;
};
