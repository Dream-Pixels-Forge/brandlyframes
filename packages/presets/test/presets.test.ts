/**
 * BF-426: Platform export preset tests.
 *
 * Verifies: preset definitions, lookup, platform names, and preset values.
 */

import { describe, expect, it } from 'vitest';
import {
  EXPORT_PRESETS,
  getExportPreset,
  PLATFORM_NAMES,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Preset tests
// ---------------------------------------------------------------------------

describe('export presets', () => {
  it('defines all six platform presets', () => {
    expect(EXPORT_PRESETS).toHaveLength(6);
    expect(EXPORT_PRESETS.map((p) => p.name)).toEqual([
      'web-safe',
      'youtube',
      'tiktok',
      'instagram',
      'whatsapp',
      'broadcast',
    ]);
  });

  it('PLATFORM_NAMES matches presets', () => {
    expect(PLATFORM_NAMES).toEqual([
      'web-safe',
      'youtube',
      'tiktok',
      'instagram',
      'whatsapp',
      'broadcast',
    ]);
  });

  it('getExportPreset throws on unknown name', () => {
    expect(() => getExportPreset('vimeo' as never)).toThrow(
      'Unknown export preset: vimeo',
    );
  });

  it('web-safe preset uses yuv420p and main profile', () => {
    const preset = getExportPreset('web-safe');
    expect(preset.pixelFormat).toBe('yuv420p');
    expect(preset.profile).toBe('main');
    expect(preset.level).toBe('4.0');
    expect(preset.crf).toBe(23);
    expect(preset.faststart).toBe(true);
  });

  it('youtube preset targets 1080p with high profile', () => {
    const preset = getExportPreset('youtube');
    expect(preset.width).toBe(1920);
    expect(preset.height).toBe(1080);
    expect(preset.profile).toBe('high');
    expect(preset.audioBitrateKbps).toBe(192);
    expect(preset.faststart).toBe(true);
  });

  it('tiktok preset is vertical 9:16', () => {
    const preset = getExportPreset('tiktok');
    expect(preset.width).toBe(1080);
    expect(preset.height).toBe(1920);
    expect(preset.aspectRatio).toBeCloseTo(9 / 16, 4);
    expect(preset.faststart).toBe(true);
  });

  it('instagram preset is square 1:1', () => {
    const preset = getExportPreset('instagram');
    expect(preset.width).toBe(1080);
    expect(preset.height).toBe(1080);
    expect(preset.aspectRatio).toBe(1);
    expect(preset.faststart).toBe(true);
  });

  it('whatsapp preset uses small file size settings', () => {
    const preset = getExportPreset('whatsapp');
    expect(preset.width).toBe(720);
    expect(preset.height).toBe(1280);
    expect(preset.crf).toBe(28);
    expect(preset.audioBitrateKbps).toBe(96);
    expect(preset.faststart).toBe(true);
  });

  it('broadcast preset uses yuv422p and high bitrate', () => {
    const preset = getExportPreset('broadcast');
    expect(preset.pixelFormat).toBe('yuv422p');
    expect(preset.bitrateKbps).toBe(50000);
    expect(preset.profile).toBeNull();
    expect(preset.level).toBeNull();
    expect(preset.faststart).toBe(false);
    expect(preset.audioCodec).toBe('pcm');
  });

  it('all presets have required fields', () => {
    for (const preset of EXPORT_PRESETS) {
      expect(preset.name).toBeDefined();
      expect(preset.label).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(preset.codec).toBeDefined();
      expect(preset.audioCodec).toBeDefined();
      expect(preset.audioBitrateKbps).toBeGreaterThan(0);
      expect(preset.audioSampleRate).toBeGreaterThan(0);
      expect(preset.audioChannels).toBeGreaterThan(0);
      expect(Array.isArray(preset.extraFlags)).toBe(true);
      expect(typeof preset.faststart).toBe('boolean');
      expect(typeof preset.hwaccel).toBe('boolean');
    }
  });

  it('presets are deterministic', () => {
    const a = getExportPreset('youtube');
    const b = getExportPreset('youtube');
    expect(a).toEqual(b);
  });
});
