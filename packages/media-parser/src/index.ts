// TODO: Implement media parsing capabilities
export interface MediaMetadata {
  duration: number;
  size: {
    width: number;
    height: number;
  };
  format: string;
  bitrate: number;
}

export interface AudioMetadata extends MediaMetadata {
  sampleRate: number;
  channelCount: number;
  codec: string;
}

export interface VideoMetadata extends MediaMetadata {
  frameRate: number;
  codec: string;
  pixelFormat: string;
}

/**
 * Check if we're in a browser environment
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' &&
         typeof Audio !== 'undefined';
};

/**
 * Parse media metadata from a blob
 * @param mediaBlob The media blob to parse
 * @returns Promise resolving to audio or video metadata
 * @throws Error if not in a browser environment or if media type is unsupported
 */
export const parseMediaMetadata = async (mediaBlob: Blob): Promise<AudioMetadata | VideoMetadata> => {
  // Check if we're in a browser environment
  if (!isBrowser()) {
    throw new Error('Media parser requires a browser environment with window, document, and Audio globals');
  }
  
  // Create an object URL for the blob
  const url = URL.createObjectURL(mediaBlob);
  
  try {
    // Determine if it's audio or video based on blob type
    const isAudio = mediaBlob.type.startsWith('audio/');
    const isVideo = mediaBlob.type.startsWith('video/');
    
    if (!isAudio && !isVideo) {
      throw new Error('Unsupported media type');
    }
    
    // Create appropriate media element
    const mediaElement = isAudio 
      ? new Audio() 
      : document.createElement('video');
    
    // Set up event listeners for when metadata is loaded
    const metadataLoaded = new Promise<void>((resolve, reject) => {
      const handleLoadedMetadata = () => {
        resolve();
        cleanup();
      };
      
      const handleError = (e: Event) => {
        reject(e);
        cleanup();
      };
      
      const cleanup = () => {
        mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        mediaElement.removeEventListener('error', handleError);
        URL.revokeObjectURL(url);
      };
      
      mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.addEventListener('error', handleError);
    });
    
    // Set the source and wait for metadata
    mediaElement.src = url;
    await metadataLoaded;
    
    // Extract metadata
    const duration = mediaElement.duration;
    // Safely get video dimensions (only available on video elements)
    const width = 'videoWidth' in mediaElement ? (mediaElement as HTMLVideoElement).videoWidth : 0;
    const height = 'videoHeight' in mediaElement ? (mediaElement as HTMLVideoElement).videoHeight : 0;
    
    // Calculate bitrate from blob size and duration
    const bitrate = duration > 0 ? (mediaBlob.size * 8) / duration : 0;
    
    // Try to get codec from tracks
    let codec = '';
    let sampleRate = 0;
    let channelCount = 0;
    let frameRate = 0;
    let pixelFormat = '';
    
    if (isAudio) {
      // Try to get codec from audio tracks
      if ('audioTracks' in mediaElement && (mediaElement as any).audioTracks.length > 0) {
        codec = (mediaElement as any).audioTracks[0].codec || '';
      }
      // Note: sampleRate and channelCount are not directly available from HTMLAudioElement
      // We would need to use the Web Audio API to decode and analyze, which is complex.
      // For now, we'll leave them as 0 and note that they need to be implemented via Web Audio API.
    } else if (isVideo) {
      // Try to get codec from video tracks
      if ('videoTracks' in mediaElement && (mediaElement as any).videoTracks.length > 0) {
        codec = (mediaElement as any).videoTracks[0].codec || '';
      }
      // Frame rate is not directly available from HTMLVideoElement
      // Pixel format is also not available
      // These would require WebCodecs or other advanced APIs.
    }
    
    // Return the appropriate metadata type
    if (isAudio) {
      return {
        duration: isNaN(duration) ? 0 : duration,
        size: {
          width: width,
          height: height
        },
        format: mediaBlob.type.split('/')[1] || 'unknown',
        bitrate: bitrate,
        sampleRate: sampleRate,
        channelCount: channelCount,
        codec: codec
      };
    } else {
      return {
        duration: isNaN(duration) ? 0 : duration,
        size: {
          width: width,
          height: height
        },
        format: mediaBlob.type.split('/')[1] || 'unknown',
        bitrate: bitrate,
        frameRate: frameRate,
        codec: codec,
        pixelFormat: pixelFormat
      };
    }
  } catch (error) {
    // Clean up object URL on error
    URL.revokeObjectURL(url);
    throw error;
  }
};
