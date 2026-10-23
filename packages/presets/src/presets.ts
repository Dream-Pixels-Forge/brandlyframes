/**
 * @brandlyframes/presets — platform export presets [BF-426]
 *
 * Platform-specific export presets that set pixel format, profile, level,
 * bitrate, loudness and faststart so output plays everywhere — Safari,
 * phone, web, broadcast. All values are deterministic constants.
 */

import type { ExportPreset, PlatformName } from './types.js';

type PresetFields = Omit<
  ExportPreset,
  | 'name'
  | 'label'
  | 'description'
  | 'width'
  | 'height'
  | 'aspectRatio'
  | 'crf'
  | 'bitrateKbps'
  | 'profile'
  | 'level'
>;

const webCommon: PresetFields = {
  codec: 'h264',
  ffmpegPreset: 'medium',
  pixelFormat: 'yuv420p',
  audioCodec: 'aac',
  audioBitrateKbps: 128,
  audioSampleRate: 48000,
  audioChannels: 2,
  faststart: true,
  hwaccel: false,
  extraFlags: ['-movflags', '+faststart'],
  loudnessLufs: null,
};

const broadcastCommon: PresetFields = {
  codec: 'h264',
  ffmpegPreset: 'slow',
  pixelFormat: 'yuv422p',
  audioCodec: 'pcm',
  audioBitrateKbps: 1536,
  audioSampleRate: 48000,
  audioChannels: 2,
  faststart: false,
  hwaccel: false,
  extraFlags: [],
  loudnessLufs: null,
};

/** All export presets, indexed by platform name. */
export const EXPORT_PRESETS: readonly ExportPreset[] = [
  {
    name: 'web-safe',
    label: 'Web Safe',
    description: 'Maximum compatibility: plays in all browsers and on all devices',
    width: null,
    height: null,
    aspectRatio: null,
    crf: 23,
    bitrateKbps: null,
    profile: 'main',
    level: '4.0',
    ...webCommon,
  },
  {
    name: 'youtube',
    label: 'YouTube',
    description: '1080p H.264 upload optimized for YouTube processing',
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    crf: 20,
    bitrateKbps: null,
    profile: 'high',
    level: '4.1',
    ...webCommon,
    audioBitrateKbps: 192,
  },
  {
    name: 'tiktok',
    label: 'TikTok / Reels / Shorts',
    description: 'Vertical 9:16 mobile video, optimized for fast scrolling',
    width: 1080,
    height: 1920,
    aspectRatio: 9 / 16,
    crf: 22,
    bitrateKbps: null,
    profile: 'high',
    level: '4.1',
    ...webCommon,
    audioBitrateKbps: 128,
  },
  {
    name: 'instagram',
    label: 'Instagram',
    description: 'Square 1:1 feed video with web-safe codecs',
    width: 1080,
    height: 1080,
    aspectRatio: 1,
    crf: 23,
    bitrateKbps: null,
    profile: 'high',
    level: '4.0',
    ...webCommon,
    audioBitrateKbps: 128,
  },
  {
    name: 'whatsapp',
    label: 'WhatsApp / Status',
    description: 'Small file size, vertical video optimized for mobile messaging',
    width: 720,
    height: 1280,
    aspectRatio: 9 / 16,
    crf: 28,
    bitrateKbps: null,
    profile: 'main',
    level: '3.1',
    ...webCommon,
    audioBitrateKbps: 96,
  },
  {
    name: 'broadcast',
    label: 'Broadcast',
    description: 'High-quality mezzanine for broadcast post-production',
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    crf: null,
    bitrateKbps: 50000,
    profile: null,
    level: null,
    ...broadcastCommon,
  },
] as const;

/** Look up a preset by platform name. Throws if not found. */
export const getExportPreset = (name: PlatformName): ExportPreset => {
  const preset = EXPORT_PRESETS.find((p) => p.name === name);
  if (!preset) {
    throw new Error(`Unknown export preset: ${name}`);
  }
  return preset;
};

/** All platform names. */
export const PLATFORM_NAMES: readonly PlatformName[] = [
  'web-safe',
  'youtube',
  'tiktok',
  'instagram',
  'whatsapp',
  'broadcast',
];
