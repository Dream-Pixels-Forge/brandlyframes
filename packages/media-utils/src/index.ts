/**
 * BrandlyFrames media utilities — audio data, waveform helpers
 * 
 * This package provides utilities for working with audio data and generating waveform visualizations.
 * Follows the clean-room principle - implementing from scratch without copying Remotion source code.
 */

/**
 * Interface representing an audio buffer with essential properties and methods.
 * This is a subset of the Web Audio API's AudioBuffer interface for our utilities.
 */
export interface AudioBufferLike {
  /** The sample rate of the audio data (e.g., 44100) */
  sampleRate: number;
  /** The duration of the audio in seconds */
  duration: number;
  /** The length of the audio buffer in sample frames */
  length: number;
  /** The number of discrete audio channels */
  numberOfChannels: number;
  /**
   * Returns the Float32Array of PCM data for the specified channel.
   * @param channel zero-indexed channel number
   */
  getChannelData(channel: number): Float32Array;
}

/**
 * Returns the duration of the audio buffer in seconds.
 * @param audioBuffer The audio buffer to inspect
 */
export const getAudioDuration = (audioBuffer: AudioBufferLike): number => {
  return audioBuffer.duration;
};

/**
 * Returns the sample rate of the audio buffer in Hz.
 * @param audioBuffer The audio buffer to inspect
 */
export const getAudioSampleRate = (audioBuffer: AudioBufferLike): number => {
  return audioBuffer.sampleRate;
};

/**
 * Returns the number of audio channels in the buffer.
 * @param audioBuffer The audio buffer to inspect
 */
export const getAudioChannels = (audioBuffer: AudioBufferLike): number => {
  return audioBuffer.numberOfChannels;
};

/**
 * Returns the length of the audio buffer in sample frames.
 * @param audioBuffer The audio buffer to inspect
 */
export const getAudioLength = (audioBuffer: AudioBufferLike): number => {
  return audioBuffer.length;
};

/**
 * Creates a sliced audio buffer from the specified time range.
 * @param audioBuffer The source audio buffer
 * @param startTime Start time in seconds
 * @param endTime End time in seconds (exclusive)
 * @returns A new AudioBuffer containing the sliced audio
 */
export const sliceAudio = (
  audioBuffer: AudioBufferLike,
  startTime: number,
  endTime: number
): AudioBufferLike => {
  // Validate input
  if (startTime < 0) {
    throw new Error('Start time cannot be negative');
  }
  if (endTime > audioBuffer.duration) {
    throw new Error('End time exceeds audio buffer duration');
  }
  if (startTime >= endTime) {
    throw new Error('Start time must be less than end time');
  }

  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.round(startTime * sampleRate);
  const endSample = Math.round(endTime * sampleRate);
  const length = endSample - startSample;

  // Create a new audio buffer with the same format
  const slicedBuffer: AudioBufferLike = {
    sampleRate: audioBuffer.sampleRate,
    length,
    duration: endTime - startTime,
    numberOfChannels: audioBuffer.numberOfChannels,
    getChannelData: (channel: number): Float32Array => {
      const sourceData = audioBuffer.getChannelData(channel);
      const slicedData = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        const sourceIndex = startSample + i;
        if (sourceIndex < sourceData.length) {
          slicedData[i] = sourceData[sourceIndex];
        } else {
          slicedData[i] = 0;
        }
      }
      return slicedData;
    }
  };

  return slicedBuffer;
};

/**
 * Normalizes the audio buffer to the range [-1, 1].
 * @param audioBuffer The audio buffer to normalize
 * @returns A new AudioBuffer with normalized audio data
 */
export const normalizeAudio = (audioBuffer: AudioBufferLike): AudioBufferLike => {
  // Find the maximum absolute sample value across all channels
  let maxAbsSample = 0;
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < channelData.length; i++) {
      const absSample = Math.abs(channelData[i]);
      if (absSample > maxAbsSample) {
        maxAbsSample = absSample;
      }
    }
  }

  // Avoid division by zero
  if (maxAbsSample === 0) {
    return audioBuffer; // Already silent
  }

  const normalizationFactor = 1.0 / maxAbsSample;

  // Create normalized buffer
  const normalizedBuffer: AudioBufferLike = {
    sampleRate: audioBuffer.sampleRate,
    length: audioBuffer.length,
    duration: audioBuffer.duration,
    numberOfChannels: audioBuffer.numberOfChannels,
    getChannelData: (channel: number): Float32Array => {
      const sourceData = audioBuffer.getChannelData(channel);
      const normalizedData = new Float32Array(sourceData.length);
      for (let i = 0; i < sourceData.length; i++) {
        normalizedData[i] = sourceData[i] * normalizationFactor;
      }
      return normalizedData;
    }
  };

  return normalizedBuffer;
};

/**
 * Applies a fade-in effect to the audio buffer.
 * @param audioBuffer The audio buffer to process
 * @param fadeDuration Fade duration in seconds (default: 1.0)
 * @returns A new AudioBuffer with fade-in applied
 */
