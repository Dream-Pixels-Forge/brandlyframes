import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { FC } from 'react';
import { Audio, Img, Video } from '../../src/runtime/media';
import { renderAtFrame } from '../helpers';

const StaticProbe: FC = () => <Img src="images/hero.png" alt="Hero" />;

describe('media primitives (BF-007)', () => {
  describe('<Img>', () => {
    it('renders a deterministic <img> tree at any frame', () => {
      expect(renderAtFrame(<StaticProbe />, 0)).toBe(renderAtFrame(<StaticProbe />, 0));
      expect(renderAtFrame(<StaticProbe />, 0)).toBe(renderAtFrame(<StaticProbe />, 50));
    });

    it('renders the src and passthrough attributes', () => {
      const html = renderAtFrame(<StaticProbe />, 0);
      expect(html).toContain('src="images/hero.png"');
      expect(html).toContain('alt="Hero"');
    });
  });

  describe('<Audio>', () => {
    it('renders a deterministic tree for a given frame', () => {
      const tree = <Audio src="audio/theme.mp3" />;
      expect(renderAtFrame(tree, 10)).toBe(renderAtFrame(tree, 10));
    });

    it('is frame-driven: the rendered tree exposes the frame-derived playback time', () => {
      expect(renderAtFrame(<Audio src="a.mp3" />, 0)).toContain('data-current-time="0"');
      // 30 fps test config: frame 30 == second 1.
      expect(renderAtFrame(<Audio src="a.mp3" />, 30)).toContain('data-current-time="1"');
      // frame 45 == second 1.5
      expect(renderAtFrame(<Audio src="a.mp3" />, 45)).toContain('data-current-time="1.5"');
      expect(renderAtFrame(<Audio src="a.mp3" />, 0)).not.toBe(
        renderAtFrame(<Audio src="a.mp3" />, 30),
      );
    });

    it('throws a helpful error outside a frame context', () => {
      expect(() => renderToString(<Audio src="a.mp3" />)).toThrowError(/FrameContextProvider/);
    });
  });

  describe('<Video>', () => {
    it('renders a deterministic tree for a given frame', () => {
      const tree = <Video src="video/intro.mp4" muted />;
      expect(renderAtFrame(tree, 7)).toBe(renderAtFrame(tree, 7));
    });

    it('is frame-driven: the rendered tree exposes the frame-derived playback time', () => {
      expect(renderAtFrame(<Video src="v.mp4" />, 0)).toContain('data-current-time="0"');
      expect(renderAtFrame(<Video src="v.mp4" />, 60)).toContain('data-current-time="2"');
      expect(renderAtFrame(<Video src="v.mp4" />, 0)).not.toBe(
        renderAtFrame(<Video src="v.mp4" />, 60),
      );
    });

    it('renders passthrough attributes', () => {
      expect(renderAtFrame(<Video src="v.mp4" muted />, 0)).toContain('muted');
    });

    it('throws a helpful error outside a frame context', () => {
      expect(() => renderToString(<Video src="v.mp4" />)).toThrowError(/FrameContextProvider/);
    });
  });
});
