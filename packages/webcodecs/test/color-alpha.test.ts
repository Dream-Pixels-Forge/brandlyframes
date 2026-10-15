import { describe, it, expect } from 'vitest';
import { detectAlphaFromCodec, parseColorSpace, alphaBlendOver } from '../src/color-alpha';
import { probeVideoFallback } from '../src/probe-video';
import type { ProbeableVideoElement } from '../src/probe-video';

/** Build a mock element satisfying the minimal structural probe interface. */
const mockElement = (overrides: Partial<ProbeableVideoElement> = {}): ProbeableVideoElement => ({
  duration: 2,
  videoWidth: 1920,
  videoHeight: 1080,
  ...overrides,
});

describe('detectAlphaFromCodec [BF-057]', () => {
  it('detects VP9 alpha profile (second dot-segment 02) as premultiplied', () => {
    expect(detectAlphaFromCodec('vp09.02.10.10.01.09.16.09.0')).toEqual({
      hasAlpha: true,
      mode: 'premultiplied',
    });
  });

  it('treats VP9 non-alpha profiles 00/01 as opaque', () => {
    expect(detectAlphaFromCodec('vp09.00.10.08')).toEqual({ hasAlpha: false, mode: null });
    expect(detectAlphaFromCodec('vp09.01.10.08')).toEqual({ hasAlpha: false, mode: null });
  });

  it('detects ProRes 4444 (ap4h) as straight alpha', () => {
    expect(detectAlphaFromCodec('ap4h')).toEqual({ hasAlpha: true, mode: 'straight' });
  });

  it('treats ProRes 422 variants as opaque', () => {
    for (const fourcc of ['apcn', 'apcs', 'apco', 'apch']) {
      expect(detectAlphaFromCodec(fourcc)).toEqual({ hasAlpha: false, mode: null });
    }
  });

  it('treats AVC/HEVC/VP8 as opaque', () => {
    expect(detectAlphaFromCodec('avc1.640028')).toEqual({ hasAlpha: false, mode: null });
    expect(detectAlphaFromCodec('hev1.1.6.L93.B0')).toEqual({ hasAlpha: false, mode: null });
    expect(detectAlphaFromCodec('hvc1.1.6.L93.B0')).toEqual({ hasAlpha: false, mode: null });
    expect(detectAlphaFromCodec('vp8')).toEqual({ hasAlpha: false, mode: null });
  });

  it('returns not-alpha for empty/unknown codec strings', () => {
    expect(detectAlphaFromCodec('')).toEqual({ hasAlpha: false, mode: null });
    expect(detectAlphaFromCodec('garbage-codec')).toEqual({ hasAlpha: false, mode: null });
  });

  it('matches case-insensitively', () => {
    expect(detectAlphaFromCodec('VP09.02.10.10.01.09.16.09.0')).toEqual({
      hasAlpha: true,
      mode: 'premultiplied',
    });
    expect(detectAlphaFromCodec('AP4H')).toEqual({ hasAlpha: true, mode: 'straight' });
    expect(detectAlphaFromCodec('AVC1.640028')).toEqual({ hasAlpha: false, mode: null });
  });
});

describe('parseColorSpace [BF-057]', () => {
  it('maps sRGB tokens', () => {
    expect(parseColorSpace('srgb')).toBe('srgb');
    expect(parseColorSpace('sRGB')).toBe('srgb');
    expect(parseColorSpace('iec61966-2-1')).toBe('srgb');
  });

  it('maps BT.709 / Rec.709 tokens', () => {
    expect(parseColorSpace('bt709')).toBe('bt709');
    expect(parseColorSpace('bt.709')).toBe('bt709');
    expect(parseColorSpace('rec709')).toBe('bt709');
    expect(parseColorSpace('rec.709')).toBe('bt709');
  });

  it('maps BT.2020 / Rec.2020 tokens', () => {
    expect(parseColorSpace('bt2020')).toBe('bt2020');
    expect(parseColorSpace('bt.2020')).toBe('bt2020');
    expect(parseColorSpace('rec2020')).toBe('bt2020');
    expect(parseColorSpace('rec.2020')).toBe('bt2020');
  });

  it('maps Display P3 tokens', () => {
    expect(parseColorSpace('display-p3')).toBe('display-p3');
    expect(parseColorSpace('p3')).toBe('display-p3');
    expect(parseColorSpace('displayp3')).toBe('display-p3');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(parseColorSpace('  BT.709  ')).toBe('bt709');
    expect(parseColorSpace('Display-P3')).toBe('display-p3');
  });

  it('falls back to unknown for undefined/empty/unrecognized input', () => {
    expect(parseColorSpace(undefined)).toBe('unknown');
    expect(parseColorSpace('')).toBe('unknown');
    expect(parseColorSpace('   ')).toBe('unknown');
    expect(parseColorSpace('garbage')).toBe('unknown');
  });
});

describe('alphaBlendOver [BF-057]', () => {
  it('returns the foreground exactly when fully opaque (a=255)', () => {
    expect(alphaBlendOver({ r: 10, g: 20, b: 30, a: 255 }, { r: 200, g: 210, b: 220 })).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
  });

  it('returns the background exactly when fully transparent (a=0)', () => {
    expect(alphaBlendOver({ r: 10, g: 20, b: 30, a: 0 }, { r: 200, g: 210, b: 220 })).toEqual({
      r: 200,
      g: 210,
      b: 220,
    });
  });

  it('blends half-alpha red over blue to ~{128,0,127} (±1 rounding tolerance)', () => {
    const out = alphaBlendOver({ r: 255, g: 0, b: 0, a: 128 }, { r: 0, g: 0, b: 255 });
    expect(Math.abs(out.r - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(out.g - 0)).toBeLessThanOrEqual(1);
    expect(Math.abs(out.b - 127)).toBeLessThanOrEqual(1);
  });
});

describe('probeVideoFallback color/alpha wiring [BF-057]', () => {
  it('derives alphaMode from an alpha codec hint', () => {
    const probed = probeVideoFallback(mockElement(), { codec: 'ap4h' });
    expect(probed.hasAlpha).toBe(true);
    expect(probed.alphaMode).toBe('straight');
  });

  it('derives premultiplied alpha from a VP9-alpha codec hint', () => {
    const probed = probeVideoFallback(mockElement(), {
      codec: 'vp09.02.10.10.01.09.16.09.0',
    });
    expect(probed.hasAlpha).toBe(true);
    expect(probed.alphaMode).toBe('premultiplied');
  });

  it('reports null alphaMode for opaque codecs', () => {
    const probed = probeVideoFallback(mockElement(), { codec: 'avc1.42E01E' });
    expect(probed.hasAlpha).toBe(false);
    expect(probed.alphaMode).toBeNull();
  });

  it('normalizes the colorSpace hint to a closed ColorSpace token', () => {
    expect(probeVideoFallback(mockElement(), { colorSpace: 'Display-P3' }).colorSpace).toBe(
      'display-p3',
    );
    expect(probeVideoFallback(mockElement(), { colorSpace: 'garbage' }).colorSpace).toBe(
      'unknown',
    );
  });
});
