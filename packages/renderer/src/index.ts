/**
 * @brandlyframes/renderer — headless render path [BF-053]
 *
 * FFmpeg frame-exact decode backend, headless frame capture and frame
 * stitching used by `brandlyframes render`.
 */

export { decodeFrameFFmpeg, FFmpegNotFoundError } from './ffmpeg-decode';
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
} from './capture';
export type {
  BrowserTabLike,
  BrowserLauncherLike,
  LauncherFn,
  FrameRange,
  CaptureFrameOptions,
  CaptureChunkOptions,
  CaptureParallelOptions,
} from './capture';
export {
  buildStitchArgs,
  stitchFrames,
  resolveFramePattern,
  frameFileName,
  CODEC_PROFILES,
  ALPHA_PIXEL_FORMATS,
  DEFAULT_FRAME_PATTERN,
  DEFAULT_STITCH_FPS,
} from './stitch';
export type {
  StitchCodec,
  StitchCodecProfile,
  StitchOptions,
  StitchFramesOptions,
} from './stitch';
export { mixAudio, buildMixArgs, DEFAULT_MIX_FPS } from './audio';
export type {
  AudioTrackInput,
  VolumeKeyframe,
  MixAudioOptions,
  MixAudioSpawnOptions,
} from './audio';
export {
  runRenderJob,
  readRenderManifest,
  writeRenderManifest,
  RenderJobAbortedError,
  DEFAULT_MANIFEST_FILENAME,
  MANIFEST_VERSION,
} from './job';
export type {
  RenderManifest,
  RenderJobOptions,
  RenderJobResult,
  RenderProgress,
} from './job';
