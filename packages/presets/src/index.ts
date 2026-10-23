/**
 * @brandlyframes/presets — platform export presets [BF-426]
 *
 * Platform-specific export presets (web-safe, youtube, tiktok, instagram,
 * whatsapp, broadcast) that set pixel format, profile, level, bitrate,
 * loudness and faststart so output plays everywhere.
 */

export {
  EXPORT_PRESETS,
  getExportPreset,
  PLATFORM_NAMES,
} from './presets.js';
export type {
  ExportPreset,
  PlatformName,
  PresetCodec,
  PresetAudioCodec,
  PresetPixelFormat,
  PresetFfmpegPreset,
} from './types.js';
