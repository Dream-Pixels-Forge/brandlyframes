/**
 * BF-524 — print + video from one source: "posterize" a composition frame
 * into a 300 DPI multi-page PDF.
 *
 * Same `<Composition>` that renders to MP4 also renders a print poster:
 * the source is a stream of RGBA frames (the renderer's output), and each
 * page of the PDF is one frame at 300 DPI. Pure Node — the PDF writer is
 * hand-rolled (no dependency), and the pixel→image conversion is a
 * deterministic JPEG/deflate-style DCT-free RLE + zlib (via the built-in
 * `zlib` module) so previews match the file byte-for-byte.
 *
 * Exports:
 * - `rgbaToJpegLosslessPng` — NO; instead we emit PDFs with **inline
 *   image XObjects** using **FlateDecode** (zlib deflate of raw RGB),
 *   which every PDF viewer supports. No external image codec needed.
 * - `buildPosterPdf` — assemble a multi-page PDF (one page per frame)
 * - `pdfPageDimensions` — 300 DPI point math (pt = px * 72 / dpi)
 * - `estimatePosterPages` — plan a poster run (frames → pages, N-up)
 */

import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

/** RGBA pixels for a single frame (width * height * 4 bytes, row-major). */
export type FramePixels = Uint8ClampedArray;

// ---------------------------------------------------------------------------
// PDF page math at a target DPI
// ---------------------------------------------------------------------------

export interface PdfPageDimensions {
  /** Page width in PDF points (1/72 in). */
  readonly width: number;
  /** Page height in PDF points. */
  readonly height: number;
  /** Page width in physical inches. */
  readonly widthInches: number;
  /** Page height in physical inches. */
  readonly heightInches: number;
}

/**
 * Compute PDF page dimensions for an image of `width x height` pixels
 * rendered at `dpi` dots-per-inch. PDF units are points (72/in), so
 * `points = pixels * 72 / dpi`.
 *
 * @param width - image width in pixels
 * @param height - image height in pixels
 * @param dpi - target dots per inch. Default 300.
 */
export const pdfPageDimensions = (
  width: number,
  height: number,
  dpi = 300,
): PdfPageDimensions => {
  if (width <= 0 || height <= 0 || dpi <= 0) {
    throw new RangeError('pdfPageDimensions: width, height, and dpi must be positive');
  }
  const widthInches = width / dpi;
  const heightInches = height / dpi;
  return {
    width: widthInches * 72,
    height: heightInches * 72,
    widthInches,
    heightInches,
  };
};

// ---------------------------------------------------------------------------
// Poster planning
// ---------------------------------------------------------------------------

export interface PosterPlan {
  /** Total frames in the source. */
  readonly totalFrames: number;
  /** Frames per poster page (N-up layout). */
  readonly framesPerPage: number;
  /** Number of PDF pages. */
  readonly pages: number;
  /** 0-based frame index of the first frame on each page. */
  readonly pageStarts: number[];
  /** DPI of the final PDF. */
  readonly dpi: number;
}

/**
 * Plan a poster run: how many frames per page, how many pages, and where
 * each page starts. Frames are laid out in reading order (left-to-right,
 * top-to-bottom) across the N-up grid.
 *
 * @param totalFrames - total frames available
 * @param framesPerPage - frames per page (1 = one frame per page). Default 1.
 * @param dpi - target DPI. Default 300.
 */
export const estimatePosterPages = (
  totalFrames: number,
  framesPerPage = 1,
  dpi = 300,
): PosterPlan => {
  if (totalFrames < 0) throw new RangeError('totalFrames must be >= 0');
  if (framesPerPage < 1) throw new RangeError('framesPerPage must be >= 1');
  if (totalFrames === 0) {
    return { totalFrames: 0, framesPerPage, pages: 0, pageStarts: [], dpi };
  }
  const pages = Math.ceil(totalFrames / framesPerPage);
  const pageStarts: number[] = [];
  for (let p = 0; p < pages; p++) pageStarts.push(p * framesPerPage);
  return { totalFrames, framesPerPage, pages, pageStarts, dpi };
};

// ---------------------------------------------------------------------------
// PDF assembly (hand-rolled, FlateDecode image XObjects)
// ---------------------------------------------------------------------------

/** One frame of the source composition, as RGBA pixel data. */
export interface PosterFrame {
  readonly pixels: FramePixels;
  readonly width: number;
  readonly height: number;
}

export interface BuildPosterPdfOptions {
  /** Target DPI. Default 300. */
  readonly dpi?: number;
  /** Frames per page (N-up). Default 1 (one frame fills the page). */
  readonly framesPerPage?: number;
  /** PDF title (metadata). Default 'BrandlyFrames Poster'. */
  readonly title?: string;
  /** PDF author (metadata). Default 'BrandlyFrames'. */
  readonly author?: string;
}

