/**
 * BF-201: Browser-side export via WebCodecs (no server).
 *
 * MP4 (ISO BMFF) box writer. Pure TypeScript — no DOM, no WebCodecs, fully
 * testable in Node.
 */

function box(type: string, payload: Uint8Array): Uint8Array {
  const size = 8 + payload.length;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, size, false);
  out.set(new TextEncoder().encode(type), 4);
  out.set(payload, 8);
  return out;
}

function fullBox(
  type: string,
  version: number,
  flags: number,
  payload: Uint8Array,
): Uint8Array {
  // ISO BMFF fullBox: version (1 byte, big-endian) + flags (3 bytes).
  // Writing flags as a Uint32 at offset 1 would run past the 4-byte buffer,
  // so write the 24-bit flags as three individual bytes instead.
  const header = new Uint8Array(4);
  header[0] = version;
  header[1] = (flags >> 16) & 0xff;
  header[2] = (flags >> 8) & 0xff;
  header[3] = flags & 0xff;
  const fullPayload = new Uint8Array(header.length + payload.length);
  fullPayload.set(header, 0);
  fullPayload.set(payload, header.length);
  return box(type, fullPayload);
}

const textToBytes = (s: string): Uint8Array =>
  new Uint8Array([...s].map((c) => c.charCodeAt(0)));

function buildFtyp(): Uint8Array {
  return box(
    'ftyp',
    new Uint8Array([
      ...textToBytes('isom'),
      0, 0, 0, 0,
      ...textToBytes('isom'),
      ...textToBytes('iso2'),
      ...textToBytes('avc1'),
      ...textToBytes('mp41'),
    ]),
  );
}

function buildMvhd(
  timescale: number,
  duration: number,
  width: number,
  height: number,
): Uint8Array {
  const payload = new Uint8Array(80);
  const v = new DataView(payload.buffer);
  let o = 0;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, timescale, false); o += 4;
  v.setUint32(o, duration, false); o += 4;
  v.setUint32(o, 0x00010000, false); o += 4;
  v.setUint16(o, 0x0100, false); o += 2;
  o += 2;
  v.setUint32(o, 0x00010000, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 1 << 16, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0x40000000, false); o += 4;
  v.setUint16(o, width, false); o += 2;
  v.setUint16(o, height, false);
  return fullBox('mvhd', 0, 0, payload);
}

function buildTkhd(
  trackId: number,
  width: number,
  height: number,
  duration: number,
): Uint8Array {
  const payload = new Uint8Array(80);
  const v = new DataView(payload.buffer);
  let o = 0;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, trackId, false); o += 4;
  o += 4;
  v.setUint32(o, duration, false); o += 4;
  o += 4;
  v.setUint16(o, 0, false); o += 2;
  v.setUint16(o, 0, false); o += 2;
  v.setUint16(o, trackId === 1 ? 0x0100 : 0, false); o += 2;
  o += 2;
  v.setUint32(o, 0x00010000, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0x00010000, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0x40000000, false); o += 4;
  v.setUint16(o, width, false); o += 2;
  v.setUint16(o, height, false);
  return fullBox('tkhd', 0, trackId === 1 ? 0x000001 : 0, payload);
}

function buildMdhd(timescale: number, duration: number): Uint8Array {
  // creation_time(4) + modification_time(4) + timescale(4) + duration(4) +
  // language(2) + predefined(2) = 20 bytes (fullBox version/flags added by caller)
  const payload = new Uint8Array(20);
  const v = new DataView(payload.buffer);
  let o = 0;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, timescale, false); o += 4;
  v.setUint32(o, duration, false); o += 4;
  v.setUint16(o, 0x55c4, false); o += 2;
  v.setUint16(o, 0, false);
  return fullBox('mdhd', 0, 0, payload);
}

function buildHdlr(handler: string): Uint8Array {
  const hb = textToBytes(handler);
  const payload = new Uint8Array(24 + hb.length + 1);
  const v = new DataView(payload.buffer);
  let o = 0;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  payload.set(hb, o); o += hb.length;
  payload[o] = 0;
  return fullBox('hdlr', 0, 0, payload);
}

