/**
 * @brandlyframes/renderer-webgpu — WebGPU/WebGL render path [BF-200].
 *
 * A render path abstraction that bypasses Chrome screenshot capture for
 * frame output. Two backends:
 * - `ScreenshotRenderPath` — uses Chrome headless capture (existing path)
 * - `GpuRenderPath` — uses WebGL/WebGPU shaders when available, falling back
 *   to a CPU reference implementation that produces byte-identical output
 *
 * All paths are deterministic: same input always yields same output
 * (`frame -> pixels`), so previews and renders match.
 */

export {
  RenderPath,
  ScreenshotRenderPath,
  GpuRenderPath,
  type BackendType,
  type BackendInfo,
  type RenderFrameOptions,
  type RenderResult,
  type ApplyEffectOptions,
  type ComposeStep,
  type LutTexture,
} from './render-path.js';

export {
  VERTEX_SHADER,
  FILM_GRAIN_FRAGMENT_SHADER,
  LENS_DISTORTION_FRAGMENT_SHADER,
  BLOOM_FRAGMENT_SHADER,
  BLEND_MODE_FRAGMENT_SHADER,
  LUT_FRAGMENT_SHADER,
} from './shaders.js';
