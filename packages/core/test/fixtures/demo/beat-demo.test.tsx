import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FrameContextProvider, type VideoConfig } from '../../../src/context';
import { AudioDataProvider } from '../../../src/context/audio-data-context';
import { getAudioAnalysis, type AudioBufferLike } from '../../../src/hooks/audio-analysis';
import { BASE_SIZE, BeatPulse } from './beat-demo.fixture';

/**
 * BF-132: the beat-synced demo clip lands its visual within ±1 frame of the
 * detected beat. Uses a synthetic click track injected through
 * <AudioDataProvider> — deterministic, no network.
 */

const FPS = 30;
const DURATION_IN_FRAMES = 60;
const CLICK_EVERY_FRAMES = 15; // one click every 0.5s

const TEST_VIDEO_CONFIG: VideoConfig = {
  fps: FPS,
  width: 1080,
  height: 1920,
  durationInFrames: DURATION_IN_FRAMES,
};

/** Synthetic click track: a 100-sample full-scale burst at the start of every period. */
const clickTrack = (): AudioBufferLike => {
  const sampleRate = 44100;
  const data = new Float32Array(Math.round((DURATION_IN_FRAMES * sampleRate) / FPS));
  for (let f = 0; f < DURATION_IN_FRAMES; f += CLICK_EVERY_FRAMES) {
    const start = Math.floor((f * sampleRate) / FPS);
    for (let i = 0; i < 100; i++) data[start + i] = 1;
  }
  return {
    sampleRate,
    duration: data.length / sampleRate,
    length: data.length,
    numberOfChannels: 1,
    getChannelData: () => data,
  };
};

/** Renders the demo clip at a frame, returning the visual size. */
const renderSizeAtFrame = (buffer: AudioBufferLike, frame: number): number => {
  const html = renderToString(
    <FrameContextProvider currentFrame={frame} videoConfig={TEST_VIDEO_CONFIG}>
      <AudioDataProvider sources={{ 'demo-click.mp3': buffer }}>
        <BeatPulse src="demo-click.mp3" />
      </AudioDataProvider>
    </FrameContextProvider>,
  );
  return Number(html.match(/size:([\d.]+)/)?.[1]);
};

describe('beat-synced demo clip (BF-132: within ±1 frame)', () => {
  const buffer = clickTrack();
  const analysis = getAudioAnalysis(buffer, { fps: FPS });
  const sizes = Array.from({ length: DURATION_IN_FRAMES }, (_, frame) => renderSizeAtFrame(buffer, frame));

  it('detects one beat per click', () => {
    expect(analysis.beats).toHaveLength(DURATION_IN_FRAMES / CLICK_EVERY_FRAMES);
  });

  it('the visual peak lands within ±1 frame of every detected beat', () => {
    for (const beat of analysis.beats) {
      // Find the strongest visual within ±1 frame of the beat.
      const window = [beat.frame - 1, beat.frame, beat.frame + 1].filter(
        (f) => f >= 0 && f < DURATION_IN_FRAMES,
      );
      const peakFrame = window.reduce((best, f) => (sizes[f] > sizes[best] ? f : best), window[0]);
      expect(sizes[peakFrame]).toBeGreaterThan(BASE_SIZE);
      expect(Math.abs(peakFrame - beat.frame)).toBeLessThanOrEqual(1);
    }
  });

  it('the visual only lights up within ±1 frame of a beat (no spurious pulses)', () => {
    for (let frame = 0; frame < DURATION_IN_FRAMES; frame++) {
      const nearBeat = analysis.beats.some((beat) => Math.abs(beat.frame - frame) <= 1);
      if (!nearBeat) {
        expect(sizes[frame]).toBe(BASE_SIZE);
      }
    }
  });

  it('is deterministic: re-rendering a frame reproduces the same visual', () => {
    for (const frame of [0, 15, 16, 30]) {
      expect(renderSizeAtFrame(buffer, frame)).toBe(sizes[frame]);
    }
  });
});
