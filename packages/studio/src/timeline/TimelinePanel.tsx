/**
 * BF-120 — TimelinePanel: the visual timeline. Clips render as draggable
 * blocks with trim handles, markers sit on the ruler, and the playhead
 * scrubs in sync with the studio preview (the consumer wires `onSeek` to
 * the player, e.g. `playerRef.seekTo`).
 *
 * Geometry is driven by the `widthPx` prop (or the measured panel width) —
 * no layout reads inside pointer math, so the panel is deterministic in
 * jsdom and SSR. Drag/trim clamping lives in the pure reducers of
 * `timeline-model.ts`; the panel only forwards patches. A drag/trim patch is
 * always computed against the clip as it was at pointer-down, so patches are
 * idempotent for the consumer.
 */
import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { cssVar, monoNumeric, typography } from '@brandlyframes/design';
import {
  clamp,
  formatTimecode,
  frameToPx,
  moveClip,
  pxPerFrame,
  pxToFrame,
  trimClipEnd,
  trimClipStart,
  type TimelineClip,
  type TimelineClipPatch,
  type TimelineMarker,
} from './timeline-model';

export interface TimelinePanelProps {
  /** Composition duration in frames (the ruler span). */
  readonly durationInFrames: number;
  /** Frames per second for the timecode readout. Default 30. */
  readonly fps?: number;
  readonly clips: readonly TimelineClip[];
  readonly markers?: readonly TimelineMarker[];
  /** Current playhead frame (synced with the studio preview). */
  readonly currentFrame: number;
  /** Timeline width in px. Default 800 (or the measured panel width). */
  readonly widthPx?: number;
  /** Scrub: called with the frame under the pointer on the ruler. */
  readonly onSeek?: (frame: number) => void;
  /** Clip moved/trimmed; patch is relative to the clip at pointer-down. */
  readonly onClipChange?: (clipId: string, patch: TimelineClipPatch) => void;
  /** A clip body was pressed (selection). */
  readonly onClipSelect?: (clipId: string) => void;
  /** "Add marker" pressed — always at the current playhead frame. */
  readonly onMarkerAdd?: (frame: number) => void;
  /** A marker's remove button was pressed. */
  readonly onMarkerRemove?: (markerId: string) => void;
}

const RULER_HEIGHT = 28;
const ROW_HEIGHT = 34;
const HANDLE_WIDTH = 8;

/** Nice ruler step: first of the ladder giving ≤ 12 ticks. */
const rulerStep = (durationInFrames: number): number => {
  const ladder = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  for (const step of ladder) {
    if (durationInFrames / step <= 12) return step;
  }
  return 3600;
};

const clipRowStyle: CSSProperties = {
  position: 'relative',
  height: ROW_HEIGHT,
  backgroundColor: cssVar('bf-surface-1'),
  borderBottom: `1px solid ${cssVar('bf-border')}`,
};

function capturePointer(event: ReactPointerEvent<HTMLElement>): void {
  // jsdom has no pointer capture; real browsers need it to keep drags alive.
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    /* jsdom */
  }
}

type DragState =
  | { mode: 'move' | 'trim-start' | 'trim-end'; clipId: string; startX: number; from: number; durationInFrames: number }
  | { mode: 'scrub' }
  | null;

