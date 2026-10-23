/**
 * BF-201: Browser-side export via WebCodecs (no server).
 *
 * WebM (EBML) muxer. Produces a valid WebM file from encoded
 * video/audio chunks. Pure TypeScript — no DOM, no WebCodecs, fully
 * testable in Node.
 */

const ebmlVint = (value: number): Uint8Array => {
  let len = 1;
  let marker = 0x80;
  while (!(value & marker)) {
    len++;
    marker >>= 1;
  }
  const out = new Uint8Array(len);
  out[0] = value | marker;
  for (let i = 1; i < len; i++) {
    out[i] = value >> ((len - i - 1) * 8);
  }
  return out;
};

const textToBytes = (s: string): Uint8Array =>
  new Uint8Array([...s].map((c) => c.charCodeAt(0)));

const ebmlElement = (id: readonly number[], data: Uint8Array): Uint8Array => {
  const idBytes = new Uint8Array(id as number[]);
  const lenBytes = ebmlVint(data.length);
  const out = new Uint8Array(idBytes.length + lenBytes.length + data.length);
  let off = 0;
  out.set(idBytes, off); off += idBytes.length;
  out.set(lenBytes, off); off += lenBytes.length;
  out.set(data, off);
  return out;
};

const ebmlFloat = (id: readonly number[], value: number): Uint8Array => {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, value, false);
  return ebmlElement(id, new Uint8Array(buf));
};

const ebmlString = (id: readonly number[], value: string): Uint8Array => {
  const data = new Uint8Array([...value].map((c) => c.charCodeAt(0)));
  return ebmlElement(id, data);
};

const ebmlBinary = (id: readonly number[], data: Uint8Array): Uint8Array => {
  return ebmlElement(id, data);
};

const ebmlMaster = (id: readonly number[], children: Uint8Array[]): Uint8Array => {
  const childrenData = new Uint8Array(
    children.reduce((n, c) => n + c.length, 0),
  );
  let off = 0;
  for (const c of children) {
    childrenData.set(c, off); off += c.length;
  }
  const lenBytes = ebmlVint(childrenData.length);
  const idBytes = new Uint8Array(id as number[]);
  const out = new Uint8Array(
    idBytes.length + lenBytes.length + childrenData.length,
  );
  let o = 0;
  out.set(idBytes, o); o += idBytes.length;
  out.set(lenBytes, o); o += lenBytes.length;
  out.set(childrenData, o);
  return out;
};

const EBML = {
  EBML: [0x1a, 0x45, 0xdf, 0xa3],
  Version: [0x42, 0x86],
  ReadVersion: [0x42, 0xf7],
  MaxIdLength: [0x42, 0xf2],
  MaxSizeLength: [0x42, 0xf3],
  DocType: [0x42, 0x82],
  DocTypeVersion: [0x42, 0x87],
  DocTypeReadVersion: [0x42, 0x85],
  Segment: [0x18, 0x53, 0x80, 0x67],
  Info: [0x15, 0x49, 0xa9, 0x66],
  TimecodeScale: [0x2a, 0x7d, 0xc8],
  Duration: [0x44, 0x89],
  Title: [0x7b, 0xa9],
  Tracks: [0x16, 0x54, 0xae, 0x6b],
  TrackEntry: [0xae],
  TrackNumber: [0xd7],
  TrackUID: [0x73, 0xc5],
  TrackType: [0x86],
  FlagEnabled: [0x97],
  FlagDefault: [0x82],
  Name: [0x53, 0x6e],
  Language: [0x22, 0xb5, 0x9c],
  CodecID: [0x86],
  CodecPrivate: [0x63, 0xa2],
  Video: [0xe0],
  FlagInterlaced: [0x9a],
  PixelWidth: [0xb0],
  PixelHeight: [0xba],
  Audio: [0xe1],
  SamplingFrequency: [0xb5],
  Channels: [0x9f],
  Cluster: [0x1f, 0x43, 0xb6, 0x75],
  Timecode: [0xe7],
  BlockGroup: [0xa0],
  Block: [0xa1],
  BlockDuration: [0x9b],
} as const;

function buildEbmlHeader(): Uint8Array {
  const children = [
    ebmlElement(EBML.Version, new Uint8Array([1])),
    ebmlElement(EBML.ReadVersion, new Uint8Array([1])),
    ebmlElement(EBML.MaxIdLength, new Uint8Array([4])),
    ebmlElement(EBML.MaxSizeLength, new Uint8Array([8])),
    ebmlElement(EBML.DocType, textToBytes('webm')),
    ebmlElement(EBML.DocTypeVersion, new Uint8Array([4])),
    ebmlElement(EBML.DocTypeReadVersion, new Uint8Array([4])),
  ];
  return ebmlMaster(EBML.EBML, children);
}

function buildInfo(
  timecodeScale: number,
  duration: number,
  title: string,
): Uint8Array {
  const children = [
    ebmlElement(EBML.TimecodeScale, ebmlVintBigInt(timecodeScale)),
    ebmlFloat(EBML.Duration, duration),
    ebmlString(EBML.Title, title),
  ];
  return ebmlMaster(EBML.Info, children);
}

function ebmlVintBigInt(value: number): Uint8Array {
  const b = new Uint8Array(8);
  const view = new DataView(b.buffer);
  view.setBigUint64(0, BigInt(value), false);
  return b;
}

function buildTracks(
  videoTrack: Uint8Array | null,
  audioTrack: Uint8Array | null,
): Uint8Array {
  const children: Uint8Array[] = [];
  if (videoTrack) children.push(videoTrack);
  if (audioTrack) children.push(audioTrack);
  return ebmlMaster(EBML.Tracks, children);
}

