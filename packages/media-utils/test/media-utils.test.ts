import { describe, it, expect } from 'vitest';
import { 
  getAudioDuration, 
  getAudioSampleRate, 
  createWaveformData 
} from '../src/index';

// Mock AudioBuffer for testing
class MockAudioBuffer implements AudioBuffer {
  constructor(
    public sampleRate: number = 44100,
    public length: number = 44100,
    public duration: number = 1.0,
    public numberOfChannels: number = 2
  ) {}
  
  getChannelData(channel: number): Float32Array {
    // Return a simple test waveform (sine wave)
    const channelData = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate);
    }
    return channelData;
  }
  
  copyFromChannel(): void { }
  copyToChannel(): void { }
  slice(): AudioBuffer {
    return new MockAudioBuffer();
  }
}

describe('media-utils', () => {
  const audioBuffer = new MockAudioBuffer();

  describe('getAudioDuration', () => {
    it('should return the duration of the audio buffer', () => {
      expect(getAudioDuration(audioBuffer)).toBeCloseTo(1.0);
    });
  });

  describe('getAudioSampleRate', () => {
    it('should return the sample rate of the audio buffer', () => {
      expect(getAudioSampleRate(audioBuffer)).toBe(44100);
    });
  });

  describe('createWaveformData', () => {
    it('should create waveform data with correct length', () => {
      const waveform = createWaveformData(audioBuffer, 100, 50);
      expect(waveform.length).toBe(100);
    });

    it('should return non-negative values', () => {
      const waveform = createWaveformData(audioBuffer, 100, 50);
      waveform.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });
  });
});