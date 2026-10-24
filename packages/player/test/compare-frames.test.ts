import { describe, it, expect } from 'vitest';
import { compareRenderFrames, type RenderFrameDiff } from '../src/compare-frames';

function rgba(r: number, g: number, b: number, a = 255): Uint8Array {
  return new Uint8Array([r, g, b, a]);
}

describe('compareRenderFrames (BF-440)', () => {
  it('identical buffers: no differing pixels, null bbox, zero diffs', () => {
    const a = new Uint8Array([...rgba(10, 20, 30), ...rgba(255, 0, 0, 128)]);
    const b = new Uint8Array(a);

    const result: RenderFrameDiff = compareRenderFrames(a, b);

    expect(result.totalPixels).toBe(2);
    expect(result.differingPixelCount).toBe(0);
    expect(result.maxChannelDiff).toBe(0);
    expect(result.meanChannelDiff).toBe(0);
    expect(result.bbox).toBeNull();
  });

  it('one pixel differs: count 1, bbox around that pixel, exact maxChannelDiff', () => {
    const a = new Uint8Array([...rgba(0, 0, 0), ...rgba(0, 0, 0)]);
    const b = new Uint8Array([...rgba(0, 0, 0), ...rgba(0, 0, 42)]);

    const result = compareRenderFrames(a, b);

    expect(result.totalPixels).toBe(2);
    expect(result.differingPixelCount).toBe(1);
    expect(result.maxChannelDiff).toBe(42);
    expect(result.meanChannelDiff).toBe(42 / 8); // one channel of 8 compared
    expect(result.bbox).toEqual({ minX: 1, minY: 0, maxX: 1, maxY: 0 });
  });

  it('whole buffer differs: differingPixelCount equals totalPixels', () => {
    const a = new Uint8Array([...rgba(0, 0, 0), ...rgba(0, 0, 0), ...rgba(0, 0, 0)]);
    const b = new Uint8Array([...rgba(255, 255, 255), ...rgba(1, 2, 3), ...rgba(4, 5, 6)]);

    const result = compareRenderFrames(a, b);

    expect(result.differingPixelCount).toBe(3);
    expect(result.totalPixels).toBe(3);
    expect(result.bbox).toEqual({ minX: 0, minY: 0, maxX: 2, maxY: 0 });
  });

  it('threshold: diffs at or below threshold are ignored', () => {
    const a = new Uint8Array([...rgba(100, 100, 100)]);
    const b = new Uint8Array([...rgba(105, 100, 100)]);

    expect(compareRenderFrames(a, b, { threshold: 5 }).differingPixelCount).toBe(0);
    expect(compareRenderFrames(a, b, { threshold: 5 }).bbox).toBeNull();
    expect(compareRenderFrames(a, b, { threshold: 4 }).differingPixelCount).toBe(1);
  });

  it('channel option: rgb ignores alpha differences', () => {
    const a = new Uint8Array([...rgba(10, 10, 10, 255)]);
    const b = new Uint8Array([...rgba(10, 10, 10, 0)]);

    expect(compareRenderFrames(a, b, { channel: 'rgb' }).differingPixelCount).toBe(0);
    expect(compareRenderFrames(a, b, { channel: 'rgba' }).differingPixelCount).toBe(1);
    expect(compareRenderFrames(a, b, { channel: 'rgba' }).maxChannelDiff).toBe(255);
  });

  it('channel option: luma compares perceived luminance', () => {
    const a = new Uint8Array([...rgba(100, 100, 100)]);
    const b = new Uint8Array([...rgba(110, 110, 110)]);

    // luma diff is exactly 10; strictly-greater-than threshold means 10 is not beyond 10.
    expect(compareRenderFrames(a, b, { channel: 'luma', threshold: 10 }).differingPixelCount).toBe(0);
    expect(compareRenderFrames(a, b, { channel: 'luma', threshold: 10 }).bbox).toBeNull();
    expect(compareRenderFrames(a, b, { channel: 'luma', threshold: 9 }).differingPixelCount).toBe(1);
  });

  it('different lengths throw RangeError', () => {
    const a = new Uint8Array([...rgba(0, 0, 0)]);
    const b = new Uint8Array([...rgba(0, 0, 0), ...rgba(0, 0, 0)]);

    expect(() => compareRenderFrames(a, b)).toThrow(RangeError);
    expect(() => compareRenderFrames(b, a)).toThrow(RangeError);
  });

  it('length not divisible by 4 (not RGBA-aligned) throws RangeError', () => {
    const a = new Uint8Array([0, 0, 0]);
    const b = new Uint8Array([0, 0, 0]);

    expect(() => compareRenderFrames(a, b)).toThrow(RangeError);
    expect(() => compareRenderFrames(a, new Uint8Array([0, 0, 0, 0]))).toThrow(RangeError);
  });

  it('empty buffers are valid and identical', () => {
    const result = compareRenderFrames(new Uint8Array(0), new Uint8Array(0));

    expect(result.totalPixels).toBe(0);
    expect(result.differingPixelCount).toBe(0);
    expect(result.maxChannelDiff).toBe(0);
    expect(result.bbox).toBeNull();
  });
});
