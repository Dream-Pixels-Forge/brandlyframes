// Rendering Guide code examples

export const basicUsageCode = `# Render a composition to MP4
pnpm brandlyframes render my-composition

# Render with custom output path
pnpm brandlyframes render my-composition --output ./output/video.mp4

# Render specific frame range
pnpm brandlyframes render my-composition --start 0 --end 300

# Render with custom codec/settings
pnpm brandlyframes render my-composition \\
  --codec h264 \\
  --crf 20 \\
  --preset slow \\
  --concurrency 8`;

export const platformPresetsCode = `# YouTube (1080p, high quality, loudness normalized)
pnpm brandlyframes render my-comp --preset youtube

# TikTok / Reels / Shorts (9:16, vertical)
pnpm brandlyframes render my-comp --preset tiktok

# Instagram Feed (1:1, square)
pnpm brandlyframes render my-comp --preset instagram

# WhatsApp (compressed for messaging)
pnpm brandlyframes render my-comp --preset whatsapp

# Broadcast (ProRes, bt709, full range)
pnpm brandlyframes render my-comp --preset broadcast

# Web-safe (H.264, yuv420p, faststart)
pnpm brandlyframes render my-comp --preset web-safe

# List all presets
pnpm brandlyframes render --list-presets`;

export const stillFramesCode = `# Export frame 60 as PNG
pnpm brandlyframes still my-composition --frame 60

# Export with custom output
pnpm brandlyframes still my-composition --frame 60 --output ./thumb.png

# Export as JPEG with quality
pnpm brandlyframes still my-composition --frame 60 --format jpeg --quality 90

# Export multiple frames
pnpm brandlyframes still my-composition --frames 0,30,60,90 --output ./frames/frame-%04d.png`;

export const autoConcurrencyCode = `# Run benchmark (saves result for future renders)
pnpm brandlyframes benchmark

# View current benchmark
pnpm brandlyframes benchmark --show

# Output example:
# CPU: 16 cores, 32GB RAM
# GPU: NVIDIA RTX 4090
# Optimal concurrency: 12
# Estimated render time (1080p, 30fps, 10s): 45s`;

export const manualOverrideCode = `# Limit concurrency (CI, shared machines)
pnpm brandlyframes render my-comp --concurrency 4

# Disable concurrency (debugging)
pnpm brandlyframes render my-comp --concurrency 1

# Maximum concurrency (dedicated render node)
pnpm brandlyframes render my-comp --concurrency 16

# Environment variable (CI)
BRANDLYFRAMES_CONCURRENCY=8 pnpm brandlyframes render my-comp`;

export const memoryManagementCode = `# The renderer includes automatic memory management:
# - Worker/tab recycling (configurable)
# - Streaming frames to FFmpeg (no giant buffers)
# - Automatic retry with lower concurrency on OOM

# Configure memory limits:
pnpm brandlyframes render my-comp \\
  --max-memory-gb 16 \\
  --worker-recycle-frames 100

# Environment variables:
BRANDLYFRAMES_MAX_MEMORY_GB=16
BRANDLYFRAMES_WORKER_RECYCLE=100
BRANDLYFRAMES_CHUNK_SIZE=300`;

export const cloudSetupCode = `# Deploy AWS Lambda infrastructure
pnpm brandlyframes cloud deploy --provider aws --region us-east-1

# Deploy GCP Cloud Run infrastructure
pnpm brandlyframes cloud deploy --provider gcp --region us-central1

# Verify deployment
pnpm brandlyframes cloud doctor

# Output includes:
# - Lambda function ARN / Cloud Run URL
# - S3 bucket / GCS bucket
# - IAM roles created
# - Estimated cost per minute`;

export const cloudRenderCode = `# Render a composition in the cloud
pnpm brandlyframes cloud render my-composition \\
  --output s3://my-bucket/videos/output.mp4 \\
  --concurrency 20 \\
  --cost-budget 5.00

# Render with frame range
pnpm brandlyframes cloud render my-comp \\
  --start 0 --end 18000 \\
  --output gcs://my-bucket/video.mp4

# Monitor progress
pnpm brandlyframes cloud status <job-id>

# Download result
pnpm brandlyframes cloud download <job-id> ./output.mp4`;

export const costEstimationCode = `$ pnpm brandlyframes cloud estimate my-composition

💰 Cost Estimate
═════════════════
Composition: my-composition (10s, 1080p, 30fps)
Frames: 300
Chunks: 10 (30 frames each)
Concurrency: 10

Compute (Lambda):     $0.00034
Storage (S3):         $0.00001
Egress:               $0.00012
─────────────────────────
Total Estimate:       $0.00047

# With budget enforcement:
pnpm brandlyframes cloud render my-comp --cost-budget 0.01`;

export const driftTestCode = `$ pnpm brandlyframes cloud drift-test --provider aws

🔍 Drift Test Results
═══════════════════════
Duration: 10:00 (18,000 frames @ 30fps)
Chunks: 60 (300 frames each)
Providers: AWS Lambda

Chunk Boundaries Tested: 59
Max Drift: 0.8ms (< 1 frame @ 30fps = 33ms)
Drift Frames: 0
A/V Sync: ✓ PASSED

Status: ✅ NO DRIFT DETECTED`;

export const audioInCompositionsCode = `import { Audio, FrameAudio, useCurrentFrame } from 'brandlyframes';

const VideoWithAudio = () => {
  const frame = useCurrentFrame();
  
  return (
    <>
      {/* Background music */}
      <Audio
        src={staticFile('music/ambient.mp3')}
        startFrom={0}
        endAt={300}
      />
      
      {/* Synced voiceover */}
      <FrameAudio
        src={staticFile('voiceover.wav')}
        startFrom={60}
        endAt={240}
        playbackRate={1}
        volume={frame => interpolate(frame, [60, 90, 210, 240], [0, 1, 1, 0])}
        pitchPreserve={true}
      />
      
      {/* Sound effects at specific frames */}
      <FrameAudio
        src={staticFile('sfx/woosh.mp3')}
        startFrom={120}
        endAt={121}
        volume={2}
      />
    </>
  );
};`;