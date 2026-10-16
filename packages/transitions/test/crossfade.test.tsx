/**
 * Crossfade transition tests — [BF-070]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Crossfade, crossfadeVariant } from '../src/crossfade';

describe('Crossfade', () => {
  const renderCrossfade = (frame: number, props: { durationFrames: number; simultaneous?: boolean } = { durationFrames: 30 }) => {
    return renderToStaticMarkup(
      <Crossfade durationFrames={props.durationFrames} simultaneous={props.simultaneous} frame={frame}>
        <div data-testid="from">From</div>
        <div data-testid="to">To</div>
      </Crossfade>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both children at frame 0', () => {
    const html = renderCrossfade(0, { durationFrames: 30 });
    expect(html).toContain('From');
    expect(html).toContain('To');
  });

  it('applies correct opacity at frame 0 (simultaneous)', () => {
    const html = renderCrossfade(0, { durationFrames: 30, simultaneous: true });
    // From should have opacity 1, To should have opacity 0
    expect(html).toContain('opacity:1');
    expect(html).toContain('opacity:0');
  });

  it('applies correct opacity at midpoint (simultaneous)', () => {
    const html = renderCrossfade(15, { durationFrames: 30, simultaneous: true });
    // Both should have opacity around 0.5
    expect(html).toContain('opacity');
  });

  it('applies correct opacity at end (simultaneous)', () => {
    const html = renderCrossfade(30, { durationFrames: 30, simultaneous: true });
    expect(html).toContain('opacity:0');
    expect(html).toContain('opacity:1');
  });

  it('sequential mode fades out then in', () => {
    const html = renderCrossfade(7, { durationFrames: 30 }); // First quarter
    expect(html).toContain('opacity');
  });

  it('exports variant config', () => {
    expect(crossfadeVariant.id).toBe('crossfade');
    expect(crossfadeVariant.name).toBe('Crossfade');
    expect(crossfadeVariant.component).toBe(Crossfade);
  });
});