import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import {
  buildPosterPdf,
  pdfPageDimensions,
  estimatePosterPages,
  hashPosterPdf,
  type PosterFrame,
} from '../src/poster';

const mkFrame = (v: number, w = 32, h = 32): PosterFrame => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  return { pixels: d, width: w, height: h };
};

describe('pdfPageDimensions', () => {
  it('300 DPI: points = pixels * 72 / 300', () => {
    const d = pdfPageDimensions(1000, 1000, 300);
    expect(d.width).toBeCloseTo(1000 * 72 / 300);
    expect(d.height).toBeCloseTo(1000 * 72 / 300);
    expect(d.widthInches).toBeCloseTo(1000 / 300);
  });

  it('150 DPI doubles the point size', () => {
    const d300 = pdfPageDimensions(100, 100, 300);
    const d150 = pdfPageDimensions(100, 100, 150);
    expect(d150.width).toBeCloseTo(d300.width * 2);
  });

  it('throws on non-positive inputs', () => {
    expect(() => pdfPageDimensions(0, 10)).toThrow(RangeError);
    expect(() => pdfPageDimensions(10, 0)).toThrow(RangeError);
    expect(() => pdfPageDimensions(10, 10, 0)).toThrow(RangeError);
  });
});

describe('estimatePosterPages', () => {
  it('tiles frames across pages', () => {
    const plan = estimatePosterPages(24, 6);
    expect(plan.pages).toBe(4);
    expect(plan.pageStarts).toEqual([0, 6, 12, 18]);
    expect(plan.dpi).toBe(300);
  });

  it('single frame per page', () => {
    const plan = estimatePosterPages(5, 1);
    expect(plan.pages).toBe(5);
    expect(plan.pageStarts).toEqual([0, 1, 2, 3, 4]);
  });

  it('empty input yields zero pages', () => {
    const plan = estimatePosterPages(0, 6);
    expect(plan.pages).toBe(0);
    expect(plan.pageStarts).toEqual([]);
  });

  it('throws on invalid framesPerPage', () => {
    expect(() => estimatePosterPages(10, 0)).toThrow(RangeError);
  });
});

describe('buildPosterPdf', () => {
  it('emits a valid PDF header and EOF marker', () => {
    const pdf = buildPosterPdf([mkFrame(10)], { dpi: 300 });
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.subarray(pdf.length - 6).toString('latin1')).toBe('%%EOF\n');
  });

  it('is deterministic: identical inputs → identical bytes', () => {
    const a = buildPosterPdf([mkFrame(10), mkFrame(200)], { dpi: 300, title: 'T', author: 'A' });
    const b = buildPosterPdf([mkFrame(10), mkFrame(200)], { dpi: 300, title: 'T', author: 'A' });
    expect(a.equals(b)).toBe(true);
    expect(hashPosterPdf(a)).toBe(hashPosterPdf(b));
  });

  it('one PDF page per frame by default', () => {
    const pdf = buildPosterPdf([mkFrame(10), mkFrame(20), mkFrame(30)], { dpi: 300 });
    // 3 frames → 3 pages → 3 image XObjects.
    const imgCount = (pdf.toString('latin1').match(/\/Subtype \/Image/g) || []).length;
    expect(imgCount).toBe(3);
  });

  it('N-up tiles multiple frames onto one page', () => {
    const pdf = buildPosterPdf([mkFrame(10), mkFrame(20), mkFrame(30), mkFrame(40)], {
      dpi: 300,
      framesPerPage: 4,
    });
    // 4 frames at 4-up → 1 page → 1 image XObject (the composite).
    const imgCount = (pdf.toString('latin1').match(/\/Subtype \/Image/g) || []).length;
    expect(imgCount).toBe(1);
  });

  it('image streams inflate back to exact W*H*3 RGB bytes', () => {
    const pdf = buildPosterPdf([mkFrame(10, 16, 8), mkFrame(200, 16, 8)], { dpi: 300 });
    const re =
      /\/Subtype \/Image \/Width (\d+) \/Height (\d+)[\s\S]*?\/Length (\d+) >>\nstream\n/g;
    const s = pdf;
    let m: RegExpExecArray | null;
    let checked = 0;
    while ((m = re.exec(s.toString('latin1')))) {
      const off = m.index + m[0].length;
      const len = parseInt(m[3], 10);
      const w = parseInt(m[1], 10);
      const h = parseInt(m[2], 10);
      const inflated = inflateSync(s.subarray(off, off + len));
      expect(inflated.length).toBe(w * h * 3);
      checked++;
    }
    expect(checked).toBe(2);
  });

  it('rejects mismatched frame dimensions', () => {
    expect(() =>
      buildPosterPdf([mkFrame(10, 32, 32), mkFrame(20, 16, 16)], { dpi: 300 }),
    ).toThrow(/must share dimensions/);
  });

  it('empty frame list produces a minimal valid PDF', () => {
    const pdf = buildPosterPdf([], { dpi: 300 });
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.subarray(pdf.length - 6).toString('latin1')).toBe('%%EOF\n');
  });

  it('embeds title and author in the document Info dict', () => {
    const pdf = buildPosterPdf([mkFrame(10)], { dpi: 300, title: 'My Poster', author: 'Me' });
    const s = pdf.toString('latin1');
    expect(s).toContain('/Title (My Poster)');
    expect(s).toContain('/Author (Me)');
  });
});

describe('hashPosterPdf', () => {
  it('is stable for identical bytes and sensitive to changes', () => {
    const a = buildPosterPdf([mkFrame(10)], { dpi: 300 });
    const b = buildPosterPdf([mkFrame(11)], { dpi: 300 });
    expect(hashPosterPdf(a)).toBe(hashPosterPdf(a));
    expect(hashPosterPdf(a)).not.toBe(hashPosterPdf(b));
  });
});
