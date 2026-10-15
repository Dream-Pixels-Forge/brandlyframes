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
  /**
   * Exact rational frame rate mirroring `@brandlyframes/frames` `Rational`
   * (`{ num, den }`, `den > 0`). Optional so existing contracts keep working;
   * set by {@link applyProbedFrameRate} when a probe result is available.
   */
  frameRateRational?: FrameRateRational;
}

/**
 * Rational frame rate mirroring the `Rational` interface from
 * `@brandlyframes/frames` (`{ num, den }`, `den > 0`).
 *
 * Defined locally so this package has no workspace dependency; the shape is
 * assignment-compatible. No logic is copied — only the two-field shape.
 */
export interface FrameRateRational {
  /** Numerator (frames per second numerator). Positive safe integer. */
  num: number;
  /** Denominator (frames per second denominator). Positive safe integer. */
  den: number;
}

/**
 * Check if we're in a browser environment
 */
const isBrowser = (): boolean => {
  return (
    typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Audio !== 'undefined'
  );
};

/**
 * Minimal shape of a media track list (`audioTracks` / `videoTracks`).
 * Not exposed with a `codec` field in the standard TypeScript DOM lib.
 */
interface TrackListLike {
  length: number;
  [index: number]: { codec?: string };
}

type MediaElementWithTracks = HTMLMediaElement & {
  audioTracks?: TrackListLike;
  videoTracks?: TrackListLike;
};

/** Structural type for the optional @brandlyframes/webcodecs module. */
interface WebCodecsModule {
  parseVideoMetadataWebCodecs?: (blob: Blob) => Promise<{
    frameRate: number;
    pixelFormat: string;
    codec: string;
  }>;
  parseAudioMetadataWebCodecs?: (blob: Blob) => Promise<{
    sampleRate: number;
    channelCount: number;
    codec: string;
  }>;
  probeVideo?: (blob: Blob) => Promise<VideoProbeResult>;
  probeVideoFallback?: (
    videoElement: ProbeableVideoElement,
    sourceInfo: VideoProbeSourceInfo,
  ) => VideoProbeResult;
}

/**
 * Minimal structural result of a webcodecs video probe.
 * Mirrors `ProbedVideo` from `@brandlyframes/webcodecs` without importing it,
 * keeping media-parser decoupled (dynamic import only).
 */
export interface VideoProbeResult {
  /** Exact rational frame rate. */
  fps: FrameRateRational;
  /** Frame count (estimated unless the probe knew it exactly). */
  frameCount: number;
  /** Color space label, or `'unknown'`. */
  colorSpace: string;
  /** Whether the stream carries an alpha channel. */
  hasAlpha: boolean;
  /** Variable-frame-rate heuristic flag. */
  isVFR: boolean;
  /** Codec string, or `''` when unknown. */
  codec: string;
  /** Intrinsic video width in pixels. */
  width: number;
  /** Intrinsic video height in pixels. */
  height: number;
  /** Media duration in seconds. */
  duration: number;
}

/**
 * Minimal structural source-info for a webcodecs probe call.
 * Mirrors `ProbeSourceInfo` from `@brandlyframes/webcodecs`.
 */
export interface VideoProbeSourceInfo {
  /** Codec string hint. */
  codec?: string;
  /** Exact frame count hint. */
  frameCountHint?: number;
  /** Color space label hint. */
  colorSpace?: string;
  /** Alpha channel hint. */
  hasAlpha?: boolean;
}

/**
 * Minimal structural video element for probe delegation.
 * Satisfied by `HTMLVideoElement` and by plain mocks in tests.
 */
export interface ProbeableVideoElement {
  /** Media duration in seconds. */
  duration: number;
  /** Intrinsic video width in pixels. */
  videoWidth: number;
  /** Intrinsic video height in pixels. */
  videoHeight: number;
  /** Optional playback-quality readout used for the VFR heuristic. */
  getVideoPlaybackQuality?: () => {
    droppedVideoFrames: number;
    totalVideoFrames: number;
  };
}

/**
 * Merge a probed exact-rational fps into video metadata.
 *
 * Keeps the legacy numeric `frameRate` (`num / den`) for existing consumers
 * and additionally records the exact `frameRateRational`. Degenerate rationals
 * (`den <= 0` or non-finite) leave `frameRate` as `0` and still attach the
 * rational as given. Never mutates its input.
 *
 * @param metadata Base video metadata (all fields preserved)
 * @param fps Exact rational frame rate from a probe
 * @returns New `VideoMetadata` with `frameRate` and `frameRateRational` set
 */
export const applyProbedFrameRate = (
  metadata: VideoMetadata,
  fps: FrameRateRational,
): VideoMetadata => {
  const frameRate =
    Number.isFinite(fps.num) && Number.isFinite(fps.den) && fps.den > 0 ? fps.num / fps.den : 0;
  return {
    ...metadata,
    frameRate,
    frameRateRational: { ...fps },
  };
};

/**
 * Probe a video blob via `@brandlyframes/webcodecs` when available.
 *
 * Browser path: dynamically imports the webcodecs probe (the source of
 * truth for video probing) and delegates. Node / unavailable path: rejects
 * with the same environment error `parseMediaMetadata` uses. The audio path
 * is untouched by this function.
 *
 * @param mediaBlob The video blob to probe
 * @returns Promise resolving to the webcodecs probe result
 * @throws Error when outside a browser environment or the probe is unavailable
 */
