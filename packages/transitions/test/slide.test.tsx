/**
 * Slide transition tests — [BF-070]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Slide, slideVariants } from '../src/slide';

describe('Slide', () => {
  const renderSlide = (frame: number, props: { durationFrames: number; direction?: 'left' | 'right' | 'up' | 'down' } = { durationFrames: 30 }) => {
    return renderToStaticMarkup(
      <Slide durationFrames={props.durationFrames} direction={props.direction} frame={frame}>
        <div data-testid="from">From</div>
        <div data-testid="to">To</div>
      </Slide>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both children', () => {
    const html = renderSlide(0, { durationFrames: 30 });
    expect(html).toContain('From');
    expect(html).toContain('To');
  });

  it('applies transform at frame 0 (left)', () => {
    const html = renderSlide(0, { durationFrames: 30, direction: 'left' });
    expect(html).toContain('translateX(0%)');
    expect(html).toContain('translateX(100%)');
  });

  it('applies transform at midpoint (left)', () => {
    const html = renderSlide(15, { durationFrames: 30, direction: 'left' });
    expect(html).toContain('translateX(');
  });

  it('applies correct transforms at end (left)', () => {
    const html = renderSlide(30, { durationFrames: 30, direction: 'left' });
    expect(html).toContain('translateX(-100%)');
    expect(html).toContain('translateX(0%)');
  });

  it('handles right direction', () => {
    const html = renderSlide(0, { durationFrames: 30, direction: 'right' });
    expect(html).toContain('translateX(0%)');
    expect(html).toContain('translateX(-100%)');
  });

  it('handles up direction', () => {
    const html = renderSlide(0, { durationFrames: 30, direction: 'up' });
    expect(html).toContain('translateY(0%)');
  });

  it('handles down direction', () => {
    const html = renderSlide(0, { durationFrames: 30, direction: 'down' });
    expect(html).toContain('translateY(0%)');
  });

  it('exports slide variants', () => {
    expect(slideVariants.left.id).toBe('slide-left');
    expect(slideVariants.right.id).toBe('slide-right');
    expect(slideVariants.up.id).toBe('slide-up');
    expect(slideVariants.down.id).toBe('slide-down');
  });
});