export const applyFadeIn = (
  audioBuffer: AudioBufferLike,
  fadeDuration: number = 1.0
): AudioBufferLike => {
  if (fadeDuration <= 0) {
    return audioBuffer;
  }

  const fadeSamples = Math.min(
    Math.round(fadeDuration * audioBuffer.sampleRate),
    audioBuffer.length
  );

  const fadedBuffer: AudioBufferLike = {
    sampleRate: audioBuffer.sampleRate,
    length: audioBuffer.length,
    duration: audioBuffer.duration,
    numberOfChannels: audioBuffer.numberOfChannels,
    getChannelData: (channel: number): Float32Array => {
      const sourceData = audioBuffer.getChannelData(channel);
      const fadedData = new Float32Array(sourceData.length);
      
      for (let i = 0; i < sourceData.length; i++) {
        let gain = 1.0;
        if (i < fadeSamples) {
          // Linear fade-in: 0 to 1
          gain = i / fadeSamples;
        }
        fadedData[i] = sourceData[i] * gain;
      }
      
      return fadedData;
    }
  };

  return fadedBuffer;
};

/**
 * Applies a fade-out effect to the audio buffer.
 * @param audioBuffer The audio buffer to process
 * @param fadeDuration Fade duration in seconds (default: 1.0)
 * @returns A new AudioBuffer with fade-out applied
 */
export const applyFadeOut = (
  audioBuffer: AudioBufferLike,
  fadeDuration: number = 1.0
): AudioBufferLike => {
  if (fadeDuration <= 0) {
    return audioBuffer;
  }

  const fadeSamples = Math.min(
    Math.round(fadeDuration * audioBuffer.sampleRate),
    audioBuffer.length
  );

  const fadedBuffer: AudioBufferLike = {
    sampleRate: audioBuffer.sampleRate,
    length: audioBuffer.length,
    duration: audioBuffer.duration,
    numberOfChannels: audioBuffer.numberOfChannels,
    getChannelData: (channel: number): Float32Array => {
      const sourceData = audioBuffer.getChannelData(channel);
      const fadedData = new Float32Array(sourceData.length);
      
      for (let i = 0; i < sourceData.length; i++) {
        let gain = 1.0;
        const samplesFromEnd = sourceData.length - i;
        if (samplesFromEnd <= fadeSamples) {
          // Linear fade-out: 1 to 0
          gain = samplesFromEnd / fadeSamples;
        }
        fadedData[i] = sourceData[i] * gain;
      }
      
      return fadedData;
    }
  };

  return fadedBuffer;
};

/**
 * Waveform style options for createWaveformData.
 */
export type WaveformStyle = 'line' | 'filled' | 'peaks';

/**
 * Interface for waveform generation options.
 */
export interface WaveformOptions {
  /** Style of waveform to generate */
  style?: WaveformStyle;
  /** Width of the waveform in pixels */
  width: number;
  /** Height of the waveform in pixels */
  height: number;
  /** Whether to fill the waveform (for 'filled' style) */
  fill?: boolean;
  /** Color or intensity multiplier (0-1) */
  intensity?: number;
}

/**
 * Creates waveform data from an audio buffer for visualization.
 * @param audioBuffer The audio buffer to generate waveform from
 * @param options Configuration options for waveform generation
 * @returns Array of values representing the waveform (0 to options.height)
 */
export const createWaveformData = (
  audioBuffer: AudioBufferLike,
  options: WaveformOptions | number,
  height?: number
): number[] => {
  // Handle backward compatibility: if second argument is number, assume old signature
  let width: number;
  let opts: WaveformOptions;
  
  if (typeof options === 'number' && typeof height === 'number') {
    // Old signature: createWaveformData(audioBuffer, width, height)
    width = options;
    opts = { width, height };
  } else if (typeof options === 'object' && options !== null) {
    // New signature: createWaveformData(audioBuffer, options)
    opts = options as WaveformOptions;
    width = opts.width;
  } else {
    throw new Error('Invalid arguments for createWaveformData');
  }

  const { style = 'line', fill = false, intensity = 1.0 } = opts;
  
  if (width <= 0 || opts.height <= 0) {
    return new Array(width).fill(0);
  }

  const waveformData: number[] = new Array(width);
  const channelData = audioBuffer.getChannelData(0); // Use first channel (mono) or left channel (stereo)
  const step = Math.max(1, Math.ceil(channelData.length / width));
  
  for (let i = 0; i < width; i++) {
    let sum = 0;
    let samplesProcessed = 0;
    
    for (let j = 0; j < step; j++) {
      const index = i * step + j;
      if (index < channelData.length) {
        sum += Math.abs(channelData[index]);
        samplesProcessed++;
      }
    }
    
    const average = samplesProcessed > 0 ? sum / samplesProcessed : 0;
    // Normalize to 0-1 range (assuming audio is normalized to [-1, 1])
    const normalized = Math.min(1.0, average); // Clamp to max 1.0
    // Apply intensity and scale to height
    let value = normalized * intensity * opts.height;
    
    // Apply different styles
    if (style === 'filled' && fill) {
      // For filled style, we create a filled waveform effect
      // This is a simplified approach - in reality, filled would need min/max values
      // No op for filled style in this simplified implementation
    } else if (style === 'peaks') {
      // For peaks style, emphasize peaks by giving them more weight
      value = value > (opts.height * 0.3) ? value : value * 0.5;
    }
    // 'line' style uses the value as-is
    
    // Ensure value is within bounds
    waveformData[i] = Math.max(0, Math.min(opts.height, value));
  }
  
  return waveformData;
};