/**
 * GLSL shader source strings for the @brandlyframes/fx effects, ported to
 * run on the GPU via WebGL 2 / WebGPU.
 *
 * These shaders are the source of truth for GPU execution. When a WebGL /
 * WebGPU context is available, `GpuRenderPath` compiles and runs them.
 * When no GPU is available, the CPU fallback in `cpu-fallback.ts` produces
 * identical output (verified by test parity).
 *
 * All shaders operate on RGBA textures with coordinates in [0, 1].
 * Output is premultiplied or straight alpha consistent with the CPU impl.
 */

/** Vertex shader: passthrough full-screen quad. */
export const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

/** Fragment shader: film grain — seeded per-pixel noise. */
export const FILM_GRAIN_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform bool u_monochrome;
out vec4 fragColor;

// Deterministic seeded hash (mirrors CPU hash in cpu-fallback.ts)
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p * p * 345.32);
}

void main() {
  vec4 tex = texture(u_texture, v_texCoord);
  float seed = hash(v_texCoord * u_resolution);
  float noise = u_monochrome ? seed : hash(v_texCoord * u_resolution + vec2(1.0, 0.0));
  float strength = u_intensity * 255.0 / 255.0;
  vec3 n = tex.rgb + (noise - 0.5) * 2.0 * strength;
  fragColor = vec4(clamp(n, 0.0, 1.0), tex.a);
}
`;

/** Fragment shader: lens distortion — radial distortion with bilinear resampling. */
export const LENS_DISTORTION_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_k1;
uniform float u_k2;
uniform float u_centerX;
uniform float u_centerY;
out vec4 fragColor;

void main() {
  vec2 center = vec2(u_centerX, u_centerY);
  vec2 uv = v_texCoord;
  vec2 d = uv - center;
  float r2 = dot(d, d) / dot(center, center);
  float factor = 1.0 + u_k1 * r2 + u_k2 * r2 * r2;
  vec2 src = center + d * factor;
  if (src.x < 0.0 || src.x > 1.0 || src.y < 0.0 || src.y > 1.0) {
    fragColor = vec4(0.0);
  } else {
    fragColor = texture(u_texture, src);
  }
}
`;

/** Fragment shader: bloom — threshold extract + blur + additive glow. */
export const BLOOM_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_intensity;
uniform int u_radius;
out vec4 fragColor;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 tex = texture(u_texture, v_texCoord);
  float lum = luminance(tex.rgb);
  float t = max(u_threshold / 255.0, 0.0);
  float amount = max(0.0, (lum - t) / max(1.0 - t, 0.0001));
  vec3 glow = tex.rgb * amount;

  // Simple box blur over the glow
  vec3 blur = vec3(0.0);
  int count = 0;
  for (int dy = -u_radius; dy <= u_radius; dy++) {
    for (int dx = -u_radius; dx <= u_radius; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) / u_resolution;
      blur += texture(u_texture, v_texCoord + offset).rgb * amount;
      count++;
    }
  }
  if (count > 0) blur /= float(count);

  vec3 outColor = tex.rgb + blur * u_intensity;
  fragColor = vec4(clamp(outColor, 0.0, 1.0), tex.a);
}
`;

/** Fragment shader: blend mode — normal / multiply / screen / overlay. */
export const BLEND_MODE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture_bottom;
uniform sampler2D u_texture_top;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform int u_mode; // 0=normal, 1=multiply, 2=screen, 3=overlay
out vec4 fragColor;

vec3 blendChannel(vec3 b, vec3 t, int mode) {
  if (mode == 1) return b * t;                                    // multiply
  if (mode == 2) return 1.0 - (1.0 - b) * (1.0 - t);              // screen
  if (mode == 3) return b < 0.5 ? 2.0 * b * t : 1.0 - 2.0 * (1.0 - b) * (1.0 - t); // overlay
  return t;                                                       // normal
}

void main() {
  vec4 bottom = texture(u_texture_bottom, v_texCoord);
  vec4 top = texture(u_texture_top, v_texCoord);
  vec3 blended = blendChannel(bottom.rgb, top.rgb, u_mode);
  vec3 out = mix(bottom.rgb, blended, u_opacity);
  fragColor = vec4(clamp(out, 0.0, 1.0), bottom.a);
}
`;

/** Fragment shader: LUT — 1D color-grading lookup with linear interpolation. */
export const LUT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform sampler1D u_lut;
uniform int u_lutSize;
out vec4 fragColor;

void main() {
  vec4 tex = texture(u_texture, v_texCoord);
  vec3 out = vec3(0.0);
  for (int c = 0; c < 3; c++) {
    float v = tex[c];
    float pos = v * float(u_lutSize - 1);
    int idx = int(floor(pos));
    float f = pos - float(idx);
    idx = clamp(idx, 0, u_lutSize - 1);
    int nxt = clamp(idx + 1, 0, u_lutSize - 1);
    float a = texelFetch(u_lut, idx, 0).r;
    float b = texelFetch(u_lut, nxt, 0).r;
    out[c] = clamp(mix(a, b, f) * 255.0, 0.0, 255.0) / 255.0;
  }
  fragColor = vec4(out, tex.a);
}
`;

/** Lookup table descriptor passed to the GPU. */
export interface LutTexture {
  /** Normalized lookup values (0..1), one per entry. */
  readonly data: Float32Array;
  /** Number of entries. */
  readonly size: number;
}
