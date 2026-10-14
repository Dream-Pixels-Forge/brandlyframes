import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { FC } from 'react';
import { z } from 'zod';
import { Composition } from '../../src/registry';
import { clearCompositions, getCompositions } from '../../src/registry';

const Hero: FC<{ title: string }> = () => null;
const Other: FC<{ title: string }> = () => null;

const heroElement = (
  <Composition
    id="hero"
    component={Hero}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ title: 'Hello' }}
  />
);

describe('<Composition> (BF-002)', () => {
  beforeEach(() => {
    clearCompositions();
  });

  it('renders nothing (registration is declarative)', () => {
    expect(renderToString(heroElement)).toBe('');
  });

  it('registers itself into the composition registry', () => {
    renderToString(heroElement);
    expect(getCompositions().map((c) => c.id)).toEqual(['hero']);
  });

  it('is idempotent when the same element renders again', () => {
    renderToString(heroElement);
    expect(() => renderToString(heroElement)).not.toThrow();
    expect(getCompositions()).toHaveLength(1);
  });

  it('throws a helpful error when two compositions share an id', () => {
    expect(() =>
      renderToString(
        <>
          {heroElement}
          <Composition
            id="hero"
            component={Other}
            durationInFrames={30}
            fps={30}
            width={1080}
            height={1920}
          />
        </>,
      ),
    ).toThrowError(/composition id "hero" is already registered/);
  });

  it('throws a helpful error on non-positive fps or dimensions', () => {
    expect(() =>
      renderToString(
        <Composition
          id="broken"
          component={Hero}
          durationInFrames={90}
          fps={0}
          width={1080}
          height={1920}
        />,
      ),
    ).toThrowError(/fps/);
    expect(() =>
      renderToString(
        <Composition
          id="broken"
          component={Hero}
          durationInFrames={90}
          fps={30}
          width={-1}
          height={1920}
        />,
      ),
    ).toThrowError(/width/);
  });
});

describe('<Composition> schema validation (BF-008)', () => {
  beforeEach(() => {
    clearCompositions();
  });

  const TitleSchema = z.object({ title: z.string() });

  it('accepts defaultProps that satisfy the schema', () => {
    expect(() =>
      renderToString(
        <Composition
          id="hero"
          component={Hero}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
          schema={TitleSchema}
          defaultProps={{ title: 'Hello' }}
        />,
      ),
    ).not.toThrow();
  });

  it('throws a helpful error naming the composition and the offending field', () => {
    expect(() =>
      renderToString(
        <Composition
          id="hero"
          component={Hero}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
          schema={TitleSchema}
          defaultProps={{ title: 42 } as unknown as { title: string }}
        />,
      ),
    ).toThrowError(/composition "hero"/);
    expect(() =>
      renderToString(
        <Composition
          id="hero"
          component={Hero}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
          schema={TitleSchema}
          defaultProps={{ title: 42 } as unknown as { title: string }}
        />,
      ),
    ).toThrowError(/title/);
  });

  it('validates missing required defaultProps against the schema', () => {
    expect(() =>
      renderToString(
        <Composition
          id="hero"
          component={Hero}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
          schema={TitleSchema}
        />,
      ),
    ).toThrowError(/title/);
  });
});
