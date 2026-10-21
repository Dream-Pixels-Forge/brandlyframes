import { describe, it, expect } from 'vitest';

import {
  frameHash,
  compareGoldenFrames,
  assertGoldenFrame,
  assertDeterministic,
} from '../src/testing.js';

/** Fake launcher returning deterministic PNG bytes per frame. */
const makeFakeLauncher = (pngs: Map<number, Uint8Array>) => {
  return async (): Promise<{
    launchTab: (
      url: string,
      flags: readonly string[],
    ) => Promise<{
      gotoFrame: (frame: number) => Promise<void>;
      screenshotPng: () => Promise<Uint8Array>;
      close: () => Promise<void>;
    }>;
    close: () => Promise<void>;
  }> => {
    let currentFrame = 0;
    return {
      launchTab: async () => ({
        gotoFrame: async (frame: number) => {
          currentFrame = frame;
        },
        screenshotPng: async () => pngs.get(currentFrame) ?? new Uint8Array([0, 0, 0]),
        close: async () => {},
      }),
      close: async () => {},
    };
  };
};

describe('frameHash', () => {
  it('produces a lowercase hex digest of PNG bytes', () => {
    const hash = frameHash(new Uint8Array([1, 2, 3]));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical input', () => {
    const input = new Uint8Array([9, 8, 7, 6]);
    expect(frameHash(input)).toBe(frameHash(input));
  });

  it('differs for different input', () => {
    expect(frameHash(new Uint8Array([1]))).not.toBe(frameHash(new Uint8Array([2])));
  });
});

describe('compareGoldenFrames', () => {
  it('passes when every captured hash matches its golden hash', async () => {
    const png0 = new Uint8Array([1]);
    const png1 = new Uint8Array([2]);
    const pngs = new Map([[0, png0], [1, png1]]);
    const golden = new Map([[0, frameHash(png0)], [1, frameHash(png1)]]);
    const results = await compareGoldenFrames(
      'http://example.com',
      makeFakeLauncher(pngs),
      { golden },
    );
    expect(results).toHaveLength(2);
    expect(results[0].pass).toBe(true);
    expect(results[1].pass).toBe(true);
  });

  it('fails when a captured hash differs from its golden hash', async () => {
    const pngs = new Map([[0, new Uint8Array([1])], [1, new Uint8Array([99])]]);
    const golden = new Map([[0, frameHash(new Uint8Array([1]))], [1, 'deadbeef']]);
    const results = await compareGoldenFrames(
      'http://example.com',
      makeFakeLauncher(pngs),
      { golden },
    );
    expect(results[0].pass).toBe(true);
    expect(results[1].pass).toBe(false);
    expect(results[1].diff).toBeGreaterThan(0n);
  });

  it('passes with tolerance large enough to absorb the diff', async () => {
    const pngs = new Map([[0, new Uint8Array([1])]]);
    const golden = new Map([[0, 'deadbeef']]);
    const results = await compareGoldenFrames(
      'http://example.com',
      makeFakeLauncher(pngs),
      { golden, tolerance: 1 },
    );
    expect(results[0].pass).toBe(true);
  });

  it('defaults tolerance to 0 (exact match required)', async () => {
    const pngs = new Map([[0, new Uint8Array([1])]]);
    const golden = new Map([[0, 'deadbeef']]);
    const results = await compareGoldenFrames(
      'http://example.com',
      makeFakeLauncher(pngs),
      { golden },
    );
    expect(results[0].pass).toBe(false);
  });

  it('captures only the requested frames', async () => {
    const pngs = new Map([[5, new Uint8Array([7])]]);
    const golden = new Map([[5, frameHash(new Uint8Array([7]))]]);
    const results = await compareGoldenFrames(
      'http://example.com',
      makeFakeLauncher(pngs),
      { golden, frames: [5] },
    );
    expect(results).toHaveLength(1);
    expect(results[0].frame).toBe(5);
  });

  it('records empty goldenHash when a frame has no golden entry', async () => {
    const pngs = new Map([[0, new Uint8Array([1])]]);
    const results = await compareGoldenFrames(
      'http://example.com',
      makeFakeLauncher(pngs),
      { golden: new Map(), frames: [0] },
    );
    expect(results[0].goldenHash).toBe('');
    expect(results[0].pass).toBe(false);
  });
});

describe('assertGoldenFrame', () => {
  it('resolves when the captured hash matches the golden hash', async () => {
    const png = new Uint8Array([1, 2, 3]);
    const hash = frameHash(png);
    const pngs = new Map([[3, png]]);
    await expect(
      assertGoldenFrame('http://example.com', makeFakeLauncher(pngs), 3, { goldenHash: hash }),
    ).resolves.toBeUndefined();
  });

  it('rejects when the captured hash differs', async () => {
    const pngs = new Map([[3, new Uint8Array([1])]]);
    await expect(
      assertGoldenFrame('http://example.com', makeFakeLauncher(pngs), 3, {
        goldenHash: 'deadbeef',
      }),
    ).rejects.toThrow(/hash mismatch/);
  });

  it('respects tolerance', async () => {
    const pngs = new Map([[3, new Uint8Array([1])]]);
    await expect(
      assertGoldenFrame('http://example.com', makeFakeLauncher(pngs), 3, {
        goldenHash: 'deadbeef',
        tolerance: 1,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('assertDeterministic', () => {
  it('resolves when two captures are byte-identical', async () => {
    const pngs = new Map([
      [0, new Uint8Array([1, 2, 3])],
      [1, new Uint8Array([4, 5, 6])],
    ]);
    await expect(
      assertDeterministic('http://example.com', makeFakeLauncher(pngs), {
        range: { start: 0, end: 2 },
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects when two captures differ', async () => {
    let call = 0;
    const varyingLauncher = async () => {
      call++;
      return {
        launchTab: async () => {
          const bytes = call === 1 ? new Uint8Array([1]) : new Uint8Array([2]);
          return {
            gotoFrame: async () => {},
            screenshotPng: async () => bytes,
            close: async () => {},
          };
        },
        close: async () => {},
      };
    };
    await expect(
      assertDeterministic('http://example.com', varyingLauncher, {
        range: { start: 0, end: 1 },
      }),
    ).rejects.toThrow(/not byte-identical/);
  });
});