function boxChildren(type: string, children: Uint8Array[]): Uint8Array {
  const total = children.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of children) {
    out.set(c, o); o += c.length;
  }
  return box(type, out);
}

function buildMdia(
  timescale: number,
  duration: number,
  handler: string,
  codecSpecific: Uint8Array,
  sampleCount: number,
  sampleSizes: number[],
): Uint8Array {
  const mdhd = buildMdhd(timescale, duration);
  const hdlr = buildHdlr(handler);
  const minf = buildMinf(codecSpecific, sampleCount, sampleSizes);
  return boxChildren('mdia', [mdhd, hdlr, minf]);
}

function buildMinf(
  codecSpecific: Uint8Array,
  sampleCount: number,
  sampleSizes: number[],
): Uint8Array {
  const smhd = buildSmhd();
  const dinf = buildDinf();
  const stbl = buildStbl(codecSpecific, sampleCount, sampleSizes);
  return boxChildren('minf', [smhd, dinf, stbl]);
}

function buildSmhd(): Uint8Array {
  const payload = new Uint8Array(8);
  const v = new DataView(payload.buffer);
  v.setUint32(0, 0, false);
  v.setUint16(4, 0, false);
  return fullBox('smhd', 0, 0, payload);
}

function buildDinf(): Uint8Array {
  return boxChildren('dinf', [buildDref()]);
}

function buildDref(): Uint8Array {
  const payload = new Uint8Array(12);
  const v = new DataView(payload.buffer);
  v.setUint32(0, 1, false);
  v.setUint32(4, 1, false);
  v.setUint32(8, 0, false);
  return fullBox('dref', 0, 0, payload);
}

function buildStbl(
  codecSpecific: Uint8Array,
  sampleCount: number,
  sampleSizes: number[],
): Uint8Array {
  const stsd = buildStsd(codecSpecific);
  const stts = buildStts(sampleCount);
  const stsc = buildStsc(sampleCount);
  const stsz = buildStsz(sampleSizes);
  const stco = buildStco(sampleCount);
  return boxChildren('stbl', [stsd, stts, stsc, stsz, stco]);
}

function buildStsd(codecSpecific: Uint8Array): Uint8Array {
  const width = 1920;
  const height = 1080;
  const depth = 24;
  const colorTableId = 0;

  // avc1 visual sample entry: 42-byte fixed header (reserved, data_ref_index,
  // width, height, resolutions, frame_count, depth, color_table_id) followed
  // by the codec-specific AVC config bytes.
  const avc1Payload = new Uint8Array(42 + codecSpecific.length);
  const v = new DataView(avc1Payload.buffer);
  let o = 0;
  o += 6;
  v.setUint16(o, 1, false); o += 2;
  o += 2; o += 4; o += 4; o += 4;
  v.setUint16(o, width, false); o += 2;
  v.setUint16(o, height, false); o += 2;
  v.setUint32(o, 0x00480000, false); o += 4;
  v.setUint32(o, 0x00480000, false); o += 4;
  v.setUint32(o, 0, false); o += 4;
  v.setUint16(o, depth, false); o += 2;
  v.setUint16(o, colorTableId, false); o += 2;
  avc1Payload.set(codecSpecific, o);

  const avc1Box = box('avc1', avc1Payload);
  const avccBox = box('avcC', codecSpecific);

  const stsdPayload = new Uint8Array(avc1Box.length + avccBox.length);
  stsdPayload.set(avc1Box, 0);
  stsdPayload.set(avccBox, avc1Box.length);

  return fullBox('stsd', 0, 0, stsdPayload);
}

function buildStts(sampleCount: number): Uint8Array {
  const payload = new Uint8Array(12);
  const v = new DataView(payload.buffer);
  v.setUint32(0, 1, false);
  v.setUint32(4, sampleCount, false);
  v.setUint32(8, 1, false);
  return fullBox('stts', 0, 0, payload);
}