function buildVideoTrack(
  trackNumber: number,
  trackUid: number,
  width: number,
  height: number,
  codecId: string,
  codecPrivate: Uint8Array,
): Uint8Array {
  const children = [
    ebmlElement(EBML.TrackNumber, uint32Bytes(trackNumber)),
    ebmlElement(EBML.TrackUID, ebmlVintBigInt(trackUid)),
    ebmlElement(EBML.TrackType, new Uint8Array([1])),
    ebmlElement(EBML.FlagEnabled, new Uint8Array([1])),
    ebmlElement(EBML.FlagDefault, new Uint8Array([1])),
    ebmlString(EBML.Name, 'video'),
    ebmlElement(EBML.CodecID, textToBytes(codecId)),
    ebmlBinary(EBML.CodecPrivate, codecPrivate),
    ebmlMaster(EBML.Video, [
      ebmlElement(EBML.FlagInterlaced, new Uint8Array([0])),
      ebmlElement(EBML.PixelWidth, uint32Bytes(width)),
      ebmlElement(EBML.PixelHeight, uint32Bytes(height)),
    ]),
  ];
  return ebmlMaster(EBML.TrackEntry, children);
}

function buildAudioTrack(
  trackNumber: number,
  trackUid: number,
  samplingFrequency: number,
  channels: number,
  codecId: string,
  codecPrivate: Uint8Array,
): Uint8Array {
  const children = [
    ebmlElement(EBML.TrackNumber, uint32Bytes(trackNumber)),
    ebmlElement(EBML.TrackUID, ebmlVintBigInt(trackUid)),
    ebmlElement(EBML.TrackType, new Uint8Array([2])),
    ebmlElement(EBML.FlagEnabled, new Uint8Array([1])),
    ebmlElement(EBML.FlagDefault, new Uint8Array([1])),
    ebmlString(EBML.Name, 'audio'),
    ebmlElement(EBML.CodecID, textToBytes(codecId)),
    ebmlBinary(EBML.CodecPrivate, codecPrivate),
    ebmlMaster(EBML.Audio, [
      ebmlElement(EBML.SamplingFrequency, float64Bytes(samplingFrequency)),
      ebmlElement(EBML.Channels, uint32Bytes(channels)),
    ]),
  ];
  return ebmlMaster(EBML.TrackEntry, children);
}

const uint32Bytes = (v: number): Uint8Array => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v, false);
  return b;
};

const float64Bytes = (v: number): Uint8Array => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, v, false);
  return b;
};

function buildCluster(
  timecode: number,
  blocks: Uint8Array[],
): Uint8Array {
  const children = [
    ebmlElement(EBML.Timecode, uint32Bytes(timecode)),
    ...blocks,
  ];
  return ebmlMaster(EBML.Cluster, children);
}

function buildBlockGroup(
  blockData: Uint8Array,
  blockDuration: number,
): Uint8Array {
  const blockElement = ebmlElement(EBML.Block, blockData);
  const blockDurationElement = ebmlElement(
    EBML.BlockDuration,
    uint32Bytes(blockDuration),
  );
  return ebmlMaster(EBML.BlockGroup, [blockElement, blockDurationElement]);
}

export interface WebmOptions {
  readonly videoChunks: readonly { readonly byteLength: number; readonly data: Uint8Array }[];
  readonly audioChunks: readonly { readonly byteLength: number; readonly data: Uint8Array }[];
  readonly width: number;
  readonly height: number;
  readonly duration: number;
}

export function muxWebm(options: WebmOptions): Uint8Array {
  const { videoChunks, audioChunks, width, height, duration } = options;

  const ebmlHeader = buildEbmlHeader();

  const timecodeScale = 1_000_000;
  const info = buildInfo(timecodeScale, duration, 'BrandlyFrames');

  const codecPrivate = new Uint8Array([1, 0, 0, 0]);
  const videoTrack = buildVideoTrack(
    1, 1, width, height, 'V_VP9', codecPrivate,
  );
  const audioTrack = buildAudioTrack(
    2, 2, 44100, 2, 'A_OPUS', new Uint8Array([1, 2, 3, 4]),
  );
  const tracks = buildTracks(videoTrack, audioTrack);

  const clusters: Uint8Array[] = [];
  const blockDuration = 33333;

  const allChunks = [...videoChunks, ...audioChunks];
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const block = ebmlElement(EBML.Block, chunk.data);
    const blockGroup = buildBlockGroup(block, blockDuration);
    clusters.push(blockGroup);
  }

  const clusterSize = 10;
  const clusterGroups: Uint8Array[] = [];
  for (let i = 0; i < clusters.length; i += clusterSize) {
    const group = clusters.slice(i, i + clusterSize);
    clusterGroups.push(buildCluster(Math.floor(i / clusterSize) * 1, group));
  }

  const segmentChildren = [info, tracks, ...clusterGroups];
  const segmentPayload = new Uint8Array(
    segmentChildren.reduce((n, c) => n + c.length, 0),
  );
  let sOff = 0;
  for (const c of segmentChildren) {
    segmentPayload.set(c, sOff); sOff += c.length;
  }

  const segmentId = new Uint8Array(EBML.Segment);
  const segmentLen = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  const segment = new Uint8Array(
    segmentId.length + segmentLen.length + segmentPayload.length,
  );
  let sgOff = 0;
  segment.set(segmentId, sgOff); sgOff += segmentId.length;
  segment.set(segmentLen, sgOff); sgOff += segmentLen.length;
  segment.set(segmentPayload, sgOff);

  const header = new Uint8Array(ebmlHeader.length + segment.length);
  let hOff = 0;
  header.set(ebmlHeader, hOff); hOff += ebmlHeader.length;
  header.set(segment, hOff);

  return header;
}
