import { beforeEach, describe, expect, it } from 'vitest';
import type { FC } from 'react';
import { z } from 'zod';
import {
  clearCompositions,
  resolveCompositionMetadata,
  type CompositionConfig,
} from '../../src/registry';

const Hero: FC<{ title: string; scene: number }> = () => null;

const baseConfig: CompositionConfig<{ title: string; scene: number }> = {
  id: 'hero',
  component: Hero,
  durationInFrames: 90,
  fps: 30,
  width: 1080,
  height: 1920,
  defaultProps: { title: 'Hello', scene: 1 },
};

describe('resolveCompositionMetadata (BF-002 + BF-008)', () => {
  beforeEach(() => {
    clearCompositions();
  });

  it('returns the declared metadata and merged props without calculateMetadata', async () => {
    const resolved = await resolveCompositionMetadata(baseConfig, { scene: 2 });
    expect(resolved).toMatchObject({
      id: 'hero',
      durationInFrames: 90,
      fps: 30,
      width: 1080,
      height: 1920,
      props: { title: 'Hello', scene: 2 },
      markers: {},
    });
  });

  it('inputProps override defaultProps ( defaultProps wins only when inputProps omit a key)', async () => {
    const resolved = await resolveCompositionMetadata(baseConfig);
    expect(resolved.props).toEqual({ title: 'Hello', scene: 1 });
  });

  it('applies a synchronous calculateMetadata override', async () => {
    const resolved = await resolveCompositionMetadata({
      ...baseConfig,
      calculateMetadata: () => ({ durationInFrames: 240 }),
    });
    expect(resolved.durationInFrames).toBe(240);
    expect(resolved.fps).toBe(30);
  });

  it('applies an async calculateMetadata override (resolved promise)', async () => {
    const resolved = await resolveCompositionMetadata({
      ...baseConfig,
      calculateMetadata: () =>
        Promise.resolve({ durationInFrames: 300, props: { title: 'Resolved', scene: 7 } }),
    });
    expect(resolved.durationInFrames).toBe(300);
    expect(resolved.props).toEqual({ title: 'Resolved', scene: 7 });
  });

  it('can override fps, width and height', async () => {
    const resolved = await resolveCompositionMetadata({
      ...baseConfig,
      calculateMetadata: () => ({ fps: 60, width: 1920, height: 1080 }),
    });
    expect(resolved.fps).toBe(60);
    expect(resolved.width).toBe(1920);
    expect(resolved.height).toBe(1080);
  });

  it('passes merged props to calculateMetadata and provides the composition id', async () => {
    const calls: Array<{ props: unknown; compositionId: string }> = [];
    await resolveCompositionMetadata({
      ...baseConfig,
      calculateMetadata: (props, context) => {
        calls.push({ props, compositionId: context.compositionId });
        return {};
      },
    }, { scene: 3 });
    expect(calls).toEqual([{ props: { title: 'Hello', scene: 3 }, compositionId: 'hero' }]);
  });

  it('throws a helpful error when an override is invalid', async () => {
    await expect(
      resolveCompositionMetadata({
        ...baseConfig,
        calculateMetadata: () => ({ fps: -60 }),
      }),
    ).rejects.toThrowError(/fps/);
    await expect(
      resolveCompositionMetadata({
        ...baseConfig,
        calculateMetadata: () => ({ durationInFrames: 0 }),
      }),
    ).rejects.toThrowError(/durationInFrames/);
  });

  it('resolves named markers from the metadata override (BF-401)', async () => {
    const resolved = await resolveCompositionMetadata({
      ...baseConfig,
      calculateMetadata: () => ({ markers: { drop: 45, outro: 120 } }),
    });
    expect(resolved.markers).toEqual({ drop: 45, outro: 120 });
  });

  it('rejects invalid marker values with a helpful error', async () => {
    await expect(
      resolveCompositionMetadata({
        ...baseConfig,
        calculateMetadata: () => ({ markers: { drop: -1 } }),
      }),
    ).rejects.toThrowError(/marker "drop"/);
    await expect(
      resolveCompositionMetadata({
        ...baseConfig,
        calculateMetadata: () => ({ markers: { drop: 1.5 } }),
      }),
    ).rejects.toThrowError(/marker "drop"/);
  });
});

describe('resolveCompositionMetadata schema validation (BF-008)', () => {
  beforeEach(() => {
    clearCompositions();
  });

  const HeroSchema = z.object({ title: z.string(), scene: z.number().int() });

  it('validates merged props against the schema with a helpful error', async () => {
    await expect(
      resolveCompositionMetadata(
        { ...baseConfig, schema: HeroSchema },
        { scene: Number.NaN } as unknown as { scene: number },
      ),
    ).rejects.toThrowError(/composition "hero"/);
    await expect(
      resolveCompositionMetadata(
        { ...baseConfig, schema: HeroSchema },
        { scene: Number.NaN } as unknown as { scene: number },
      ),
    ).rejects.toThrowError(/scene/);
  });

  it('validates props returned by calculateMetadata against the schema', async () => {
    await expect(
      resolveCompositionMetadata({
        ...baseConfig,
        schema: HeroSchema,
        calculateMetadata: () => ({ props: { title: 42, scene: 1 } as unknown as { title: string; scene: number } }),
      }),
    ).rejects.toThrowError(/title/);
  });

  it('accepts props that satisfy the schema', async () => {
    const resolved = await resolveCompositionMetadata(
      { ...baseConfig, schema: HeroSchema },
      { title: 'Valid', scene: 2 },
    );
    expect(resolved.props).toEqual({ title: 'Valid', scene: 2 });
  });
});
