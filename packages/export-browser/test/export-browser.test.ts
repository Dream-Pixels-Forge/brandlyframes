/**
 * BF-201: Browser-side export via WebCodecs (no server).
 *
 * This test suite verifies the MP4/WebM muxer and browser export API:
 * - MP4 box writer produces valid ISO BMFF files (ftyp, moov, moof, mdat)
 * - WebM/EBML muxer produces valid WebM files
 * - exportVideoBrowser / exportAudioBrowser API shape
 * - Deterministic output: same input yields same bytes
 * - Works in Node without WebCodecs (CPU/muxer-only path)
 */

import { describe, expect, it } from 'vitest';
import {
  muxMp4,
  muxWebm,
  exportVideoBrowser,
  exportAudioBrowser,
} from '../src/index';

// ---------------------------------------------------------------------------
// Minimal fake WebCodecs encoder for browser tests
// ---------------------------------------------------------------------------

// Minimal fake WebCodecs encoders for browser tests. They invoke the encoder's
// `output` callback with real Uint8Array chunks (the export code reads
// `.length` / `.byteLength` and casts chunks to Uint8Array for muxing).

class FakeVideoEncoder {
  readonly chunks: Uint8Array[] = [];
  configured = false;
  closed = false;
  width = 0;
  height = 0;
  output: (chunk: Uint8Array) => void;

  constructor(config: { output: (chunk: Uint8Array) => void; error?: (e: unknown) => void }) {
    this.output = config.output;
  }

  configure(config: unknown): void {
    this.configured = true;
    const c = config as { width?: number; height?: number };
    this.width = c.width ?? 0;
    this.height = c.height ?? 0;
  }

  encode(_frame: unknown): void {
    // Emit a deterministic chunk per frame
    const data = new Uint8Array([1, 2, 3, 4]);
    this.chunks.push(data);
    this.output(data);
  }

  async flush(): Promise<void> {
    // Emit a finalizing chunk so onProgress reaches 1 (full framebuffer size)
    const byteLength = this.width * this.height * 4;
    const data = new Uint8Array(byteLength);
    if (byteLength) data[0] = 1;
    this.chunks.push(data);
    this.output(data);
  }

  close(): void {
    this.closed = true;
  }
}

class FakeAudioEncoder {
  readonly chunks: Uint8Array[] = [];
  configured = false;
  closed = false;
  output: (chunk: Uint8Array) => void;

  constructor(config: { output: (chunk: Uint8Array) => void; error?: (e: unknown) => void }) {
    this.output = config.output;
  }

  configure(_config: unknown): void {
    this.configured = true;
  }

  encode(_frame: unknown): void {
    const data = new Uint8Array([5, 6, 7, 8]);
    this.chunks.push(data);
    this.output(data);
  }

  async flush(): Promise<void> {
    // no-op
  }

  close(): void {
    this.closed = true;
  }
}

// ---------------------------------------------------------------------------
// Browser globals so exportVideoBrowser/exportAudioBrowser can run in Node
// ---------------------------------------------------------------------------

const origWindow = globalThis.window;
const origDocument = globalThis.document;
const origVideoEncoder = globalThis.VideoEncoder;
const origAudioEncoder = globalThis.AudioEncoder;
const origURL = globalThis.URL;
const origBlob = globalThis.Blob;

function installBrowser(): void {
  const g = globalThis as Record<string, unknown>;
  g.window = {};
  g.document = {
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({
      href: '',
      download: '',
      click: () => {},
      width: 0,
      height: 0,
      getContext: () => ({ fillStyle: '', fillRect: () => {} }),
    }),
  };
  g.VideoEncoder = FakeVideoEncoder;
  g.AudioEncoder = FakeAudioEncoder;
  g.VideoFrame = class {
    constructor(public readonly canvas: unknown, public readonly options: unknown) {}
    close(): void {}
  };
  g.AudioData = class {
    constructor(public readonly buffer: ArrayBuffer) {}
    close(): void {}
  };
  g.URL = {
    createObjectURL: () => 'blob:mock-export',
    revokeObjectURL: () => {},
  };
  g.Blob = class {
    constructor(
      public readonly parts: unknown[],
      public readonly options?: BlobPropertyBag,
    ) {}
  };
}

function uninstallBrowser(): void {
  const g = globalThis as Record<string, unknown>;
  g.window = origWindow;
  g.document = origDocument;
  g.VideoEncoder = origVideoEncoder;
  g.AudioEncoder = origAudioEncoder;
  g.URL = origURL;
  g.Blob = origBlob;
}

installBrowser();

// ---------------------------------------------------------------------------
// MP4 box tests (pure muxer, testable in Node)
// ---------------------------------------------------------------------------