/**
 * Build a multi-page PDF poster from a sequence of RGBA frames.
 *
 * Each PDF page carries one image XObject (the frame, or an N-up composite
 * of `framesPerPage` frames tiled on the page). Images are stored with
 * **FlateDecode** (zlib deflate of raw RGB), which is universally supported
 * by PDF viewers and needs no JPEG codec.
 *
 * The output is deterministic: the same frames/dpi/author/title produce a
 * byte-identical PDF (zlib's default settings are stable across runs).
 *
 * @param frames - the composition's frames, in order
 * @param options - dpi, framesPerPage, title, author
 * @returns the PDF document as a `Buffer`
 */
export const buildPosterPdf = (
  frames: readonly PosterFrame[],
  options: BuildPosterPdfOptions = {},
): Buffer => {
  const { dpi = 300, framesPerPage = 1, title = 'BrandlyFrames Poster', author = 'BrandlyFrames' } =
    options;
  if (frames.length === 0) {
    return emptyPosterPdf(dpi, title, author);
  }
  if (framesPerPage < 1) throw new RangeError('framesPerPage must be >= 1');

  const w = frames[0].width;
  const h = frames[0].height;
  for (const f of frames) {
    if (f.width !== w || f.height !== h) {
      throw new RangeError(
        `buildPosterPdf: all frames must share dimensions (${w}x${h}); got ${f.width}x${f.height}`,
      );
    }
  }

  // N-up composite: tile framesPerPage frames onto one page.
  const cols = Math.min(framesPerPage, 4);
  const rows = Math.ceil(framesPerPage / cols);
  const cw = Math.ceil(w / cols);
  const ch = Math.ceil(h / rows);
  const compW = cw * cols;
  const compH = ch * rows;
  const page = pdfPageDimensions(compW, compH, dpi);

  const pages = estimatePosterPages(frames.length, framesPerPage, dpi);
  const pageCount = pages.pages;

  // Per-page object numbering continues from id 4.
  const pagesObjId = 2;
  const pageObjIds: number[] = [];
  let nextId = 4; // after Catalog(1), Pages(2), Font(3)

  // text objects by id; image streams collected separately.
  const textObjs = new Array<string>(Math.max(4, pages.pages * 3 + 4));
  const imageStreams: Array<{ id: number; bytes: Buffer; w: number; h: number }> = [];

  for (let p = 0; p < pages.pages; p++) {
    const start = pages.pageStarts[p];
    const count = Math.min(framesPerPage, frames.length - start);
    const comp = compositePage(
      frames.slice(start, start + count),
      compW,
      compH,
      cw,
      ch,
      cols,
      rows,
    );
    const imgId = nextId++;
    const contentId = nextId++;
    const pageId = nextId++;
    pageObjIds.push(pageId);

    // Image bytes (deflated RGB).
    const rgb = rgbaToRgb(comp, compW, compH);
    imageStreams.push({ id: imgId, bytes: deflateSync(Buffer.from(rgb), { level: 9 }), w: compW, h: compH });

    // Content stream: paint the image over the full page rect.
    const contentStream = `q\n${page.width.toFixed(2)} 0 0 ${page.height.toFixed(2)} 0 0 cm\n/${imgId} Do\nQ\n`;
    textObjs[contentId - 1] =
      `${contentId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

    // Page object.
    textObjs[pageId - 1] =
      `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${page.width.toFixed(2)} ${page.height.toFixed(2)}] ` +
      `/Resources << /XObject << ${imgId} ${imgId} 0 R >> /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`;
  }

  // Base objects: Catalog(1), Pages(2, kids filled here), Font(3).
  const kids = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  textObjs[0] = `1 0 obj\n<< /Type /Catalog /Pages ${pagesObjId} 0 R >>\nendobj\n`;
  textObjs[1] = `${pagesObjId} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.pages} >>\nendobj\n`;
  textObjs[2] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  return assemblePdf(textObjs, imageStreams, title, author);
};

const compositePage = (
  frames: readonly PosterFrame[],
  compW: number,
  compH: number,
  cw: number,
  ch: number,
  cols: number,
  rows: number,
): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(compW * compH * 4);
  for (let i = 0; i < frames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = col * cw;
    const y0 = row * ch;
    const f = frames[i];
    for (let y = 0; y < f.height && y0 + y < compH; y++) {
      for (let x = 0; x < f.width && x0 + x < compW; x++) {
        const s = (y * f.width + x) * 4;
        const d = ((y0 + y) * compW + (x0 + x)) * 4;
        out[d] = f.pixels[s];
        out[d + 1] = f.pixels[s + 1];
        out[d + 2] = f.pixels[s + 2];
        out[d + 3] = 255;
      }
    }
  }
  return out;
};

/** Strip alpha: RGBA → raw RGB (opaque). */
const rgbaToRgb = (rgba: Uint8ClampedArray, w: number, h: number): Uint8Array => {
  const n = w * h;
  const out = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    out[i * 3] = rgba[i * 4];
    out[i * 3 + 1] = rgba[i * 4 + 1];
    out[i * 3 + 2] = rgba[i * 4 + 2];
  }
  return out;
};

/** A valid, empty single-page PDF (no images) with metadata. */
const emptyPosterPdf = (dpi: number, title: string, author: string): Buffer => {
  const page = pdfPageDimensions(1, 1, dpi);
  void page;
  const content = '';
  const textObjs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    `5 0 obj\n<< /Length ${content.length} >>\nstream\nendstream\nendobj\n`,
  ];
  return assemblePdf(textObjs, [], title, author);
};

/**
 * Stitch object bodies into a valid PDF byte stream with xref + trailer.
 *
 * Image XObject streams (raw deflate bytes) are spliced in at their object
 * positions; every other object is plain text.
 */
/**
 * Build a complete, valid PDF byte stream from text objects + stream bytes.
 * Deterministic: no timestamps, fixed object-id layout, stable xref.
 *
 * - `textObjs`: entries in **object-id order** (index = id - 1). Use `''` for
 *   ids that carry a binary image stream (they live in `streamObjs`).
 * - `streamObjs`: binary image XObjects; each carries its object id and its
 *   already-deflated bytes.
 */
const assemblePdf = (
  textObjs: string[],
  streamObjs: ReadonlyArray<{ id: number; bytes: Buffer; w: number; h: number }>,
  title: string,
  author: string,
): Buffer => {
  const header = '%PDF-1.7\n';
  const chunks: Buffer[] = [Buffer.from(header)];
  let cursor = header.length;

  const totalObjs = textObjs.length + streamObjs.length;

  // Interleave text and stream objects by ascending object id.
  const textById = new Map<number, string>();
  textObjs.forEach((body, idx) => {
    const m = /^(\d+) 0 obj\n/.exec(body);
    const id = m ? parseInt(m[1], 10) : idx + 1;
    textById.set(id, body);
  });
  const streamById = new Map<number, { bytes: Buffer; w: number; h: number }>();
  for (const so of streamObjs) streamById.set(so.id, so);

  const ids: number[] = [];
  for (let i = 1; i <= totalObjs; i++) ids.push(i);

  for (const id of ids) {
    if (streamById.has(id)) {
      const so = streamById.get(id)!;
      const body =
        `${id} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${so.w} /Height ${so.h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${so.bytes.length} >>\n` +
        `stream\n`;
      chunks.push(Buffer.from(body));
      cursor += body.length;
      chunks.push(so.bytes);
      cursor += so.bytes.length;
      const tail = '\nendstream\nendobj\n';
      chunks.push(Buffer.from(tail));
      cursor += tail.length;
    } else {
      const body = textById.get(id) ?? '';
      chunks.push(Buffer.from(body));
      cursor += body.length;
    }
  }

  const assembled = Buffer.concat(chunks);

  // xref: scan for each "N 0 obj" to get its byte offset.
  const offsets: number[] = [0]; // free-list head
  let searchFrom = 0;
  for (let id = 1; id <= totalObjs; id++) {
    const needle = Buffer.from(`${id} 0 obj`);
    const found = assembled.indexOf(needle, searchFrom);
    offsets.push(found);
    searchFrom = found;
  }

  const xref =
    `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((off) => off.toString().padStart(10, '0') + ' 00000 n \n')
      .join('');

  const infoId = totalObjs + 1;
  const info =
    `${infoId} 0 obj\n` +
    `<< /Title (${escapePdf(title)}) /Author (${escapePdf(author)}) /Producer (BrandlyFrames BF-524) >>\n` +
    `endobj\n`;
  // startxref = byte offset of the "xref" keyword in the final document.
  // Final layout: assembled | info | xref | trailer
  // xref starts at assembled.length + info.length.
  const startxrefOffset = assembled.length + info.length;
  const trailer =
    `trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\n` +
    `startxref\n${startxrefOffset}\n%%EOF\n`;

  return Buffer.concat([
    assembled,
    Buffer.from(xref),
    Buffer.from(info),
    Buffer.from(trailer),
  ]);
};

const escapePdf = (s: string): string => s.replace(/([()\\])/g, '\\$1');

// ---------------------------------------------------------------------------
// Convenience: frame hash for golden-file determinism (matches renderer)
// ---------------------------------------------------------------------------

/**
 * Compute a stable content hash of a poster PDF buffer (djb2 over bytes,
 * hex-encoded). Useful for asserting "same frames → same PDF" in tests.
 */
export const hashPosterPdf = (pdf: Buffer): string => {
  let h = 5381;
  for (let i = 0; i < pdf.length; i++) {
    h = ((h << 5) + h + pdf[i]) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};
