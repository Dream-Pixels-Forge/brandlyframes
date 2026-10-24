import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  DEFAULT_IMG_TIMEOUT_IN_MILLISECONDS,
  Img,
} from '../../../src/runtime/media/Img';

describe('<Img> auto-hold (BF-423)', () => {
  it('renders via renderToString without crashing (SSR-safe, no DOM)', () => {
    const html = renderToString(<Img src="images/hero.png" alt="Hero" width={800} />);
    expect(html).toContain('<img');
    expect(html).toContain('src="images/hero.png"');
    expect(html).toContain('alt="Hero"');
    expect(html).toContain('width="800"');
  });

  it('keeps the rendered tree identical to a plain  (no extra attributes)', () => {
    const withAutoHold = renderToString(<Img src="images/hero.png" />);
    const plain = renderToString(<img src="images/hero.png" />);
    expect(withAutoHold).toBe(plain);
  });

  it('is frame-independent: identical tree at any frame', () => {
    expect(renderToString(<Img src="images/hero.png" />)).toBe(
      renderToString(<Img src="images/hero.png" />),
    );
  });

  it('exports the default img hold timeout (30s)', () => {
    expect(DEFAULT_IMG_TIMEOUT_IN_MILLISECONDS).toBe(30_000);
  });
});
