/**
 * BF-450: Auto-promote `<Video>` to frame-exact decode path in render.
 *
 * `detectVideoUsage(source)` scans a composition source file for `<Video>`
 * JSX usage so the render pipeline can transparently route `<Video>` frames
 * through the FFmpeg frame-exact decode backend instead of Chrome screenshot
 * capture — no user opt-in required.
 *
 * This test is RED until `detectVideoUsage` is implemented.
 */

import { describe, expect, it } from 'vitest';
import { detectVideoUsage } from '../src/video-usage';

describe('detectVideoUsage (BF-450)', () => {
  it('detects a plain <Video> JSX element', () => {
    const source = `
      import { Video } from 'brandlyframes';
      export const Comp = () => <Video src="clip.mp4" />;
    `;
    expect(detectVideoUsage(source)).toBe(true);
  });

  it('detects <Video> with attributes spread across lines', () => {
    const source = `
      <Video
        src={staticFile("clip.mp4")}
        playbackRate={1.5}
        muted
      />
    `;
    expect(detectVideoUsage(source)).toBe(true);
  });

  it('detects <Video> used as a variable reference', () => {
    const source = `
      const MyVideo = Video;
      export const Comp = () => <MyVideo src="clip.mp4" />;
    `;
    expect(detectVideoUsage(source)).toBe(true);
  });

  it('returns false when <Video> is only imported but not used', () => {
    const source = `
      import { Video } from 'brandlyframes';
      export const Comp = () => <div>hello</div>;
    `;
    expect(detectVideoUsage(source)).toBe(false);
  });

  it('returns false for a composition with no video at all', () => {
    const source = `
      import { Img, Text } from 'brandlyframes';
      export const Comp = () => (
        <div><Img src="photo.jpg" /><Text>hi</Text></div>
      );
    `;
    expect(detectVideoUsage(source)).toBe(false);
  });

  it('returns false for an empty source', () => {
    expect(detectVideoUsage('')).toBe(false);
  });
});
