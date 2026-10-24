/**
 * Encoder capabilities (BF-425): hardware-encoder recommendation + slow-codec
 * warnings. FFmpeg probe is injected — no real FFmpeg, no network.
 */

import { describe, expect, it } from 'vitest';
import { getEncoderCapabilities } from '../src/encoder-capabilities';

describe('getEncoderCapabilities (BF-425)', () => {
  it('recommends the first hardware encoder found', async () => {
    const caps = await getEncoderCapabilities(async () => [
      'libx264',
      'h264_nvenc',
      'hevc_nvenc',
    ]);
    expect(caps.recommended).toBe('h264_nvenc');
    expect(caps.hardware).toContain('h264_nvenc');
    expect(caps.hardware).toContain('hevc_nvenc');
    expect(caps.available).toContain('libx264');
  });

  it('recommends videotoolbox on macOS-like encoder sets', async () => {
    const caps = await getEncoderCapabilities(async () => [
      'libx264',
      'h264_videotoolbox',
    ]);
    expect(caps.recommended).toBe('h264_videotoolbox');
    expect(caps.hardware).toEqual(['h264_videotoolbox']);
  });

  it('recommends null when no hardware encoder is available', async () => {
    const caps = await getEncoderCapabilities(async () => ['libx264', 'libvpx-vp9']);
    expect(caps.recommended).toBeNull();
    expect(caps.hardware).toEqual([]);
  });

  it('warns when VP8/VP9 slow codecs are present', async () => {
    const caps = await getEncoderCapabilities(async () => [
      'libx264',
      'libvpx-vp9',
    ]);
    expect(caps.warns.some((w) => w.includes('libvpx-vp9') && w.includes('slow'))).toBe(
      true,
    );
  });

  it('warns when no hardware encoder and no slow codec', async () => {
    const caps = await getEncoderCapabilities(async () => ['libx264']);
    expect(caps.recommended).toBeNull();
    expect(caps.warns.some((w) => w.includes('no hardware encoder'))).toBe(true);
  });

  it('reports empty warns when the probe finds nothing', async () => {
    const caps = await getEncoderCapabilities(async () => []);
    expect(caps.recommended).toBeNull();
    expect(caps.available).toEqual([]);
    expect(caps.hardware).toEqual([]);
    expect(caps.warns).toEqual([]);
  });
});
