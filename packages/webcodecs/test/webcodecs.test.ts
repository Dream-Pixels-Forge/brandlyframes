import { describe, it, expect } from 'vitest';
import { 
  parseVideoMetadataWebCodecs,
  parseAudioMetadataWebCodecs
} from '../src/index';

describe('webcodecs', () => {
  describe('parseVideoMetadataWebCodecs', () => {
    it('should be defined', () => {
      expect(parseVideoMetadataWebCodecs).toBeDefined();
    });

    it('should throw error when not in browser environment', async () => {
      // Create a simple video blob for testing
      const videoBlob = new Blob(['fake video data'], { 
        type: 'video/mp4' 
      });

      // Since we're not in a browser environment in tests, this should throw
      await expect(parseVideoMetadataWebCodecs(videoBlob)).rejects.toThrow('WebCodecs parser requires a browser environment');
    });
  });

  describe('parseAudioMetadataWebCodecs', () => {
    it('should be defined', () => {
      expect(parseAudioMetadataWebCodecs).toBeDefined();
    });

    it('should throw error when not in browser environment', async () => {
      // Create a simple audio blob for testing
      const audioBlob = new Blob(['fake audio data'], { 
        type: 'audio/mp4' 
      });

      // Since we're not in a browser environment in tests, this should throw
      await expect(parseAudioMetadataWebCodecs(audioBlob)).rejects.toThrow('WebCodecs parser requires a browser environment');
    });
  });
});
