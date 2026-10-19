/**
 * @brandlyframes/renderer — headless render path [BF-053]
 *
 * FFmpeg frame-exact decode backend, headless frame capture and frame
 * stitching used by `brandlyframes render`.
 */

export { decodeFrameFFmpeg, FFmpegNotFoundError } from './ffmpeg-decode.js';
export type {
  DecodeFrameFFmpegOptions,
  SpawnedProcessHandle,
  SpawnedStream,
  SpawnError,
  SpawnFn,
} from './ffmpeg-decode';
export {
  captureFrame,
  captureChunk,
  captureParallel,
  splitFrameRange,
  DEFAULT_CHROME_FLAGS,
  DEFAULT_CONCURRENCY,
} from './capture.js';
export type {
  BrowserTabLike,
  BrowserLauncherLike,
  LauncherFn,
  FrameRange,
  CaptureFrameOptions,
  CaptureChunkOptions,
  CaptureParallelOptions,
} from './capture.js';
export {
  buildStitchArgs,
  stitchFrames,
  resolveFramePattern,
  frameFileName,
  CODEC_PROFILES,
  ALPHA_PIXEL_FORMATS,
  DEFAULT_FRAME_PATTERN,
  DEFAULT_STITCH_FPS,
} from './stitch.js';
export type {
  StitchCodec,
  StitchCodecProfile,
  StitchOptions,
  StitchFramesOptions,
} from './stitch.js';
export { mixAudio, buildMixArgs, DEFAULT_MIX_FPS } from './audio.js';
export type {
  AudioTrackInput,
  VolumeKeyframe,
  MixAudioOptions,
  MixAudioSpawnOptions,
} from './audio.js';
export {
  runRenderJob,
  readRenderManifest,
  writeRenderManifest,
  RenderJobAbortedError,
  DEFAULT_MANIFEST_FILENAME,
  MANIFEST_VERSION,
} from './job.js';
export type {
  RenderManifest,
  RenderJobOptions,
  RenderJobResult,
  RenderProgress,
} from './job.js';
