export interface Lut {
  name: string;
  size: number;
  data: Float32Array;
}

export interface FilmGrainOptions {
  intensity: number;
  monochrome: boolean;
}

export interface LensDistortionOptions {
  k1: number;
  k2: number;
  centerX: number;
  centerY: number;
}

export interface BloomOptions {
  threshold: number;
  intensity: number;
  radius: number;
}

export interface BlendModeOptions {
  mode: 'normal' | 'multiply' | 'screen' | 'overlay';
  opacity: number;
}

export function loadLut(_buffer: ArrayBuffer): Lut {
  return { name: '', size: 0, data: new Float32Array(0) };
}

export function applyFilmGrain(_options: FilmGrainOptions): string {
  return 'film-grain';
}

export function applyLensDistortion(_options: LensDistortionOptions): string {
  return 'lens-distortion';
}

export function applyBloom(_options: BloomOptions): string {
  return 'bloom';
}

export function applyBlendMode(_options: BlendModeOptions): string {
  return 'blend-mode';
}