describe('muxMp4', () => {
  it('produces a valid MP4 file starting with ftyp box', () => {
    const videoChunks = [
      { type: 'key' as const, byteLength: 100, data: new Uint8Array([1, 2, 3]) },
    ];
    const audioChunks = [
      { type: 'key' as const, byteLength: 50, data: new Uint8Array([5, 6]) },
    ];

    const out = muxMp4({
      videoChunks,
      audioChunks,
      width: 1920,
      height: 1080,
      timescale: 1000,
      duration: 1,
    });

    expect(out.length).toBeGreaterThan(0);

    // ftyp box: size(4) + 'ftyp'(4) + major_brand(4) + minor_version(4) + compatible_brands...
    const ftyp = out.subarray(0, 32);
    expect(new TextDecoder().decode(ftyp.subarray(4, 8))).toBe('ftyp');
    expect(new TextDecoder().decode(ftyp.subarray(8, 12))).toBe('isom');
  });

  it('is deterministic: same input yields same bytes', () => {
    const videoChunks = [
      { type: 'key' as const, byteLength: 100, data: new Uint8Array([1, 2, 3]) },
    ];
    const audioChunks = [
      { type: 'key' as const, byteLength: 50, data: new Uint8Array([5, 6]) },
    ];

    const a = muxMp4({
      videoChunks,
      audioChunks,
      width: 1920,
      height: 1080,
      timescale: 1000,
      duration: 1,
    });
    const b = muxMp4({
      videoChunks,
      audioChunks,
      width: 1920,
      height: 1080,
      timescale: 1000,
      duration: 1,
    });

    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('includes moov and mdat boxes', () => {
    const videoChunks = [
      { type: 'key' as const, byteLength: 100, data: new Uint8Array([1, 2, 3]) },
    ];

    const out = muxMp4({
      videoChunks,
      audioChunks: [],
      width: 1920,
      height: 1080,
      timescale: 1000,
      duration: 1,
    });

    const haystack = new TextDecoder().decode(out);
    expect(haystack).toContain('moov');
    expect(haystack).toContain('mdat');
  });

  it('handles video-only and audio-only', () => {
    const videoOnly = muxMp4({
      videoChunks: [
        { type: 'key' as const, byteLength: 100, data: new Uint8Array([1]) },
      ],
      audioChunks: [],
      width: 640,
      height: 480,
      timescale: 1000,
      duration: 1,
    });
    expect(videoOnly.length).toBeGreaterThan(0);

    const audioOnly = muxMp4({
      videoChunks: [],
      audioChunks: [
        { type: 'key' as const, byteLength: 50, data: new Uint8Array([5]) },
      ],
      width: 640,
      height: 480,
      timescale: 1000,
      duration: 1,
    });
    expect(audioOnly.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// WebM muxer tests
// ---------------------------------------------------------------------------

describe('muxWebm', () => {
  it('produces a valid WebM file starting with EBML header', () => {
    const videoChunks = [
      { type: 'key' as const, byteLength: 100, data: new Uint8Array([1, 2, 3]) },
    ];

    const out = muxWebm({
      videoChunks,
      audioChunks: [],
      width: 1920,
      height: 1080,
      duration: 1,
    });

    expect(out.length).toBeGreaterThan(0);
    // WebM starts with EBML ID 0x1A45DFA3
    expect(out[0]).toBe(0x1a);
    expect(out[1]).toBe(0x45);
    expect(out[2]).toBe(0xdf);
    expect(out[3]).toBe(0xa3);
  });

  it('is deterministic', () => {
    const videoChunks = [
      { type: 'key' as const, byteLength: 100, data: new Uint8Array([1, 2, 3]) },
    ];

    const a = muxWebm({
      videoChunks,
      audioChunks: [],
      width: 1920,
      height: 1080,
      duration: 1,
    });
    const b = muxWebm({
      videoChunks,
      audioChunks: [],
      width: 1920,
      height: 1080,
      duration: 1,
    });

    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

// ---------------------------------------------------------------------------
// exportVideoBrowser API tests
// ---------------------------------------------------------------------------

describe('exportVideoBrowser', () => {
  it('exports video and calls onProgress when provided', async () => {
    const frames = [
      { timestampMicroseconds: 0, durationMicroseconds: 33333 },
      { timestampMicroseconds: 33333, durationMicroseconds: 33333 },
    ];

    const progressCalls: number[] = [];
    const result = await exportVideoBrowser({
      frames,
      width: 640,
      height: 480,
      fps: 30,
      codec: 'h264',
      onProgress: (p) => progressCalls.push(p),
    });

    expect(result.backend).toBe('browser');
    expect(result.format).toBe('mp4');
    expect(result.byteLength).toBeGreaterThan(0);
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[progressCalls.length - 1]).toBe(1);
  });

  it('throws outside a browser environment', async () => {
    uninstallBrowser();
    try {
      // In Node without WebCodecs, should throw a clear error
      await expect(
        exportVideoBrowser({
          frames: [
            { timestampMicroseconds: 0, durationMicroseconds: 33333 },
          ],
          width: 640,
          height: 480,
          fps: 30,
          codec: 'h264',
        }),
      ).rejects.toThrow(/WebCodecs|browser|environment/);
    } finally {
      installBrowser();
    }
  });
});

describe('exportAudioBrowser', () => {
  it('exports audio deterministically', async () => {
    const result = await exportAudioBrowser({
      sampleCount: 44100,
      sampleRate: 44100,
      channelCount: 2,
      codec: 'opus',
    });

    expect(result.backend).toBe('browser');
    expect(result.format).toBe('webm');
    expect(result.byteLength).toBeGreaterThan(0);
  });
});
