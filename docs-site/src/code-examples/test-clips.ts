// Code examples for test clips documentation - stored as plain strings to avoid JSX parsing issues

export const basicUsageCode = `import {
  TEST_CLIPS,
  generateFrameCounterText,
  createFrameCounterFrame,
  generateTestClipManifest,
} from '@brandlyframes/frames';

// Iterate over every predefined test clip
for (const clip of TEST_CLIPS) {
  console.log(\`\${clip.id}: \${clip.width}x\${clip.height} @ \${clip.fps.num / clip.fps.den}fps\`);
}

// Get a single clip spec
const clip = TEST_CLIPS.find((c) => c.id === 'cfr-30fps-1080p')!;

// Generate a frame counter image for frame 42
const frame = createFrameCounterFrame(clip, 42);
// frame is a Uint8Array of RGBA or RGB pixels (depending on clip.hasAlpha)

console.log(generateFrameCounterText(42, clip.frameCount, clip.fps));
// FRAME: 000042/000300  TIME: 01.400s`;


export const manifestCode = `import { generateTestClipManifest, writeTestClipManifest } from '@brandlyframes/frames';

// Generate an in-memory manifest
const manifest = generateTestClipManifest();
console.log(manifest.version);   // "1.0"
console.log(manifest.clips.length); // number of predefined clips

// Persist to disk for CI / render farm consumption
await writeTestClipManifest('./dist/test-clips-manifest.json');
// Writes { version, generatedAt, clips: [...] }`;


export const perfBenchmarkCode = `import { runPerfBenchmark, TEST_CLIPS } from '@brandlyframes/frames';

const clip = TEST_CLIPS.find((c) => c.id === 'perf-4k-60fps-full')!;

const result = await runPerfBenchmark(clip);
console.log(result.fpsAchieved);   // frames decoded per second
console.log(result.memoryPeakMB);  // estimated peak memory in MB`;


export const cfrVfrAlphaCode = `import { TEST_CLIPS } from '@brandlyframes/frames';

const cfrClips = TEST_CLIPS.filter((c) => !c.isVFR && !c.hasAlpha);
const vfrClips = TEST_CLIPS.filter((c) => c.isVFR);
const alphaClips = TEST_CLIPS.filter((c) => c.hasAlpha);

console.log(cfrClips.length, vfrClips.length, alphaClips.length);
// e.g. 5 2 2`;


export const vfrPatternCode = `import { TEST_CLIPS } from '@brandlyframes/frames';

const vfr = TEST_CLIPS.find((c) => c.id === 'vfr-alternating-30-60fps')!;
console.log(vfr.vfrPattern?.type);   // "alternating"
console.log(vfr.vfrPattern?.params); // { rate1: 30, rate2: 60 }`;


export const customClipCode = `import { createFrameCounterFrame, generateFrameCounterText } from '@brandlyframes/frames';

const customClip = {
  id: 'custom-25fps-720p',
  name: 'Custom 25fps 720p',
  fps: { num: 25, den: 1 },
  frameCount: 100,
  width: 1280,
  height: 720,
  hasAlpha: false,
  isVFR: false,
  duration: 4,
};

const frame = createFrameCounterFrame(customClip, 7);
console.log(generateFrameCounterText(7, customClip.frameCount, customClip.fps));
// FRAME: 000007/000100  TIME: 00.280s`;


export const perf4kCode = `import { runPerfBenchmark, TEST_CLIPS } from '@brandlyframes/frames';

const perfClip = TEST_CLIPS.find((c) => c.id === 'perf-4k-60fps-full')!;
// 3840x2160 @ 60fps, 1800 frames — use for CI performance regression tracking

const result = await runPerfBenchmark(perfClip);
console.log(\`\${result.fpsAchieved.toFixed(1)} fps achieved\`);
`;
