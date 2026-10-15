/**
 * @brandlyframes/renderer — headless render path [BF-053]
 *
 * FFmpeg frame-exact decode backend used by `brandlyframes render`.
 */

export { decodeFrameFFmpeg, FFmpegNotFoundError } from './ffmpeg-decode';
export type {
  DecodeFrameFFmpegOptions,
  SpawnedProcessHandle,
  SpawnedStream,
  SpawnError,
  SpawnFn,
} from './ffmpeg-decode';
