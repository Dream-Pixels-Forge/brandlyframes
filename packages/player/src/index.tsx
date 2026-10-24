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
import { compareRenderFrames, type RenderFrameDiff } from './compare-frames';

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
  /** Render a single frame at render quality via `onRenderFrame` (render-parity mode, BF-440). */
  renderFrame(frame: number): Promise<Uint8Array>;
  /**
   * Capture the render frame and the preview frame (via `onRenderFrame` /
   * `onPreviewFrame`, defaulting to the render bytes) and diff them with
   * `compareRenderFrames` (BF-440). Defaults to the current frame; requires
   * `onRenderFrame`, otherwise returns null.
   */
  runRenderDiff(frame?: number): Promise<RenderFrameDiff | null>;
  /** Get the last render-vs-preview diff produced by `runRenderDiff` (null initially). */
  getRenderDiff(): RenderFrameDiff | null;
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
  /** Render-parity mode (BF-440): when paused, shows the exact render-quality frame from `onRenderFrame`. No-op without `onRenderFrame`. */
  renderParityMode?: boolean;
  /**
   * Injected render callback that returns render-quality pixels for a frame
   * (mirrors the renderer's injectable-launcher pattern; no real FFmpeg here).
   */
  onRenderFrame?: (frame: number) => Promise<Uint8Array>;
  /**
   * Injected preview callback that returns preview-quality pixels for a frame.
   * Defaults to the render bytes (zero diff) when not provided.
   */
  onPreviewFrame?: (frame: number) => Promise<Uint8Array>;
  /**
   * Callback invoked with the render-vs-preview frame diff after
   * `runRenderDiff` completes (BF-440).
   */
  onRenderDiff?: (diff: RenderFrameDiff) => void;
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
      renderParityMode = false,
      onRenderFrame,
      onPreviewFrame,
      onRenderDiff,
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

    // Render-parity mode (BF-440): render-quality frame exposed when paused
    const [renderResult, setRenderResult] = useState<Uint8Array | null>(null);
    const [renderDiff, setRenderDiff] = useState<RenderFrameDiff | null>(null);
    const parityCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const renderFrame = useCallback(
      async (frame: number): Promise<Uint8Array> => {
        if (!onRenderFrame) {
          throw new Error('Player.renderFrame: onRenderFrame is not provided');
        }
        try {
          const pixels = await onRenderFrame(frame);
          setRenderResult(pixels);
          return pixels;
        } catch (err) {
          throw err instanceof Error ? err : new Error(String(err));
        }
      },
      [onRenderFrame],
    );

    // Run an end-to-end render-quality diff: capture the render frame and the
    // preview frame (defaulting to the render bytes → zero diff), compare with
    // compareRenderFrames, and surface the result via state + onRenderDiff.
    // Errors from capture propagate to the caller. No-op without onRenderFrame.
    const runRenderDiff = useCallback(
      async (frame?: number): Promise<RenderFrameDiff | null> => {
        if (!onRenderFrame) return null;
        const targetFrame = frame ?? state.currentFrame;
        const renderBytes = await onRenderFrame(targetFrame);
        const previewBytes = onPreviewFrame
          ? await onPreviewFrame(targetFrame)
          : renderBytes;
        const diff = compareRenderFrames(renderBytes, previewBytes);
        setRenderDiff(diff);
        onRenderDiff?.(diff);
        return diff;
      },
      [onRenderFrame, onPreviewFrame, onRenderDiff, state.currentFrame],
    );

    // When paused + parity mode + callback: render the current frame at
    // render quality. No-op without onRenderFrame; never interrupts playback.
    useEffect(() => {
      if (!state.isPlaying && renderParityMode && onRenderFrame) {
        // Fire-and-forget: a failed parity render must not interrupt playback.
        // Imperative callers await renderFrame() to observe errors.
        void renderFrame(state.currentFrame).catch(() => undefined);
      }
    }, [state.isPlaying, renderParityMode, onRenderFrame, renderFrame, state.currentFrame]);

    // Paint the render result into the overlay canvas once it mounts.
    useEffect(() => {
      if (!renderResult) return;
      const canvas = parityCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imageData = ctx.createImageData(compWidth, compHeight);
      const writeLen = Math.min(imageData.data.length, renderResult.length);
      imageData.data.set(renderResult.subarray(0, writeLen));
      ctx.putImageData(imageData, 0, 0);
    }, [renderResult, compWidth, compHeight]);

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
      renderFrame: (frame: number) => renderFrame(frame),
      runRenderDiff,
      getRenderDiff: () => renderDiff,
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
        {/* Render-parity overlay: exact render-quality frame when paused (BF-440) */}
        {renderParityMode && !state.isPlaying && renderResult && (
          <canvas
            ref={parityCanvasRef}
            data-testid="render-parity-frame"
            width={compWidth}
            height={compHeight}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#000',
            }}
          />
        )}
        {renderControls()}
      </div>
    );
  }
);

Player.displayName = 'Player';

/** Re-export registerRoot from core for convenience */
export { registerRoot } from 'brandlyframes';

/**
 * Pure pixel comparison between two rendered frames (BF-440).
 * Consumed by the Studio "diff preview vs render" button.
 */
export { compareRenderFrames } from './compare-frames';
export type { RenderFrameDiff } from './compare-frames';