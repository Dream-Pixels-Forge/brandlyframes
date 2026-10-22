/**
 * @brandlyframes/presets — platform export preset types [BF-426]
 *
 * Types for platform-specific export presets that ensure output plays
 * everywhere (Safari, phone, web, broadcast). Deterministic: pure data,
 * no Math.random, no Date.now.
 */

/** Target platform for an export preset. */
export type PlatformName =
  | 'web-safe'
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'whatsapp'
  | 'broadcast';

/** Video codec. */
export type PresetCodec = 'h264' | 'h265' | 'vp9' | 'av1' | 'prores';

/** Audio codec. */
export type PresetAudioCodec = 'aac' | 'opus' | 'pcm';

/** Pixel format. */
export type PresetPixelFormat =
  | 'yuv420p'
  | 'yuva420p'
  | 'yuv422p'
  | 'yuv444p'
  | 'yuv420p10le'
  | 'p010le';

/** FFmpeg preset (speed/compression tradeoff). */
export type PresetFfmpegPreset =
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
  | 'slower'
  | 'veryslow';

/** A complete export preset for a target platform. */
export interface ExportPreset {
  /** Platform name. */
  readonly name: PlatformName;
  /** Human-readable label. */
  readonly label: string;
  /** Description of when to use this preset. */
    readonly description: string;
  /** Target width in pixels (null = keep source). */
  readonly width: number | null;
  /** Target height in pixels (null = keep source). */
  readonly height: number | null;
  /** Target aspect ratio (null = keep source). */
  readonly aspectRatio: number | null;
  /** Video codec. */
  readonly codec: PresetCodec;
  /** FFmpeg CRF (lower = better quality, larger file). Null = use bitrate instead. */
  readonly crf: number | null;
  /** Target bitrate in kbps. Null = use CRF instead. */
  readonly bitrateKbps: number | null;
  /** FFmpeg preset. */
  readonly ffmpegPreset: PresetFfmpegPreset;
  /** Pixel format. */
  readonly pixelFormat: PresetPixelFormat;
  /** H.264 profile (null = auto). */
  readonly profile: string | null;
  /** H.264 level (null = auto). */
  readonly level: string | null;
  /** Audio codec. */
  readonly audioCodec: PresetAudioCodec;
  /** Audio bitrate in kbps. */
  readonly audioBitrateKbps: number;
  /** Audio sample rate in Hz. */
  readonly audioSampleRate: number;
  /** Audio channel count. */
  readonly audioChannels: number;
  /** Target loudness in LUFS (null = no normalization). */
  readonly loudnessLufs: number | null;
  /** Enable faststart (movable moov atom for web streaming). */
  readonly faststart: boolean;
  /** Enable hardware acceleration when available. */
  readonly hwaccel: boolean;
  /** Additional FFmpeg output flags. */
  readonly extraFlags: readonly string[];
}
