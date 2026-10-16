/**
 * Wipe transition tests — [BF-070]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Wipe, wipeVariants } from '../src/wipe';

describe('Wipe', () => {
  const renderWipe = (frame: number, props: { durationFrames: number; direction?: 'left' | 'right' | 'up' | 'down' } = { durationFrames: 30 }) => {
    return renderToStaticMarkup(
      <Wipe durationFrames={props.durationFrames} direction={props.direction} frame={frame}>
        <div data-testid="from">From</div>
        <div data-testid="to">To</div>
      </Wipe>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both children', () => {
    const html = renderWipe(0, { durationFrames: 30 });
    expect(html).toContain('From');
    expect(html).toContain('To');
  });

  it('applies clip-path at frame 0 (left)', () => {
    const html = renderWipe(0, { durationFrames: 30, direction: 'left' });
    expect(html).toContain('inset(0 100% 0 0)');
  });

  it('applies clip-path at midpoint (left)', () => {
    const html = renderWipe(15, { durationFrames: 30, direction: 'left' });
    expect(html).toContain('inset(');
  });

  it('applies clip-path at end (left)', () => {
    const html = renderWipe(30, { durationFrames: 30, direction: 'left' });
    expect(html).toContain('inset(0 0% 0 0)');
  });

  it('handles right direction', () => {
    const html = renderWipe(0, { durationFrames: 30, direction: 'right' });
    expect(html).toContain('inset(0 0 0 100%)');
  });

  it('handles up direction', () => {
    const html = renderWipe(0, { durationFrames: 30, direction: 'up' });
    expect(html).toContain('inset(100% 0 0 0)');
  });

  it('handles down direction', () => {
    const html = renderWipe(0, { durationFrames: 30, direction: 'down' });
    expect(html).toContain('inset(0 0 100% 0)');
  });

  it('exports wipe variants', () => {
    expect(wipeVariants.left.id).toBe('wipe-left');
    expect(wipeVariants.right.id).toBe('wipe-right');
    expect(wipeVariants.up.id).toBe('wipe-up');
    expect(wipeVariants.down.id).toBe('wipe-down');
    expect(wipeVariants.diagonalTLBR.id).toBe('wipe-diagonal-tl-br');
    expect(wipeVariants.diagonalTRBL.id).toBe('wipe-diagonal-tr-bl');
  });
});