export const probeVideo = async (mediaBlob: Blob): Promise<VideoProbeResult> => {
  if (!isBrowser()) {
    throw new Error(
      'Media parser requires a browser environment with window, document, and Audio globals',
    );
  }
  const webCodecsModule = await tryImportWebCodecs();
  if (webCodecsModule?.probeVideo) {
    return webCodecsModule.probeVideo(mediaBlob);
  }
  throw new Error(
    'Media parser requires a browser environment with window, document, and Audio globals',
  );
};

/**
 * Safely read the codec string from the first audio/video track, if present.
 * @param mediaElement The media element to inspect
 * @param kind Which track list to read
 * @returns The codec string, or '' when unavailable
 */
const getTrackCodec = (
  mediaElement: HTMLMediaElement,
  kind: 'audioTracks' | 'videoTracks',
): string => {
  const tracks = (mediaElement as MediaElementWithTracks)[kind];
  if (tracks && tracks.length > 0) {
    return tracks[0].codec ?? '';
  }
  return '';
};

/**
 * Try to import the webcodecs package dynamically
 * @returns Promise resolving to the webcodecs module or null if not available
 */
const tryImportWebCodecs = async (): Promise<WebCodecsModule | null> => {
  // Check if we're in a browser environment first
  if (!isBrowser()) {
    return null;
  }

  try {
    // Try to dynamically import the webcodecs package
    // We use a dynamic import to avoid hard dependency
    const module = await import('@brandlyframes/webcodecs');
    return module;
  } catch {
    // WebCodecs package might not be available or might fail to import
    // Return null to indicate fallback to built-in implementation
    return null;
  }
};

/**
 * Parse media metadata from a blob
 * @param mediaBlob The media blob to parse
 * @returns Promise resolving to audio or video metadata
 * @throws Error if not in a browser environment or if media type is unsupported
 */
export const parseMediaMetadata = async (
  mediaBlob: Blob,
): Promise<AudioMetadata | VideoMetadata> => {
  // Check if we're in a browser environment
  if (!isBrowser()) {
    throw new Error(
      'Media parser requires a browser environment with window, document, and Audio globals',
    );
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
    const mediaElement = isAudio ? new Audio() : document.createElement('video');

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
    const height =
      'videoHeight' in mediaElement ? (mediaElement as HTMLVideoElement).videoHeight : 0;

    // Calculate bitrate from blob size and duration
    const bitrate = duration > 0 ? (mediaBlob.size * 8) / duration : 0;

    // Try to get codec from tracks
    let codec = '';
    let sampleRate = 0;
    let channelCount = 0;
    let frameRate = 0;
    let pixelFormat = '';
    let frameRateRational: FrameRateRational | undefined;

    if (isAudio) {
      // Try to get codec from audio tracks
      codec = getTrackCodec(mediaElement, 'audioTracks');

      // Try to get sample rate and channel count using Web Audio API
      try {
        type AudioContextCtor = typeof AudioContext;
        const AudioContextClass: AudioContextCtor | undefined =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API is not available');
        }
        const audioContext = new AudioContextClass();
        const source = audioContext.createMediaElementSource(mediaElement);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // Get the sample rate from the audio context
        sampleRate = audioContext.sampleRate;

        // Get channel count by decoding the audio data
        // We need to fetch the blob as ArrayBuffer and decode it
        const arrayBuffer = await mediaBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        channelCount = audioBuffer.numberOfChannels;
      } catch {
        // Web Audio API might not be available or might fail
        // Leave sampleRate and channelCount as 0
      }
    } else if (isVideo) {
      // Try to get codec from video tracks
      codec = getTrackCodec(mediaElement, 'videoTracks');

      // Try the webcodecs probe first (source of truth for video probing),
      // then fall back to the legacy numeric metadata path.
      // Behavior is preserved: frameRate still ends up numeric,
      // with the exact Rational additionally attached when available.
      try {
        const webCodecsModule = await tryImportWebCodecs();
        if (webCodecsModule?.probeVideoFallback) {
          const probed = webCodecsModule.probeVideoFallback(
            mediaElement as unknown as ProbeableVideoElement,
            {},
          );
          frameRate = probed.fps.den > 0 ? probed.fps.num / probed.fps.den : 0;
          frameRateRational = { ...probed.fps };
          if (probed.codec) {
            codec = probed.codec;
          }
        } else if (webCodecsModule?.parseVideoMetadataWebCodecs) {
          const webCodecsResult = await webCodecsModule.parseVideoMetadataWebCodecs(mediaBlob);
          frameRate = webCodecsResult.frameRate;
          pixelFormat = webCodecsResult.pixelFormat;
          // Only override codec if we got a valid one from webcodecs
          if (webCodecsResult.codec) {
            codec = webCodecsResult.codec;
          }
        }
      } catch (e) {
        // WebCodecs might not be available or might fail
        // Leave frameRate and pixelFormat as default values (0 and empty string)
        console.warn('WebCodecs not available or failed in media-parser:', e);
      }
    }

    // Return the appropriate metadata type
    if (isAudio) {
      return {
        duration: isNaN(duration) ? 0 : duration,
        size: {
          width: width,
          height: height,
        },
        format: mediaBlob.type.split('/')[1] || 'unknown',
        bitrate: bitrate,
        sampleRate: sampleRate,
        channelCount: channelCount,
        codec: codec,
      };
    } else {
      return {
        duration: isNaN(duration) ? 0 : duration,
        size: {
          width: width,
          height: height,
        },
        format: mediaBlob.type.split('/')[1] || 'unknown',
        bitrate: bitrate,
        frameRate: frameRate,
        codec: codec,
        pixelFormat: pixelFormat,
        ...(frameRateRational !== undefined ? { frameRateRational } : {}),
      };
    }
  } catch (error) {
    // Clean up object URL on error
    URL.revokeObjectURL(url);
    throw error;
  }
};
