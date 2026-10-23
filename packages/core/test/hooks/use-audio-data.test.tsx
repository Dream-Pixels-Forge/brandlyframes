import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FrameContextProvider, type VideoConfig } from '../../src/context';
import { AudioDataProvider } from '../../src/context/audio-data-context';
import { useAudioData, useBeat, useLoudness, useSpectrum } from '../../src/hooks/use-audio-data';
import { analyzeAudioBuffer, type AudioBufferLike } from '../../src/hooks/audio-analysis';

const TEST_VIDEO_CONFIG: VideoConfig = { fps: 30, width: 1080, height: 1920, durationInFrames: 60 };

const sineBuffer = (freqHz: number, seconds: number, sampleRate = 44100): AudioBufferLike => {
  const data = new Float32Array(Math.round(seconds * sampleRate));
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return {
    sampleRate,
    duration: data.length / sampleRate,
    length: data.length,
    numberOfChannels: 1,
    getChannelData: () => data,
  };
};

/** Observes all four audio hooks for one src. */
const AudioProbe = ({ src }: { src: string }) => {
  const data = useAudioData(src);
  const loudness = useLoudness(src);
  const spectrum = useSpectrum(src);
  const beat = useBeat(src);
  return (
    <>
      {`has:${data.hasAudio};loud:${loudness.toFixed(6)};bands:${spectrum.length};beat:${
        beat ? beat.frame : 'none'
      };dur:${data.durationInFrames}`}
    </>
  );
};

const renderAudioAtFrame = (ui: React.ReactElement, frame: number): string =>
  renderToString(
    <FrameContextProvider currentFrame={frame} videoConfig={TEST_VIDEO_CONFIG}>
      {ui}
    </FrameContextProvider>,
  );

const renderWithAudioAtFrame = (src: string, buffer: AudioBufferLike, frame: number): string =>
  renderAudioAtFrame(
    <AudioDataProvider sources={{ [src]: buffer }}>
      <AudioProbe src={src} />
    </AudioDataProvider>,
    frame,
  );

describe('useAudioData / useLoudness / useSpectrum / useBeat (BF-130)', () => {
  const src = 'click.mp3';
  const buffer = sineBuffer(440, 2);

  it('derives per-frame values from the registered audio, matching the analysis engine', () => {
    const analysis = analyzeAudioBuffer(buffer, { fps: 30 });
    for (const frame of [0, 3, 17, 59]) {
      const output = renderWithAudioAtFrame(src, buffer, frame);
      const beat = analysis.beats.find((b) => b.frame <= frame && frame < b.frame + analysis.beatWindowInFrames);
      expect(output).toBe(
        `has:true;loud:${analysis.loudness[frame].toFixed(6)};bands:${analysis.spectrum[frame].length};beat:${
          beat ? beat.frame : 'none'
        };dur:${analysis.durationInFrames}`,
      );
    }
  });

  it('is deterministic per frame: rendering the same frame twice gives identical output', () => {
    for (const frame of [0, 7, 42]) {
      const first = renderWithAudioAtFrame(src, buffer, frame);
      const second = renderWithAudioAtFrame(src, buffer, frame);
      expect(second).toBe(first);
    }
  });

  it('returns neutral values for an unregistered src', () => {
    const output = renderAudioAtFrame(<AudioProbe src="missing.mp3" />, 5);
    expect(output).toBe('has:false;loud:0.000000;bands:0;beat:none;dur:0');
  });

  it('returns neutral values when no provider is mounted (SSR / render workers)', () => {
    const output = renderAudioAtFrame(<AudioProbe src={src} />, 5);
    expect(output).toBe('has:false;loud:0.000000;bands:0;beat:none;dur:0');
  });

  it('throws a helpful error outside a FrameContextProvider (like every frame hook)', () => {
    expect(() =>
      renderToString(
        <AudioDataProvider sources={{ [src]: buffer }}>
          <AudioProbe src={src} />
        </AudioDataProvider>,
      ),
    ).toThrow(/FrameContextProvider/);
  });
});
