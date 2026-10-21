// Frame Video code examples

export const basicUsageCode = `import { FrameVideo, useVideoConfig } from '@brandlyframes/frames';
import { staticFile } from 'brandlyframes';

const VideoScene = () => {
  const { fps } = useVideoConfig();
  
  return (
    <FrameVideo
      src={staticFile('footage/clip.mp4')}
      startFrom={30}              // Source frame to start at (inclusive)
      endAt={210}                 // Source frame to end at (exclusive)
      playbackRate={0.5}          // 0.5x = slow motion, 2 = fast, -1 = reverse
      fit="cover"                 // "cover" | "contain" | "fill" | "none"
      frameMode="exact"           // "exact" | "blend" | "nearest"
      fpsConversion="auto"        // "auto" | "nearest" | "previous" | "blend"
    />
  );
};

// In composition:
registerRoot(
  <Composition
    id="video-scene"
    component={VideoScene}
    durationInFrames={360}  // 12 seconds at 30fps
    fps={30}
    width={1920}
    height={1080}
  />
);`;


export const decodeBackendsCode = `import { FrameVideo, setDecodeBackend } from '@brandlyframes/frames';

// 1. FFmpeg (default for render) - full codec support, server-side
import { FfmpegDecodeBackend } from '@brandlyframes/frames/backends/ffmpeg';
setDecodeBackend(new FfmpegDecodeBackend({
  ffmpegPath: '/usr/bin/ffmpeg',
  hwaccel: 'auto', // nvenc, videotoolbox, vaapi, qsv, none
}));

// 2. WebCodecs (Studio/Player) - hardware accelerated, browser
import { WebCodecsDecodeBackend } from '@brandlyframes/frames/backends/webcodecs';
setDecodeBackend(new WebCodecsDecodeBackend({
  preferHardwareAcceleration: true,
  lowLatency: true,
}));

// 3. <video> fallback - universal but limited
import { VideoElementDecodeBackend } from '@brandlyframes/frames/backends/video-element';
setDecodeBackend(new VideoElementDecodeBackend());

// Automatic selection (default):
// - Render: FFmpeg
// - Studio/Player: WebCodecs (with <video> fallback)`;


export const useVideoFrameCode = `import { useVideoFrame } from '@brandlyframes/frames';

const GlitchEffect = ({ src, frame }) => {
  // Get decoded frame as ImageBitmap
  const videoFrame = useVideoFrame({ 
    src, 
    sourceFrame: frame,
    // Optional: get ImageData for pixel manipulation
    // asImageData: true 
  });

  if (!videoFrame) {
    return <div className="loading">Decoding...</div>;
  }

  return (
    <canvas
      ref={(canvas) => {
        if (!canvas || !videoFrame) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = videoFrame.width;
        canvas.height = videoFrame.height;
        
        // Draw frame
        ctx.drawImage(videoFrame, 0, 0);
        
        // Apply glitch effect: RGB channel shift
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // Shift red channel
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          data[i] = data[Math.min(i + 20, data.length - 4)];     // R → R+20
          data[i + 1] = g;                                        // G unchanged
          data[i + 2] = data[Math.max(i - 20, 0)];                // B → B-20
        }
        
        ctx.putImageData(imageData, 0, 0);
      }}
    />
  );
};

// WebGL/Three.js integration:
const WebGLVideo = ({ src, frame }) => {
  const videoFrame = useVideoFrame({ src, sourceFrame: frame });
  
  useEffect(() => {
    if (!videoFrame) return;
    const texture = new THREE.CanvasTexture(videoFrame);
    texture.needsUpdate = true;
    material.map = texture;
  }, [videoFrame]);
  
  return <canvas ref={canvasRef} />;
};`;


export const retimingCode = `// Normal speed
<FrameVideo src={src} playbackRate={1} />

// Slow motion (50%)
<FrameVideo src={src} playbackRate={0.5} />

// Fast motion (2x)
<FrameVideo src={src} playbackRate={2} />

// Reverse playback
<FrameVideo src={src} playbackRate={-1} />

// Ping-pong (reverse at ends)
<FrameVideo 
  src={src} 
  playbackRate={1}
  pingPong={true}
/>

// Freeze frame
<FrameVideo 
  src={src} 
  playbackRate={0}
  startFrom={120}
/>`;


export const blendingCode = `// Exact: nearest frame (default, sharpest)
<FrameVideo src={src} frameMode="exact" />

// Blend: interpolate between frames (smooth motion)
<FrameVideo src={src} frameMode="blend" />

// Nearest: no blending, duplicate frames
<FrameVideo src={src} frameMode="nearest" />

// FPS conversion modes:
<FrameVideo 
  src={src} 
  fpsConversion="auto"      // Smart: blend if needed
  fpsConversion="nearest"   // Duplicate/drop frames
  fpsConversion="previous"  // Hold previous frame
  fpsConversion="blend"     // Always blend
/>

// Example: 24fps source → 30fps composition
// "auto" will blend frames for smooth motion`;


export const colorSpaceCode = `<FrameVideo
  src={src}
  colorSpace="bt709"        // "bt601" | "bt709" | "bt2020" | "srgb"
  colorRange="limited"      // "limited" | "full"
  tonemap="none"            // "none" | "reinhard" | "hable" | "aces"
// Auto-detected from source metadata
/>

// Output color space (in render):
<FrameVideo
  src={src}
  outputColorSpace="bt709"
  outputColorRange="limited"
/>`;


export const frameAudioCode = `import { FrameVideo, FrameAudio } from '@brandlyframes/frames';

const SyncedVideo = () => (
  <>
    <FrameVideo
      src={staticFile('clip.mp4')}
      startFrom={30}
      endAt={210}
      playbackRate={0.5}
    />
    <FrameAudio
      src={staticFile('clip.mp4')}
      startFrom={30}
      endAt={210}
      playbackRate={0.5}
      pitchPreserve={true}  // Maintain pitch when retiming
    />
  </>
);

// FrameAudio handles:
// - Sample-accurate slicing
// - Pitch preservation (WSOLA algorithm)
// - Volume curves (fade in/out)
// - Multi-channel downmix`;


export const probeCode = `$ brandlyframes frames probe clip.mp4

📹 Video Probe Results
═══════════════════════
File: clip.mp4
Duration: 10.5s (315 frames @ 30fps)
FPS: 30000/1001 (29.97) — NTSC
Resolution: 1920×1080
Codec: H.264 (High 4.1)
Pixel Format: yuv420p
Color Space: bt709 (limited)
Alpha: No
VFR: No
Has Audio: Yes (AAC, 48kHz, stereo)

Frame 0: 0.000s
Frame 314: 10.470s`;


export const extractCode = `$ brandlyframes frames extract clip.mp4 \\
  --from 0 --to 120 \\
  --format png \\
  --out ./frames

Extracting frames 0-119...
████████████████████ 100% (120/120)
✓ Extracted to ./frames/
  frame-0000.png
  frame-0001.png
  ...
  frame-0119.png

Options:
  --format png|jpeg|webp
  --quality 80 (jpeg/webp)
  --parallel 8`;


export const cacheCode = `$ brandlyframes frames cache info

📦 Frame Cache Status
══════════════════════
Location: ~/.brandlyframes/frame-cache
Size: 2.4 GB / 10 GB limit
Entries: 1,847 frames
Hit rate: 87.3%

$ brandlyframes frames cache clear
✓ Cache cleared

$ brandlyframes frames cache clear --older-than 30d
✓ Cleared 234 entries`;