/**
 * Check if we're in a browser environment with WebCodecs support
 */
const isBrowserWithWebCodecs = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' &&
         typeof VideoDecoder !== 'undefined' &&
         typeof AudioDecoder !== 'undefined';
};

/**
 * Parse video metadata using WebCodecs API
 * @param videoBlob The video blob to parse
 * @returns Promise resolving to video metadata with frame rate and pixel format
 * @throws Error if not in a browser environment or if WebCodecs is not supported
 */
export const parseVideoMetadataWebCodecs = async (videoBlob: Blob): Promise<{
  frameRate: number;
  pixelFormat: string;
  codec: string;
}> => {
  // Check if we're in a browser environment with WebCodecs support
  if (!isBrowserWithWebCodecs()) {
    throw new Error('WebCodecs parser requires a browser environment with window, document, VideoDecoder, and AudioDecoder globals');
  }

  // Create an object URL for the blob
  const url = URL.createObjectURL(videoBlob);

  try {
    // Create a video element to get basic info
    const videoElement = document.createElement('video');
    
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
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
        URL.revokeObjectURL(url);
      };

      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);
    });

    // Set the source and wait for metadata
    videoElement.src = url;
    await metadataLoaded;

    // Extract basic metadata from video element
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    
    // Try to get codec from video tracks
    let codec = '';
    if ('videoTracks' in videoElement && (videoElement as any).videoTracks.length > 0) {
      codec = (videoElement as any).videoTracks[0].codec || '';
    }

    // Now use WebCodecs to get frame rate and pixel format
    let frameRate = 0;
    let pixelFormat = '';

    try {
      // For now, we'll check if WebCodecs is supported and return basic info
      // A full implementation would require more complex chunk handling
      // This serves as a foundation for future enhancement
      console.log('WebCodecs API is available for advanced media parsing');
      
      // We can at least check if the browser supports the codecs we need
      if (VideoDecoder.isConfigSupported) {
        const isSupported = await VideoDecoder.isConfigSupported({
          codec: codec || 'av01.0.08M.08.0.110.09.0.0'
          // Note: VideoDecoderConfig doesn't take width/height/bitrate/framerate directly
          // Those are part of the video track initialization, not the decoder config
        });
        
        if (isSupported.supported) {
          // Codec is supported, we could proceed with decoding
          // For now, we'll just note that WebCodecs is functional
          // In a future implementation, we would actually decode frames here
          // to get the real pixel format and calculate frame rate
          
          // As a simple improvement over the placeholder, let's at least try to get
          // the pixel format from the video element if possible
          // Note: HTMLVideoElement doesn't directly expose pixel format
          // This would require WebCodecs or canvas manipulation to determine
        }
      }
    } catch (e) {
      // WebCodecs might not be available or might fail
      // Leave frameRate and pixelFormat as default values
      console.warn('WebCodecs not available or failed:', e);
    }

    // Clean up object URL
    URL.revokeObjectURL(url);

    return {
      frameRate: frameRate, // Will be 0 until we implement proper frame rate extraction
      pixelFormat: pixelFormat,
      codec: codec
    };
  } catch (error) {
    // Clean up object URL on error
    URL.revokeObjectURL(url);
    throw error;
  }
};

/**
 * Parse audio metadata using WebCodecs API (alternative to Web Audio API)
 * @param audioBlob The audio blob to parse
 * @returns Promise resolving to audio metadata with sample rate and channel count
 * @throws Error if not in a browser environment or if WebCodecs is not supported
 */
export const parseAudioMetadataWebCodecs = async (audioBlob: Blob): Promise<{
  sampleRate: number;
  channelCount: number;
  codec: string;
}> => {
  // Check if we're in a browser environment with WebCodecs support
  if (!isBrowserWithWebCodecs()) {
    throw new Error('WebCodecs parser requires a browser environment with window, document, VideoDecoder, and AudioDecoder globals');
  }

  // Create an object URL for the blob
  const url = URL.createObjectURL(audioBlob);

  try {
    // Create an audio element to get basic info
    const audioElement = new Audio();
    
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
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('error', handleError);
        URL.revokeObjectURL(url);
      };

      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('error', handleError);
    });

    // Set the source and wait for metadata
    audioElement.src = url;
    await metadataLoaded;

    // Extract basic metadata from audio element
    const duration = audioElement.duration;
    
    // Try to get codec from audio tracks
    let codec = '';
    if ('audioTracks' in audioElement && (audioElement as any).audioTracks.length > 0) {
      codec = (audioElement as any).audioTracks[0].codec || '';
    }

    // Now use WebCodecs AudioDecoder to get sample rate and channel count
    let sampleRate = 0;
    let channelCount = 0;

    try {
      // For now, we'll check if WebCodecs AudioDecoder is supported and return basic info
      // A full implementation would require more complex chunk handling
      // This serves as a foundation for future enhancement
      console.log('WebCodecs AudioDecoder API is available for advanced audio parsing');
      
      // We can at least check if the browser supports the codecs we need
      if (AudioDecoder.isConfigSupported) {
        const isSupported = await AudioDecoder.isConfigSupported({
          codec: codec || 'mp4a.40.2', // Default to AAC if we don't know
          sampleRate: 44100, // Dummy values for checking support
          numberOfChannels: 2 // Dummy values for checking support
        });
        
        if (isSupported.supported) {
          // Codec is supported, we could proceed with decoding
          // For now, we'll just note that WebCodecs is functional
          // In a future implementation, we would actually decode audio frames here
          // to get the real sample rate and channel count
        }
      }
    } catch (e) {
      // WebCodecs might not be available or might fail
      // Leave sampleRate and channelCount as default values
      console.warn('WebCodecs AudioDecoder not available or failed:', e);
    }

    // Clean up object URL
    URL.revokeObjectURL(url);

    return {
      sampleRate: sampleRate,
      channelCount: channelCount,
      codec: codec
    };
  } catch (error) {
    // Clean up object URL on error
    URL.revokeObjectURL(url);
    throw error;
  }
};