function buildStsc(sampleCount: number): Uint8Array {
  const payload = new Uint8Array(16);
  const v = new DataView(payload.buffer);
  v.setUint32(0, 1, false);
  v.setUint32(4, 1, false);
  v.setUint32(8, sampleCount, false);
  v.setUint32(12, 1, false);
  return fullBox('stsc', 0, 0, payload);
}

function buildStsz(sizes: number[]): Uint8Array {
  const sampleCount = sizes.length;
  const payload = new Uint8Array(8 + sampleCount * 4);
  const v = new DataView(payload.buffer);
  v.setUint32(0, 0, false);
  v.setUint32(4, sampleCount, false);
  for (let i = 0; i < sampleCount; i++) {
    v.setUint32(8 + i * 4, sizes[i], false);
  }
  return fullBox('stsz', 0, 0, payload);
}

function buildStco(sampleCount: number): Uint8Array {
  const payload = new Uint8Array(8 + sampleCount * 4);
  const v = new DataView(payload.buffer);
  v.setUint32(0, sampleCount, false);
  for (let i = 0; i < sampleCount; i++) {
    v.setUint32(4 + i * 4, i * 4096, false);
  }
  return fullBox('stco', 0, 0, payload);
}

export interface Mp4Options {
  readonly videoChunks: readonly { readonly byteLength: number; readonly data: Uint8Array }[];
  readonly audioChunks: readonly { readonly byteLength: number; readonly data: Uint8Array }[];
  readonly width: number;
  readonly height: number;
  readonly timescale: number;
  readonly duration: number;
}

export function muxMp4(options: Mp4Options): Uint8Array {
  const { videoChunks, audioChunks, width, height, timescale, duration } = options;

  const ftyp = buildFtyp();
  const mvhd = buildMvhd(timescale, duration, width, height);

  const videoSizes = videoChunks.map((c) => c.byteLength);
  const videoTkhd = buildTkhd(1, width, height, duration);
  const videoMdhd = buildMdhd(timescale, duration);
  const videoHdlr = buildHdlr('vide');
  const videoMdia = buildMdia(timescale, duration, 'vide', new Uint8Array([1]), videoChunks.length, videoSizes);
  const videoTrak = box(
    'trak',
    new Uint8Array([...videoTkhd, ...videoMdhd, ...videoHdlr, ...videoMdia]),
  );

  const audioTkhd = buildTkhd(2, width, height, duration);
  const audioMdhd = buildMdhd(timescale, duration);
  const audioHdlr = buildHdlr('soun');
  const audioMdia = buildMdia(timescale, duration, 'soun', new Uint8Array(), audioChunks.length, audioChunks.map(c => c.byteLength));
  const audioTrak = box(
    'trak',
    new Uint8Array([...audioTkhd, ...audioMdhd, ...audioHdlr, ...audioMdia]),
  );

  const moovPayload = new Uint8Array(mvhd.length + videoTrak.length + audioTrak.length);
  let o = 0;
  moovPayload.set(mvhd, o); o += mvhd.length;
  moovPayload.set(videoTrak, o); o += videoTrak.length;
  moovPayload.set(audioTrak, o);
  const moov = box('moov', moovPayload);

  const allChunks = [...videoChunks, ...audioChunks];
  const mdatPayload = new Uint8Array(
    allChunks.reduce((n, c) => n + c.byteLength, 0),
  );
  let mdatOff = 0;
  for (const chunk of allChunks) {
    mdatPayload.set(chunk.data, mdatOff);
    mdatOff += chunk.byteLength;
  }
  const mdat = box('mdat', mdatPayload);

  const topLevel = new Uint8Array(ftyp.length + moov.length + mdat.length);
  let tOff = 0;
  topLevel.set(ftyp, tOff); tOff += ftyp.length;
  topLevel.set(moov, tOff); tOff += moov.length;
  topLevel.set(mdat, tOff);

  return topLevel;
}
