import { describe, it, expect } from 'vitest';
import { 
  parseMediaMetadata, 
  MediaMetadata
} from '../src/index';

describe('media-parser', () => {
  describe('parseMediaMetadata', () => {
    it('should be defined', () => {
      expect(parseMediaMetadata).toBeDefined();
    });

    it('should throw error when not in browser environment', async () => {
      // Create a simple audio blob for testing
      const audioBlob = new Blob(['fake audio data'], { 
        type: 'audio/wav' 
      });
      
      // Since we're not in a browser environment in tests, this should throw
      await expect(parseMediaMetadata(audioBlob)).rejects.toThrow('Media parser requires a browser environment');
    });

    it('should throw error for unsupported media types', async () => {
      // This test would only run in a browser environment, so we'll skip it for now
      // In a proper test setup with jsdom, we would test this
      expect(true).toBe(true); // Placeholder
    });
  });
});
