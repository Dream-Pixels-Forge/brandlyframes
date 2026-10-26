/**
 * BF-203: standard benchmark scenes.
 *
 * Three deterministic in-process scenes (pure `frame -> pixels`) used by
 * the side-by-side render-path benchmark. Identifying a scene by URL
 * (`benchmark-scene://<id>`) lets real render paths — screenshot or
 * WebGPU/GPU — address the same scene through the existing
 * `renderFrame({ url, frame, width, height })` seam.
 */

const SCENE_URL_PREFIX = 'benchmark-scene://';

/** A standard benchmark scene: a deterministic pixel generator. */
export interface StandardScene {
  /** Scene id used in `benchmark-scene://<id>` URLs. */
  readonly id: string;
  /** Human-readable name for reports. */
  readonly name: string;
  /** Render width for the benchmark (pixels). */
  readonly width: number;
  /** Render height for the benchmark (pixels). */
  readonly height: number;
  /** Frames rendered per benchmark run. */
  readonly frameCount: number;
}

/** The 3 standard benchmark scenes [BF-203]. */
export const STANDARD_SCENES: readonly StandardScene[] = [
  {
    id: 'gradient',
    name: 'Animated diagonal gradient',
    width: 640,
    height: 360,
    frameCount: 10,
  },
  {
    id: 'checkerboard',
    name: 'Animated checkerboard',
    width: 640,
    height: 360,
    frameCount: 10,
  },
  {
    id: 'shapes',
    name: 'Moving shapes over solid background',
    width: 640,
    height: 360,
    frameCount: 10,
  },
];

function sceneById(id: string): StandardScene {
  const scene = STANDARD_SCENES.find((s) => s.id === id);
  if (!scene) {
    throw new Error(
      `generateScenePixels: unknown scene "${id}" (known: ${STANDARD_SCENES.map((s) => s.id).join(', ')})`,
    );
  }
  return scene;
}

/**
 * Deterministic RGBA pixel generator for a scene frame.
 * Pure function of (scene, frame, width, height) — no time, no randomness.
 */
export function generateScenePixels(
  sceneId: string,
  frame: number,
  width: number,
  height: number,
): Uint8ClampedArray {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new RangeError(`generateScenePixels: frame must be a non-negative integer, got ${frame}`);
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError(`generateScenePixels: invalid dimensions ${width}x${height}`);
  }
  sceneById(sceneId); // validate early so callers fail fast on typos

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      switch (sceneId) {
        case 'gradient': {
          // Diagonal gradient whose phase drifts with the frame.
          const t = (x + y + frame * 4) / (width + height);
          pixels[i] = Math.floor(255 * t);
          pixels[i + 1] = Math.floor(255 * (1 - t));
          pixels[i + 2] = Math.floor(128 + 127 * Math.sin(t * Math.PI));
          break;
        }
        case 'checkerboard': {
          // Checkerboard cells slide one pixel per frame.
          const cell = ((x + y + frame) >> 4) & 1;
          const v = cell ? 235 : 20;
          pixels[i] = v;
          pixels[i + 1] = v;
          pixels[i + 2] = v;
          break;
        }
        case 'shapes': {
          // Two discs orbiting over a solid background.
          pixels[i] = 18;
          pixels[i + 1] = 24;
          pixels[i + 2] = 48;
          const angle = (frame / 60) * Math.PI * 2;
          const cx1 = width / 2 + Math.cos(angle) * (width / 4);
          const cy1 = height / 2 + Math.sin(angle) * (height / 4);
          const cx2 = width / 2 - Math.cos(angle) * (width / 4);
          const cy2 = height / 2 - Math.sin(angle) * (height / 4);
          const r = Math.min(width, height) / 8;
          const inDisc =
            (x - cx1) * (x - cx1) + (y - cy1) * (y - cy1) <= r * r ||
            (x - cx2) * (x - cx2) + (y - cy2) * (y - cy2) <= r * r;
          if (inDisc) {
            pixels[i] = 240;
            pixels[i + 1] = 90;
            pixels[i + 2] = 40;
          }
          break;
        }
      }
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

/** URL under which a render path addresses a scene. */
export function sceneUrl(sceneId: string): string {
  return `${SCENE_URL_PREFIX}${sceneId}`;
}

/** Parse a `benchmark-scene://<id>` URL back to the scene id. */
export function parseSceneUrl(url: string): string {
  if (!url.startsWith(SCENE_URL_PREFIX)) {
    throw new Error(`parseSceneUrl: "${url}" is not a benchmark scene URL`);
  }
  const id = url.slice(SCENE_URL_PREFIX.length);
  sceneById(id);
  return id;
}
