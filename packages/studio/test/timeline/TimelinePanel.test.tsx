/**
 * BF-120 visual timeline — TimelinePanel DOM behavior in jsdom: clip blocks,
 * drag-to-move, trim handles, markers, ruler scrub and playhead sync.
 * Geometry uses the `widthPx` prop (jsdom has no layout); pointer events are
 * synthetic, so every interaction is driven through fireEvent.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { TimelinePanel } from '../../src/timeline/TimelinePanel';
import type { TimelineClip, TimelineMarker } from '../../src/timeline/timeline-model';

const clips: TimelineClip[] = [
  { id: 'clip-1', label: 'Intro', from: 0, durationInFrames: 90 },
  { id: 'clip-2', label: 'Bumper', from: 90, durationInFrames: 60 },
];

const markers: TimelineMarker[] = [{ id: 'm1', frame: 120, label: 'drop' }];

const panel = (overrides?: Partial<Parameters<typeof TimelinePanel>[0]>) =>
  render(
    <TimelinePanel
      durationInFrames={150}
      fps={30}
      widthPx={300} // 2px per frame
      clips={clips}
      markers={markers}
      currentFrame={60}
      {...overrides}
    />,
  );

describe('TimelinePanel (BF-120)', () => {
  it('renders clips, markers, the playhead and a timecode readout', () => {
    const { getByTestId } = panel();
    expect(getByTestId('timeline-panel')).toBeDefined();
    expect(getByTestId('timeline-clip-clip-1').textContent).toContain('Intro');
    expect(getByTestId('timeline-clip-clip-2').textContent).toContain('Bumper');
    expect(getByTestId('timeline-marker-m1')).toBeDefined();
    expect(getByTestId('timeline-playhead')).toBeDefined();
    // playhead synced with the studio preview via currentFrame → timecode
    expect(getByTestId('timeline-playhead-timecode').textContent).toBe('00:00:02:00');
    // geometry: clip-2 at from=90 → left 180px, 60 frames → 120px wide
    const bumper = getByTestId('timeline-clip-clip-2');
    expect(bumper.style.left).toBe('180px');
    expect(bumper.style.width).toBe('120px');
    // playhead at frame 60 → left 120px
    expect(getByTestId('timeline-playhead').style.left).toBe('120px');
  });

  it('seeks when the ruler is scrubbed and keeps the frame in range', () => {
    const onSeek = vi.fn();
    const { getByTestId } = panel({ onSeek });
    const ruler = getByTestId('timeline-ruler');
    fireEvent.pointerDown(ruler, { clientX: 100 });
    expect(onSeek).toHaveBeenLastCalledWith(50);
    fireEvent.pointerMove(ruler, { clientX: 400 });
    expect(onSeek).toHaveBeenLastCalledWith(150); // clamped to duration
    fireEvent.pointerUp(ruler, { clientX: 0 });
    fireEvent.pointerMove(ruler, { clientX: 50 });
    expect(onSeek).toHaveBeenCalledTimes(2); // scrub ended — no further seeks
  });

  it('drags a clip body to move it and reports the new from', () => {
    const onClipChange = vi.fn();
    const { getByTestId } = panel({ onClipChange });
    const intro = getByTestId('timeline-clip-clip-1');
    fireEvent.pointerDown(intro, { clientX: 10 });
    fireEvent.pointerMove(intro, { clientX: 50 }); // 40px → 20 frames
    expect(onClipChange).toHaveBeenLastCalledWith('clip-1', { from: 20 });
    fireEvent.pointerUp(intro, { clientX: 50 });
    fireEvent.pointerMove(intro, { clientX: 90 });
    expect(onClipChange).toHaveBeenCalledTimes(1);
  });

  it('trims via the start and end handles', () => {
    const onClipChange = vi.fn();
    const { getByTestId } = panel({ onClipChange });
    fireEvent.pointerDown(getByTestId('timeline-clip-clip-2-trim-start'), { clientX: 180 });
    fireEvent.pointerMove(getByTestId('timeline-clip-clip-2-trim-start'), { clientX: 190 });
    // +10px = +5 frames later start: from 95, duration shrinks to 55
    expect(onClipChange).toHaveBeenLastCalledWith('clip-2', { from: 95, durationInFrames: 55 });

    fireEvent.pointerDown(getByTestId('timeline-clip-clip-2-trim-end'), { clientX: 300 });
    fireEvent.pointerMove(getByTestId('timeline-clip-clip-2-trim-end'), { clientX: 280 });
    // -20px = -10 frames: duration 50
    expect(onClipChange).toHaveBeenLastCalledWith('clip-2', { durationInFrames: 50 });
  });

  it('selects a clip on pointer down and notifies the consumer', () => {
    const onClipSelect = vi.fn();
    const { getByTestId } = panel({ onClipSelect });
    fireEvent.pointerDown(getByTestId('timeline-clip-clip-1'), { clientX: 10 });
    expect(onClipSelect).toHaveBeenCalledWith('clip-1');
  });

  it('seeks by clicking a marker and removes markers on request', () => {
    const onSeek = vi.fn();
    const onMarkerRemove = vi.fn();
    const { getByTestId } = panel({ onSeek, onMarkerRemove });
    fireEvent.click(getByTestId('timeline-marker-m1'));
    expect(onSeek).toHaveBeenCalledWith(120);
    fireEvent.click(getByTestId('timeline-marker-m1-remove'));
    expect(onMarkerRemove).toHaveBeenCalledWith('m1');
  });

  it('adds a marker at the playhead', () => {
    const onMarkerAdd = vi.fn();
    const { getByTestId } = panel({ onMarkerAdd });
    fireEvent.click(getByTestId('timeline-add-marker'));
    expect(onMarkerAdd).toHaveBeenCalledWith(60);
  });
});
