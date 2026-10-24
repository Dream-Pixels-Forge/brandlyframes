import { describe, expect, it } from 'vitest';
import { DEFAULT_VIDEO_TIMEOUT_IN_MILLISECONDS, Video } from '../../../src/runtime/media/Video';
import { renderAtFrame } from '../../helpers';

describe('<Video> auto-hold (BF-423)', () => {
  it('renders via renderToString without crashing (SSR-safe, no DOM)', () => {
    const html = renderAtFrame(<Video src="video/intro.mp4" muted playsInline />, 0);
    expect(html).toContain('<video');
    expect(html).toContain('src="video/intro.mp4"');
    expect(html).toContain('muted');
    expect(html).toContain('playsInline=""');
    expect(html).toContain('data-current-time="0"');
  });

  it('keeps the rendered tree identical to a plain <video> with data-current-time (no extra attributes)', () => {
    const withAutoHold = renderAtFrame(<Video src="video/intro.mp4" />, 0);
    const plain = renderAtFrame(<video src="video/intro.mp4" data-current-time="0" />, 0);
    expect(withAutoHold).toBe(plain);
  });

  it('is frame-independent: identical tree at any frame', () => {
    expect(renderAtFrame(<Video src="video/intro.mp4" />, 0)).toBe(
      renderAtFrame(<Video src="video/intro.mp4" />, 0),
    );
  });

  it('exposes frame-derived playback time: data-current-time = frame / fps', () => {
    // 30 fps test config: frame 0 == 0s, frame 30 == 1s, frame 45 == 1.5s
    expect(renderAtFrame(<Video src="v.mp4" />, 0)).toContain('data-current-time="0"');
    expect(renderAtFrame(<Video src="v.mp4" />, 30)).toContain('data-current-time="1"');
    expect(renderAtFrame(<Video src="v.mp4" />, 45)).toContain('data-current-time="1.5"');
    expect(renderAtFrame(<Video src="v.mp4" />, 0)).not.toBe(
      renderAtFrame(<Video src="v.mp4" />, 30),
    );
  });

  it('exports the default video hold timeout (30s)', () => {
    expect(DEFAULT_VIDEO_TIMEOUT_IN_MILLISECONDS).toBe(30_000);
  });
});
