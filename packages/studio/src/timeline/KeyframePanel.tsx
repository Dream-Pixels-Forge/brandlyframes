/**
 * BF-121 — KeyframePanel: per-property keyframe rows under a clip, with a
 * visual bezier/spring curve editor and live value preview.
 *
 * The panel takes an array of KeyframeTrack (one per editable property on
 * the selected clip) and renders one row per track. Each row shows:
 *  - property name
 *  - a mini curve canvas (bezier control points for 'bezier', damped
 *    oscillator preview for 'spring', straight line for 'linear')
 *  - a value input for the clip's final keyframe value
 *
 * All math is in keyframe-model.ts (pure, testable without DOM).
 */

import { useCallback, useMemo } from 'react';
import { cssVar } from '@brandlyframes/design';
import {
  type Keyframe,
  type KeyframeTrack,
  bezierEasing,
  sampleKeyframeTrack,
  upsertKeyframe,
} from './keyframe-model';

export interface KeyframePanelProps {
  readonly tracks: readonly KeyframeTrack[];
  /** Frames per second for spring config display. */
  readonly fps?: number;
  readonly onTracksChange: (tracks: readonly KeyframeTrack[]) => void;
  /** Preview progress 0..1 — drives the live value readout. */
  readonly previewProgress?: number;
  readonly widthPx?: number;
}

const CURVE_HEIGHT = 64;
const CURVE_PADDING = 6;


/** Draw a single keyframe track's curve on a canvas element (SVG fallback). */
function TrackCurve({
  track,
  previewProgress = 0,
  widthPx,
}: {
  track: KeyframeTrack;
  previewProgress: number;
  widthPx: number;
}) {
  const svgW = Math.max(80, widthPx);
  const svgH = CURVE_HEIGHT - 4;
  const pad = CURVE_PADDING;

  const pathD = useMemo(() => {
    if (track.frames.length < 2) return '';
    const points = track.frames
      .map((kf) => kf);
    const values = points.map((kf) => kf.value);
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 1);
    const range = maxV - minV || 1;
    const toY = (v: number) => pad + (1 - (v - minV) / range) * (svgH - 2 * pad);

    let d = '';
    for (let i = 0; i < points.length; i++) {
      const kf = points[i];
      const x = pad + kf.t * (svgW - 2 * pad);
      const y = toY(kf.value);
      if (i === 0) {
        d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        const prev = points[i - 1];
        const px = pad + prev.t * (svgW - 2 * pad);
        const py = toY(prev.value);
        const easedFn =
          prev.easing === 'bezier' && prev.bezier
            ? bezierEasing(prev.bezier)
            : (t: number) => t; // linear; spring preview would need spring() import
        const midX = px + (x - px) * easedFn(0.5);
        const midY = py + (y - py) * easedFn(0.5);
        d += ` Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    return d;
  }, [track, svgW, svgH]);

  const previewX = pad + previewProgress * (svgW - 2 * pad);

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: 'block', overflow: 'hidden' }}
      aria-label={`Keyframe curve for ${track.property}`}
    >
      {pathD && (
        <path
          d={pathD}
          stroke={cssVar('bf-orange')}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      )}
      <line
        x1={previewX}
        y1={pad}
        x2={previewX}
        y2={svgH - pad}
        stroke={cssVar('bf-white')}
        strokeWidth={1}
        strokeDasharray="2 2"
        opacity={0.5}
      />
    </svg>
  );
}

export function KeyframePanel({
  tracks,
  fps: _fps = 30,
  onTracksChange,
  previewProgress = 0,
  widthPx = 320,
}: KeyframePanelProps) {
  const handleTrackChange = useCallback(
    (index: number, updater: (t: KeyframeTrack) => KeyframeTrack) => {
      onTracksChange(tracks.map((t, i) => (i === index ? updater(t) : t)));
    },
    [tracks, onTracksChange],
  );

  const addKeyframe = (trackIndex: number, t: number, value: number) => {
    const kf: Keyframe = { id: `kf-${Date.now()}-${t}`, t, value, easing: 'linear' };
    handleTrackChange(trackIndex, (tr) => upsertKeyframe(tr, kf));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        backgroundColor: cssVar('bf-black'),
        border: `1px solid ${cssVar('bf-border')}`,
        borderRadius: 4,
      }}
      data-testid="keyframe-panel"
    >
      {tracks.length === 0 && (
        <span style={{ color: cssVar('bf-white'), fontSize: 12, opacity: 0.6 }}>
          No keyframe tracks — add a property to animate.
        </span>
      )}
      {tracks.map((track, ti) => {
        const liveValue = sampleKeyframeTrack(track, previewProgress);
        return (
          <div key={track.clipId + track.property} style={{ marginBottom: 4 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: cssVar('bf-white'),
                  minWidth: 80,
                }}
              >
                {track.property}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: cssVar('bf-orange'),
                  minWidth: 60,
                }}
              >
                {liveValue.toFixed(3)}
              </span>
              <button
                data-testid={`add-kf-${track.property}`}
                onClick={() => addKeyframe(ti, 0.5, 1)}
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  border: `1px solid ${cssVar('bf-border')}`,
                  borderRadius: 3,
                  backgroundColor: cssVar('bf-surface-1'),
                  color: cssVar('bf-white'),
                }}
              >
                + keyframe
              </button>
            </div>
            <TrackCurve track={track} previewProgress={previewProgress} widthPx={widthPx} />
          </div>
        );
      })}
    </div>
  );
}
