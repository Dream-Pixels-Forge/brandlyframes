/**
 * Shareable cloud preview links (BF-300): frame-accurate comment anchors
 * (#frame=123&t=...) and the comment store interface + in-memory adapter.
 */

import { describe, expect, it } from 'vitest';
import {
  buildPreviewLink,
  InMemoryCommentStore,
  parsePreviewLink,
} from '../src/preview-links';

describe('buildPreviewLink (BF-300)', () => {
  it('builds a frame-accurate anchor from frame + fps', () => {
    const link = buildPreviewLink({
      baseUrl: 'https://preview.brandlyframes.dev/r/abc123',
      compositionId: 'main',
      frame: 123,
      fps: 30,
    });
    expect(link).toContain('#frame=123');
    expect(link).toContain('t=4.1');
  });

  it('keeps fractional frame times exact', () => {
    const link = buildPreviewLink({
      baseUrl: 'https://p.dev/r/abc',
      compositionId: 'main',
      frame: 100,
      fps: 30,
    });
    // 100 / 30 = 3.3333333333333335 — frame-accurate, never rounded.
    expect(link).toContain('t=3.3333333333333335');
  });

  it('carries the composition id in the query', () => {
    const link = buildPreviewLink({
      baseUrl: 'https://p.dev/r/abc',
      compositionId: 'intro',
      frame: 0,
      fps: 30,
    });
    expect(link).toContain('composition=intro');
    expect(link).toContain('#frame=0');
  });

  it('rejects negative frames and non-positive fps', () => {
    expect(() =>
      buildPreviewLink({ baseUrl: 'https://p.dev', compositionId: 'm', frame: -1, fps: 30 })
    ).toThrow(RangeError);
    expect(() =>
      buildPreviewLink({ baseUrl: 'https://p.dev', compositionId: 'm', frame: 0, fps: 0 })
    ).toThrow(RangeError);
  });
});

describe('parsePreviewLink (BF-300)', () => {
  it('round-trips a built link', () => {
    const link = buildPreviewLink({
      baseUrl: 'https://p.dev/r/abc',
      compositionId: 'main',
      frame: 123,
      fps: 30,
    });
    const parsed = parsePreviewLink(link);
    expect(parsed).toEqual({ compositionId: 'main', frame: 123, tSeconds: 123 / 30 });
  });

  it('rejects links without a frame anchor', () => {
    expect(() => parsePreviewLink('https://p.dev/r/abc')).toThrow(RangeError);
  });

  it('rejects malformed frame numbers', () => {
    expect(() => parsePreviewLink('https://p.dev/r/abc#frame=abc&t=1')).toThrow(RangeError);
  });
});

describe('InMemoryCommentStore (BF-300)', () => {
  it('adds, gets and lists comments anchored to a frame', async () => {
    const store = new InMemoryCommentStore();
    const comment = await store.add({
      compositionId: 'main',
      frame: 123,
      author: 'maya',
      body: 'Logo pops too late here',
      fps: 30,
    });
    expect(comment.id.length).toBeGreaterThan(0);
    expect(comment.tSeconds).toBe(123 / 30);
    expect(comment.resolved).toBe(false);
    expect(await store.get(comment.id)).toEqual(comment);

    await store.add({ compositionId: 'other', frame: 5, author: 'kai', body: 'x' });
    const mainComments = await store.list({ compositionId: 'main' });
    expect(mainComments).toHaveLength(1);
    expect(mainComments[0]!.body).toBe('Logo pops too late here');
  });

  it('filters by exact frame anchor', async () => {
    const store = new InMemoryCommentStore();
    await store.add({ compositionId: 'main', frame: 10, author: 'a', body: '1' });
    await store.add({ compositionId: 'main', frame: 20, author: 'b', body: '2' });
    const atFrame = await store.list({ compositionId: 'main', frame: 20 });
    expect(atFrame).toHaveLength(1);
    expect(atFrame[0]!.frame).toBe(20);
  });

  it('resolves and un-resolves comments', async () => {
    const store = new InMemoryCommentStore();
    const comment = await store.add({
      compositionId: 'main',
      frame: 1,
      author: 'a',
      body: 'fix me',
    });
    const resolved = await store.setResolved(comment.id, true);
    expect(resolved.resolved).toBe(true);
    expect((await store.get(comment.id))?.resolved).toBe(true);
    await expect(store.setResolved('missing', true)).rejects.toThrow(RangeError);
  });

  it('uses the injected clock for createdAt', async () => {
    let now = 1000;
    const store = new InMemoryCommentStore({ clock: () => now });
    const a = await store.add({ compositionId: 'm', frame: 0, author: 'a', body: 'x' });
    now = 2500;
    const b = await store.add({ compositionId: 'm', frame: 0, author: 'b', body: 'y' });
    expect(a.createdAt).toBe(1000);
    expect(b.createdAt).toBe(2500);
  });

  it('assigns unique ids', async () => {
    const store = new InMemoryCommentStore();
    const a = await store.add({ compositionId: 'm', frame: 0, author: 'a', body: 'x' });
    const b = await store.add({ compositionId: 'm', frame: 0, author: 'b', body: 'y' });
    expect(a.id).not.toBe(b.id);
  });
});
