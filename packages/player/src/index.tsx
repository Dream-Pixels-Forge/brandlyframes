import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useCurrentFrame, useVideoConfig } from 'brandlyframes';
import { Button } from '@brandlyframes/design';

/** Player ref API exposed to consumers */
export interface PlayerRef {
  /** Start playback from current position */
  play(): void;
  /** Pause playback */
  pause(): void;
  /** Seek to a specific frame (0-indexed) */
  seekTo(frame: number): void;
  /** Get current frame (0-indexed) */
  getCurrentFrame(): number;
  /** Get total duration in frames */
  getDurationInFrames(): number;
  /** Get current playback rate */
  getPlaybackRate(): number;
  /** Set playback rate (1 = normal) */
  setPlaybackRate(rate: number): void;
  /** Check if currently playing */
  isPlaying(): boolean;
}

/** Player props */
export interface PlayerProps {
  /** Composition ID to play (must be registered via registerRoot) */
  compositionId: string;
  /** Input props passed to the composition */
  inputProps?: Record<string, unknown>;
  /** Autoplay on mount */
  autoPlay?: boolean;
  /** Loop playback */
  loop?: boolean;
  /** Initial playback rate */
  playbackRate?: number;
  /** Show default controls */
  controls?: boolean;
  /** Width in pixels (default: composition width) */
  width?: number;
  /** Height in pixels (default: composition height) */
  height?: number;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback pauses */
  onPause?: () => void;
  /** Callback when frame changes during playback */
  onFrameChange?: (frame: number) => void;
  /** Callback when composition ends (if not looping) */
  onEnded?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom className */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

/** Internal player state */
interface PlayerState {
  currentFrame: number;
  isPlaying: boolean;
  playbackRate: number;
  durationInFrames: number;
  width: number;
  height: number;
  fps: number;
  error: Error | null;
}

/**
 * BrandlyFrames Player — embeddable web player for BrandlyFrames compositions.
 * 
 * @example
 * ```tsx
 * import { Player, registerRoot } from '@brandlyframes/player';
 * import { MyComposition } from './compositions';
 * 
 * registerRoot(MyComposition);
 * 
 * <Player compositionId="my-comp" autoPlay loop controls />
 * ```
 */
export const Player = forwardRef<PlayerRef, PlayerProps>(
  (
    {
      compositionId,
      inputProps = {},
      autoPlay = false,
      loop = false,
      playbackRate = 1,
      controls = true,
      width,
      height,
      onPlay,
      onPause,
      onFrameChange,
      onEnded,
      onError,
      className = '',
      style = {},
    },
    ref,
  ) => {
    // Get video config from the composition
    const videoConfig = useVideoConfig();
    const durationInFrames = videoConfig.durationInFrames;
    const fps = videoConfig.fps;
    const compWidth = width ?? videoConfig.width;
    const compHeight = height ?? videoConfig.height;

    // Internal state
    const [state, setState] = useState<PlayerState>({
      currentFrame: 0,
      isPlaying: autoPlay,
      playbackRate,
      durationInFrames,
      width: compWidth,
      height: compHeight,
      fps,
      error: null,
    });

    // Refs for animation loop
    const animationRef = useRef<number | null>(null);
    const lastFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      play: () => {
        if (!state.isPlaying) {
          setState(prev => ({ ...prev, isPlaying: true }));
          onPlay?.();
        }
      },
      pause: () => {
        if (state.isPlaying) {
          setState(prev => ({ ...prev, isPlaying: false }));
          onPause?.();
        }
      },
      seekTo: (frame: number) => {
        const clampedFrame = Math.max(0, Math.min(frame, durationInFrames - 1));
        setState(prev => ({ ...prev, currentFrame: clampedFrame }));
        onFrameChange?.(clampedFrame);
      },
      getCurrentFrame: () => state.currentFrame,
      getDurationInFrames: () => durationInFrames,
      getPlaybackRate: () => state.playbackRate,
      setPlaybackRate: (rate: number) => {
        setState(prev => ({ ...prev, playbackRate: rate }));
      },
      isPlaying: () => state.isPlaying,
    }));

    // Animation loop for playback
    const animate = useCallback((currentTime: number) => {
      if (!state.isPlaying) return;

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // seconds
      const frameDelta = deltaTime * fps * state.playbackRate;

      if (frameDelta >= 1) {
        let newFrame = lastFrameRef.current + Math.floor(frameDelta);
        
        if (newFrame >= durationInFrames) {
          if (loop) {
            newFrame = newFrame % durationInFrames;
          } else {
            newFrame = durationInFrames - 1;
            setState(prev => ({ ...prev, isPlaying: false }));
            onPause?.();
            onEnded?.();
          }
        }

        lastFrameRef.current = newFrame;
        setState(prev => ({ ...prev, currentFrame: newFrame, isPlaying: newFrame < durationInFrames - 1 || loop }));
        onFrameChange?.(newFrame);
        lastTimeRef.current = currentTime;
      }

      if (state.isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }, [state.isPlaying, state.playbackRate, fps, durationInFrames, loop, onPlay, onPause, onEnded, onFrameChange]);

    // Start/stop animation loop
    useEffect(() => {
      if (state.isPlaying) {
        lastTimeRef.current = performance.now();
        lastFrameRef.current = state.currentFrame;
        animationRef.current = requestAnimationFrame(animate);
      } else if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [state.isPlaying, animate]);

    // Handle frame changes from external seek
    useEffect(() => {
      lastFrameRef.current = state.currentFrame;
    }, [state.currentFrame]);

    // Error boundary wrapper for composition
    const [renderError, setRenderError] = useState<Error | null>(null);

    if (renderError) {
      onError?.(renderError);
      return (
        <div className="player-error" style={style} data-class={className}>
          <div className="player-error-content">
            <strong>Player Error:</strong> {renderError.message}
            <Button onClick={() => setRenderError(null)}>Retry</Button>
          </div>
        </div>
      );
    }

    // Default controls UI
    const renderControls = () => {
      if (!controls) return null;

      const formatTime = (frames: number) => {
        const secs = Math.floor(frames / fps);
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}:${s.toString().padStart(2, '0')}`;
      };

      return (
        <div className="player-controls" style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          padding: '8px 12px',
          background: 'linear-gradient(transparent, #000)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fff',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
        }}>
          <Button 
            variant={state.isPlaying ? 'secondary' : 'primary'}
            onClick={() => {
              const newPlaying = !state.isPlaying;
              setState(prev => ({ ...prev, isPlaying: newPlaying }));
              if (newPlaying) {
                onPlay?.();
              } else {
                onPause?.();
              }
            }}
            style={{ padding: '4px 12px' }}
          >
            {state.isPlaying ? '⏸' : '▶'}
          </Button>
          <span>{formatTime(state.currentFrame)} / {formatTime(durationInFrames)}</span>
          <input
            type="range"
            min={0}
            max={durationInFrames - 1}
            value={state.currentFrame}
            onChange={(e) => {
              const frame = parseInt(e.target.value, 10);
              setState(prev => ({ ...prev, currentFrame: frame }));
              onFrameChange?.(frame);
            }}
            style={{ flex: 1, maxWidth: '300px' }}
          />
          <span style={{ fontSize: '10px' }}>
            {state.playbackRate.toFixed(1)}x
          </span>
        </div>
      );
    };

    // Current frame from the frame context (for the actual composition rendering)
    const currentFrame = useCurrentFrame();

    return (
      <div
        className={`brandlyframes-player ${className}`}
        style={{
          position: 'relative',
          width: compWidth,
          height: compHeight,
          background: '#0a0a0a',
          overflow: 'hidden',
          ...style,
        }}
      >
        {/* Composition content area - the actual composition would be rendered here
            via the frame context provider. For now we show the current frame. */}
        <div 
          data-testid="composition-frame"
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}
        >
          Composition: {compositionId} | Frame: {currentFrame} / {durationInFrames} | Props: {JSON.stringify(inputProps)}
        </div>
        {renderControls()}
      </div>
    );
  }
);

Player.displayName = 'Player';

/** Re-export registerRoot from core for convenience */
export { registerRoot } from 'brandlyframes';