import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyframePanel } from '../../src/timeline/KeyframePanel';
import type { Keyframe, KeyframeTrack } from '../../src/timeline/keyframe-model';

const mkTrack = (property: string, frames: Keyframe[]): KeyframeTrack => ({
  clipId: 'clip-1',
  property,
  frames,
});

describe('KeyframePanel', () => {
  it('renders empty-state message when no tracks', () => {
    render(<KeyframePanel tracks={[]} onTracksChange={() => {}} />);
    expect(screen.getByText(/No keyframe tracks/i)).toBeTruthy();
  });

  it('renders one curve row per track with property name', () => {
    const tracks = [
      mkTrack('opacity', [
        { id: 'a', t: 0, value: 0, easing: 'linear' },
        { id: 'b', t: 1, value: 1, easing: 'linear' },
      ]),
      mkTrack('scale', [
        { id: 'c', t: 0, value: 0, easing: 'linear' },
        { id: 'd', t: 1, value: 2, easing: 'linear' },
      ]),
    ];
    render(<KeyframePanel tracks={tracks} onTracksChange={() => {}} />);
    expect(screen.getByText('opacity')).toBeTruthy();
    expect(screen.getByText('scale')).toBeTruthy();
  });

  it('live value readout at previewProgress=0 shows first keyframe value', () => {
    const tracks = [
      mkTrack('opacity', [
        { id: 'a', t: 0, value: 0.5, easing: 'linear' },
        { id: 'b', t: 1, value: 1, easing: 'linear' },
      ]),
    ];
    render(<KeyframePanel tracks={tracks} previewProgress={0} onTracksChange={() => {}} />);
    expect(screen.getByText('0.500')).toBeTruthy();
  });

  it('add keyframe button calls onTracksChange with an upserted keyframe', () => {
    const onTracksChange = vi.fn();
    const tracks = [
      mkTrack('opacity', [
        { id: 'a', t: 0, value: 0, easing: 'linear' },
        { id: 'b', t: 1, value: 1, easing: 'linear' },
      ]),
    ];
    render(<KeyframePanel tracks={tracks} onTracksChange={onTracksChange} />);
    const btn = screen.getByTestId('add-kf-opacity');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onTracksChange).toHaveBeenCalledTimes(1);
    const updated = onTracksChange.mock.calls[0][0];
    expect(updated[0].frames.length).toBe(3); // upserted mid-point keyframe
  });

  it('previewProgress drives the live value for a mid-segment', () => {
    const tracks = [
      mkTrack('opacity', [
        { id: 'a', t: 0, value: 0, easing: 'linear' },
        { id: 'b', t: 1, value: 10, easing: 'linear' },
      ]),
    ];
    render(<KeyframePanel tracks={tracks} previewProgress={0.5} onTracksChange={() => {}} />);
    expect(screen.getByText('5.000')).toBeTruthy();
  });
});