export function TimelinePanel({
  durationInFrames,
  fps = 30,
  clips,
  markers = [],
  currentFrame,
  widthPx,
  onSeek,
  onClipChange,
  onClipSelect,
  onMarkerAdd,
  onMarkerRemove,
}: TimelinePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [, forceRender] = useState(0);
  const width = widthPx ?? panelRef.current?.clientWidth ?? 800;
  const pxf = pxPerFrame(width, durationInFrames);
  const playheadX = frameToPx(clamp(currentFrame, 0, durationInFrames), pxf);

  const startDrag = (state: NonNullable<DragState>) => {
    dragRef.current = state;
    forceRender((n) => n + 1);
  };
  const endDrag = () => {
    dragRef.current = null;
    forceRender((n) => n + 1);
  };

  const seekFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const left = panelRef.current?.getBoundingClientRect().left ?? 0;
    onSeek?.(clamp(pxToFrame(event.clientX - left, pxf), 0, durationInFrames));
  };

  const onClipPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end',
  ) => {
    event.stopPropagation();
    capturePointer(event);
    onClipSelect?.(clip.id);
    setSelectedClipId(clip.id);
    startDrag({ mode, clipId: clip.id, startX: event.clientX, from: clip.from, durationInFrames: clip.durationInFrames });
  };

  const onClipPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.mode === 'scrub') return;
    const delta = pxToFrame(event.clientX - drag.startX, pxf);
    const clip: TimelineClip = { id: drag.clipId, label: '', from: drag.from, durationInFrames: drag.durationInFrames };
    if (drag.mode === 'move') {
      onClipChange?.(drag.clipId, { from: moveClip(clip, delta, durationInFrames).from });
    } else if (drag.mode === 'trim-start') {
      const next = trimClipStart(clip, delta);
      onClipChange?.(drag.clipId, { from: next.from, durationInFrames: next.durationInFrames });
    } else {
      onClipChange?.(drag.clipId, { durationInFrames: trimClipEnd(clip, delta, durationInFrames).durationInFrames });
    }
  };

  const rulerTicks: number[] = [];
  const step = rulerStep(durationInFrames);
  for (let frame = 0; frame <= durationInFrames; frame += step) rulerTicks.push(frame);

  const panelStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    fontFamily: typography.ui,
    color: cssVar('bf-white'),
    backgroundColor: cssVar('bf-black'),
    userSelect: 'none',
  };

  return (
    <div className="timeline-panel" data-testid="timeline-panel" ref={panelRef} style={panelStyle}>
      <div
        className="timeline-ruler"
        data-testid="timeline-ruler"
        style={{
          position: 'relative',
          height: RULER_HEIGHT,
          backgroundColor: cssVar('bf-surface-1'),
          borderBottom: `1px solid ${cssVar('bf-border')}`,
          cursor: 'ew-resize',
        }}
        onPointerDown={(event) => {
          capturePointer(event);
          startDrag({ mode: 'scrub' });
          seekFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragRef.current?.mode === 'scrub') seekFromPointer(event);
        }}
        onPointerUp={endDrag}
      >
        {rulerTicks.map((frame) => (
          <div
            key={frame}
            style={{
              position: 'absolute',
              left: frameToPx(frame, pxf),
              top: 0,
              height: RULER_HEIGHT,
              borderLeft: `1px solid ${cssVar('bf-border')}`,
              paddingLeft: 3,
              fontSize: 10,
              color: cssVar('bf-text-muted'),
              fontFamily: typography.mono,
              ...monoNumeric,
              lineHeight: `${RULER_HEIGHT}px`,
              pointerEvents: 'none',
            }}
          >
            {formatTimecode(frame, fps)}
          </div>
        ))}
        {markers.map((marker) => (
          <span key={marker.id} style={{ position: 'absolute', left: frameToPx(marker.frame, pxf), top: 0 }}>
            <button
              type="button"
              className="timeline-marker"
              data-testid={`timeline-marker-${marker.id}`}
              title={`${marker.label} @ ${marker.frame}`}
              aria-label={`marker ${marker.label} at frame ${marker.frame}`}
              onClick={() => onSeek?.(marker.frame)}
              style={{
                border: 'none',
                background: 'none',
                color: cssVar('bf-orange'),
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ⚑
            </button>
            {onMarkerRemove && (
              <button
                type="button"
                className="timeline-marker-remove"
                data-testid={`timeline-marker-${marker.id}-remove`}
                aria-label={`remove marker ${marker.label}`}
                onClick={() => onMarkerRemove?.(marker.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: cssVar('bf-text-muted'),
                  cursor: 'pointer',
                  fontSize: 9,
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <button
          type="button"
          className="timeline-add-marker"
          data-testid="timeline-add-marker"
          aria-label="add marker at playhead"
          onClick={() => onMarkerAdd?.(clamp(currentFrame, 0, durationInFrames))}
          style={{
            position: 'absolute',
            right: 4,
            top: 3,
            border: `1px solid ${cssVar('bf-border')}`,
            borderRadius: 3,
            background: cssVar('bf-surface-2'),
            color: cssVar('bf-white'),
            fontSize: 10,
            padding: '1px 6px',
            cursor: 'pointer',
          }}
        >
          + marker
        </button>
      </div>

      {clips.map((clip) => {
        const selected = clip.id === selectedClipId;
        return (
          <div key={clip.id} className="timeline-clip-row" style={clipRowStyle}>
            <div
              className="timeline-clip"
              data-testid={`timeline-clip-${clip.id}`}
              style={{
                position: 'absolute',
                left: frameToPx(clip.from, pxf),
                width: Math.max(1, frameToPx(clip.durationInFrames, pxf)),
                top: 3,
                height: ROW_HEIGHT - 8,
                backgroundColor: cssVar('bf-surface-2'),
                border: `1px solid ${selected ? cssVar('bf-orange') : cssVar('bf-border')}`,
                borderRadius: 4,
                boxSizing: 'border-box',
                overflow: 'hidden',
                cursor: 'grab',
                touchAction: 'none',
              }}
              onPointerDown={(event) => {
                capturePointer(event);
                onClipSelect?.(clip.id);
                setSelectedClipId(clip.id);
                startDrag({ mode: 'move', clipId: clip.id, startX: event.clientX, from: clip.from, durationInFrames: clip.durationInFrames });
              }}
              onPointerMove={onClipPointerMove}
              onPointerUp={endDrag}
            >
              <span
                style={{
                  position: 'absolute',
                  left: HANDLE_WIDTH,
                  right: HANDLE_WIDTH,
                  fontSize: 11,
                  color: cssVar('bf-white'),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  lineHeight: `${ROW_HEIGHT - 10}px`,
                  pointerEvents: 'none',
                }}
              >
                {clip.label}
              </span>
              {(['trim-start', 'trim-end'] as const).map((mode) => (
                <div
                  key={mode}
                  className={`timeline-clip-${mode}`}
                  data-testid={`timeline-clip-${clip.id}-${mode}`}
                  role="separator"
                  aria-label={`${mode === 'trim-start' ? 'start' : 'end'} trim handle for ${clip.label}`}
                  style={{
                    position: 'absolute',
                    [mode === 'trim-start' ? 'left' : 'right']: 0,
                    width: HANDLE_WIDTH,
                    height: '100%',
                    backgroundColor: cssVar('bf-orange'),
                    opacity: 0.55,
                    cursor: 'ew-resize',
                    touchAction: 'none',
                  }}
                  onPointerDown={(event) => onClipPointerDown(event, clip, mode)}
                  onPointerMove={onClipPointerMove}
                  onPointerUp={endDrag}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Playhead — thin orange beam spanning ruler + rows, synced with the preview. */}
      <div
        className="timeline-playhead"
        data-testid="timeline-playhead"
        style={{
          position: 'absolute',
          left: playheadX,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: cssVar('bf-orange'),
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -5,
            top: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `7px solid ${cssVar('bf-orange')}`,
          }}
        />
      </div>
      <div
        className="timeline-playhead-timecode"
        data-testid="timeline-playhead-timecode"
        style={{
          position: 'absolute',
          left: clamp(playheadX + 8, 0, Math.max(0, width - 90)),
          top: RULER_HEIGHT / 2 - 8,
          fontSize: 11,
          color: cssVar('bf-white'),
          fontFamily: typography.mono,
          ...monoNumeric,
          pointerEvents: 'none',
        }}
      >
        {formatTimecode(currentFrame, fps)}
      </div>
    </div>
  );
}
