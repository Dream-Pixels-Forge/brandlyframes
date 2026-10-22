import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  AudioForPreview,
  AudioForRendering,
  VideoForPreview,
  VideoForRendering,
} from '../../src/runtime/media';
import { renderAtFrame } from '../helpers';

const TEST_SRC_VIDEO = 'video/intro.mp4';
const TEST_SRC_AUDIO = 'audio/theme.mp3';

describe('media split (preview vs rendering)', () => {
  describe('<VideoForRendering>', () => {
    const tree = <VideoForRendering src={TEST_SRC_VIDEO} muted />;

    it('renders a deterministic tree for a given frame', () => {
      expect(renderAtFrame(tree, 7)).toBe(renderAtFrame(tree, 7));
    });

    it('is frame-driven: exposes the frame-derived playback time', () => {
      expect(renderAtFrame(<VideoForRendering src="v.mp4" />, 0)).toContain(
        'data-current-time="0"',
      );
      // 30 fps test config: frame 60 == second 2.
      expect(renderAtFrame(<VideoForRendering src="v.mp4" />, 60)).toContain(
        'data-current-time="2"',
      );
      expect(renderAtFrame(<VideoForRendering src="v.mp4" />, 0)).not.toBe(
        renderAtFrame(<VideoForRendering src="v.mp4" />, 60),
      );
    });

    it('throws a helpful error outside a frame context', () => {
      expect(() => renderToString(<VideoForRendering src="v.mp4" />)).toThrowError(
        /FrameContextProvider/,
      );
    });
  });

  describe('<VideoForPreview>', () => {
    const tree = <VideoForPreview src={TEST_SRC_VIDEO} muted />;

    it('renders a deterministic tree for a given frame', () => {
      expect(renderAtFrame(tree, 7)).toBe(renderAtFrame(tree, 7));
    });

    it('is preview-optimized: does not force frame-derived playback time', () => {
      const html = renderAtFrame(<VideoForPreview src="v.mp4" muted />, 0);
      expect(html).toContain('<video');
      expect(html).toContain('muted');
      expect(html).not.toContain('data-current-time');
    });

    it('renders passthrough attributes', () => {
      expect(renderAtFrame(<VideoForPreview src="v.mp4" muted />, 0)).toContain(
        'muted',
      );
    });
  });

  describe('<AudioForRendering>', () => {
    const tree = <AudioForRendering src={TEST_SRC_AUDIO} />;

    it('renders a deterministic tree for a given frame', () => {
      expect(renderAtFrame(tree, 10)).toBe(renderAtFrame(tree, 10));
    });

    it('is frame-driven: exposes the frame-derived playback time', () => {
      expect(renderAtFrame(<AudioForRendering src="a.mp3" />, 0)).toContain(
        'data-current-time="0"',
      );
      expect(renderAtFrame(<AudioForRendering src="a.mp3" />, 30)).toContain(
        'data-current-time="1"',
      );
      expect(renderAtFrame(<AudioForRendering src="a.mp3" />, 0)).not.toBe(
        renderAtFrame(<AudioForRendering src="a.mp3" />, 30),
      );
    });

    it('throws a helpful error outside a frame context', () => {
      expect(() => renderToString(<AudioForRendering src="a.mp3" />)).toThrowError(
        /FrameContextProvider/,
      );
    });
  });

  describe('<AudioForPreview>', () => {
    const tree = <AudioForPreview src={TEST_SRC_AUDIO} />;

    it('renders a deterministic tree for a given frame', () => {
      expect(renderAtFrame(tree, 10)).toBe(renderAtFrame(tree, 10));
    });

    it('is preview-optimized: does not force frame-derived playback time', () => {
      const html = renderAtFrame(<AudioForPreview src="a.mp3" />, 0);
      expect(html).toContain('<audio');
      expect(html).not.toContain('data-current-time');
    });
  });
});
