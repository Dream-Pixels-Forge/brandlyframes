# BrandlyFrames API Reference

Reference documentation for the BrandlyFrames monorepo packages.

## Packages

| Package | Description |
|---------|-------------|
| `brandlyframes` | Core SDK — timeline engine, hooks, animation primitives |
| `@brandlyframes/renderer` | Headless Chrome capture, FFmpeg stitching, audio mixing |
| `@brandlyframes/player` | Embeddable web player with controls & imperative API |
| `@brandlyframes/cli` | `brandlyframes` CLI — dev, build, export, upgrade, create |

## brandlyframes (core)

### `registerRoot(options?): void`

Bootstrap BrandlyFrames once in your entry file. Accepts `{ inputProps?, onError? }`.

### `Composition(props)`

Declare a composition — the root unit of a BrandlyFrames video. Props: `id`, `width`, `height`, `fps`, `duration`, `inputProps`, `children`.

### Frame hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useCurrentFrame()` | `number` | Current 0-indexed frame |
| `useVideoConfig()` | `{ width, height, fps, durationInFrames }` | Video configuration |
| `useMarker(name)` | `{ frame: number } | undefined` | Named marker frame |
| `holdFrame()` / `releaseFrame()` | `Promise<void>` | Async frame-readiness semantics |

### Timeline components

| Component | Props | Description |
|-----------|-------|-------------|
| `Sequence` | `frames`, `children` | Scope time across a frame range |
| `Series` | `children` (with `Series.Sequence`) | Compose sequences end-to-end |
| `Loop` | `frames`, `count`, `children` | Loop a segment |
| `Freeze` | `frame`, `children` | Hold a single frame |
| `AbsoluteFill` | `children` | Fill parent bounds |

### Animation utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| `interpolate` | `(frame, points, values, opts?)` | Interpolate across keyframes |
| `spring` | `(frame, opts)` | Physics-based spring animation |
| `interpolateColors` | `(frame, points, colors, opts?)` | Interpolate between colors |
| `Easing` | namespace | Easing functions |

### Time helpers

| Function | Signature | Description |
|----------|-----------|-------------|
| `sec` | `(seconds)` | Convert seconds to frames |
| `ms` | `(milliseconds)` | Convert ms to frames |
| `tc` | `(timecode)` | Parse `HH:MM:SS:FF` to frame |

### Media primitives

| Component | Props | Description |
|-----------|-------|-------------|
| `Img` | `src`, ... | Deterministic image |
| `Audio` | `src`, ... | Deterministic audio |
| `Video` | `src`, ... | Deterministic video |
| `FrameVideo` | `src`, ... | Frame-accurate video |

### Validation

| Export | Description |
|--------|-------------|
| `z` | Zod instance for props schemas |
| `CompositionSchema` | Composition config schema |
| `CompositionConfig` | Composition config type |

## @brandlyframes/renderer

### Capture

| Export | Description |
|--------|-------------|
| `captureFrame(options)` | Capture a single frame via headless Chrome |
| `captureChunk(options)` | Capture a range of frames on one tab |
| `captureParallel(options)` | Capture across a bounded pool of tabs |
| `splitFrameRange(start, end, chunkSize)` | Split a frame range into chunks |
| `DEFAULT_CHROME_FLAGS` | Default Chrome flags |
| `DEFAULT_CONCURRENCY` | Default tab concurrency |

### Types

`BrowserTabLike`, `BrowserLauncherLike`, `LauncherFn`, `FrameRange`, `CaptureFrameOptions`, `CaptureChunkOptions`, `CaptureParallelOptions`.

### Stitching (FFmpeg)

| Export | Description |
|--------|-------------|
| `stitchFrames(options)` | Stitch frames into a video via FFmpeg |
| `buildStitchArgs(options)` | Build FFmpeg argv for stitching |
| `resolveFramePattern(pattern)` | Resolve frame filename pattern |
| `frameFileName(frame)` | `frame-%06d.png` naming |
| `CODEC_PROFILES` | Per-codec FFmpeg profiles |
| `ALPHA_PIXEL_FORMATS` | Pixel formats supporting alpha |
| `DEFAULT_FRAME_PATTERN` | Default frame filename pattern |
| `DEFAULT_STITCH_FPS` | Default stitch FPS |

### Types

`StitchCodec`, `StitchCodecProfile`, `StitchOptions`, `StitchFramesOptions`.

### Audio mixing

| Export | Description |
|--------|-------------|
| `mixAudio(options)` | Mix audio tracks |
| `buildMixArgs(options)` | Build FFmpeg mix args |
| `DEFAULT_MIX_FPS` | Default mix FPS |

### Types

`AudioTrackInput`, `VolumeKeyframe`, `MixAudioOptions`, `MixAudioSpawnOptions`.

### Render job (resumable orchestration)

| Export | Description |
|--------|-------------|
| `runRenderJob(options, launcherFactory)` | Run a chunked, resumable render |
| `readRenderManifest(path)` | Read/validate a render manifest |
| `writeRenderManifest(path, manifest)` | Atomically write a manifest |
| `RenderJobAbortedError` | Error thrown on signal abort |
| `DEFAULT_MANIFEST_FILENAME` | `render-manifest.json` |
| `MANIFEST_VERSION` | Manifest schema version |

### Types

`RenderManifest`, `RenderJobOptions`, `RenderJobResult`, `RenderProgress`.

### Testing utilities

| Export | Description |
|--------|-------------|
| `frameHash(framePath)` | Hash a captured frame |
| `compareGoldenFrames(a, b)` | Compare two golden frames |
| `assertGoldenFrame(actual, expected)` | Assert frame matches golden |
| `assertDeterministic(opts)` | Assert render determinism |

## @brandlyframes/player

### `<Player(props)>`

Embeddable web player. Props: `compositionId`, `inputProps`, `autoPlay`, `loop`, `playbackRate`, `controls`, `width`, `height`, `className`, `style`, `onPlay`, `onPause`, `onFrameChange`, `onEnded`, `onError`.

### `PlayerRef` (imperative API via `ref`)

| Method | Description |
|--------|-------------|
| `play()` | Start playback |
| `pause()` | Pause playback |
| `seekTo(frame)` | Seek to a frame (frame-exact) |
| `getCurrentFrame()` | Current 0-indexed frame |
| `getDurationInFrames()` | Total frames |
| `getPlaybackRate()` | Current playback rate |
| `setPlaybackRate(rate)` | Set playback rate |
| `isPlaying()` | Whether playing |

## @brandlyframes/cli

Commands: `dev`, `build`, `export`, `upgrade`, `create <template> [dir]`.

Global options: `-d, --debug`.
