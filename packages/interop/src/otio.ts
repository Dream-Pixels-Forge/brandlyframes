/**
 * BF-231: OpenTimelineIO JSON export and round-trip parse.
 *
 * Emits OTIO_JSON (Timeline.1 / Stack.1 / Track.1 / Clip.1 / Gap.1 /
 * Marker.1 / ExternalReference.1 schemas) built from the public OTIO
 * interchange schema — original code, no OTIO source used. Timeline
 * positions are represented the OTIO way: sequential items with Gap
 * fillers. BrandlyFrames-specific fields (composition id/geometry/duration,
 * per-clip kind) ride in `metadata.brandlyframes` so the round trip of our
 * own exports is lossless.
 *
 * Parse (`parseOtio`) is round-trip-grade: it reads back what `exportOtio`
 * writes. Foreign OTIO documents with transitions, effects or nested
 * stacks are outside this contract.
 */

import { validateComposition } from './ir.js';
import type { CompositionIR, TimelineClip, TimelineClipKind, TimelineTrack } from './ir.js';

// ---------------------------------------------------------------------------
// OTIO JSON writer types
// ---------------------------------------------------------------------------

interface OtioRationalTime {
  OTIO_SCHEMA: 'RationalTime.1';
  rate: number;
  value: number;
}

interface OtioTimeRange {
  OTIO_SCHEMA: 'TimeRange.1';
  start_time: OtioRationalTime;
  duration: OtioRationalTime;
}

interface OtioMarker {
  OTIO_SCHEMA: 'Marker.1';
  name: string;
  marked_range: OtioTimeRange;
  metadata: Record<string, unknown>;
}

interface OtioExternalReference {
  OTIO_SCHEMA: 'ExternalReference.1';
  name: string;
  target_url: string;
  available_range: OtioTimeRange;
  metadata: Record<string, unknown>;
}

interface OtioItemBase {
  name: string;
  source_range: OtioTimeRange;
  effects: unknown[];
  markers: OtioMarker[];
  metadata: Record<string, unknown>;
}

interface OtioGap extends OtioItemBase {
  OTIO_SCHEMA: 'Gap.1';
}

interface OtioClip extends OtioItemBase {
  OTIO_SCHEMA: 'Clip.1';
  media_reference: OtioExternalReference | null;
}

type OtioTimelineItem = OtioClip | OtioGap;

interface OtioTrack {
  OTIO_SCHEMA: 'Track.1';
  name: string;
  kind: 'Video' | 'Audio';
  children: OtioTimelineItem[];
  effects: unknown[];
  markers: OtioMarker[];
  metadata: Record<string, unknown>;
  source_range: null;
}

interface OtioStack {
  OTIO_SCHEMA: 'Stack.1';
  name: string;
  children: OtioTrack[];
  effects: unknown[];
  markers: OtioMarker[];
  metadata: Record<string, unknown>;
  source_range: null;
}

interface OtioTimeline {
  OTIO_SCHEMA: 'Timeline.1';
  name: string;
  global_start_time: OtioRationalTime;
  tracks: OtioStack;
  metadata: Record<string, unknown>;
}

const rational = (rate: number, value: number): OtioRationalTime => ({
  OTIO_SCHEMA: 'RationalTime.1',
  rate,
  value,
});

const timeRange = (rate: number, start: number, duration: number): OtioTimeRange => ({
  OTIO_SCHEMA: 'TimeRange.1',
  start_time: rational(rate, start),
  duration: rational(rate, duration),
});

const trackKind = (clips: TimelineClip[]): 'Video' | 'Audio' =>
  clips.length > 0 && clips.every((c) => c.kind === 'audio') ? 'Audio' : 'Video';

/**
 * Serializes a composition timeline as OTIO_JSON (pretty-printed).
 * Throws on compositions violating the IR invariants (see validateComposition).
 */
export function exportOtio(ir: CompositionIR): string {
  validateComposition(ir);

  const clipsByTrack = new Map<number, TimelineClip[]>();
  for (const clip of ir.clips) {
    const list = clipsByTrack.get(clip.track) ?? [];
    list.push(clip);
    clipsByTrack.set(clip.track, list);
  }

  const otioTracks: OtioTrack[] = ir.tracks.map((track: TimelineTrack, index) => {
    const clips = [...(clipsByTrack.get(index) ?? [])].sort((a, b) => a.startFrame - b.startFrame);
    const children: OtioTimelineItem[] = [];
    let cursor = 0;
    for (const clip of clips) {
      if (clip.startFrame > cursor) {
        // Gap filler makes the timeline position explicit for OTIO readers.
        children.push({
          OTIO_SCHEMA: 'Gap.1',
          name: 'Gap',
          source_range: timeRange(ir.fps, 0, clip.startFrame - cursor),
          effects: [],
          markers: [],
          metadata: {},
        });
      }
      children.push({
        OTIO_SCHEMA: 'Clip.1',
        name: clip.name,
        source_range: timeRange(ir.fps, 0, clip.durationInFrames),
        media_reference: clip.mediaReference
          ? {
              OTIO_SCHEMA: 'ExternalReference.1',
              name: clip.name,
              target_url: clip.mediaReference,
              available_range: timeRange(ir.fps, 0, clip.durationInFrames),
              metadata: {},
            }
          : null,
        effects: [],
        markers: [],
        metadata: { brandlyframes: { kind: clip.kind } },
      });
      cursor = clip.startFrame + clip.durationInFrames;
    }
    return {
      OTIO_SCHEMA: 'Track.1',
      name: track.name,
      kind: trackKind(clips),
      children,
      effects: [],
      markers: [],
      metadata: {},
      source_range: null,
    };
  });

  const timeline: OtioTimeline = {
    OTIO_SCHEMA: 'Timeline.1',
    name: ir.name,
    global_start_time: rational(ir.fps, 0),
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      name: 'tracks',
      children: otioTracks,
      effects: [],
      markers: ir.markers.map((marker) => ({
        OTIO_SCHEMA: 'Marker.1',
        name: marker.name,
        marked_range: timeRange(ir.fps, marker.frame, 0),
        metadata: {},
      })),
      metadata: {},
      source_range: null,
    },
    metadata: {
      brandlyframes: {
        id: ir.id,
        width: ir.width,
        height: ir.height,
        durationInFrames: ir.durationInFrames,
      },
    },
  };

  return `${JSON.stringify(timeline, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// OTIO JSON reader (round-trip grade)
// ---------------------------------------------------------------------------

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const str = (rec: Record<string, unknown>, key: string): string | null =>
  typeof rec[key] === 'string' ? (rec[key] as string) : null;

const num = (rec: Record<string, unknown>, key: string): number | null =>
  typeof rec[key] === 'number' && Number.isFinite(rec[key]) ? (rec[key] as number) : null;

/**
 * Parses OTIO_JSON written by {@link exportOtio} back into composition IR.
 * Throws a descriptive Error for malformed JSON or non-timeline documents.
 */
export function parseOtio(json: string): CompositionIR {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid OTIO JSON: ${(error as Error).message}`, { cause: error });
  }
  const root = asRecord(value);
  const schema = str(root, 'OTIO_SCHEMA');
  if (!schema || !schema.startsWith('Timeline')) {
    throw new Error('Not an OpenTimelineIO timeline: expected an OTIO Timeline document.');
  }

  const meta = asRecord(root['metadata']);
  const bf = asRecord(meta['brandlyframes']);

  const globalStart = asRecord(root['global_start_time']);
  const fps = num(globalStart, 'rate') ?? 30;
  const name = str(root, 'name') ?? 'OTIO Import';
  const id = str(bf, 'id') ?? 'otio-import';
  const width = num(bf, 'width') ?? 1920;
  const height = num(bf, 'height') ?? 1080;

  const tracksRec = asRecord(root['tracks']);
  const markers: CompositionIR['markers'] = [];
  const rawMarkers = Array.isArray(tracksRec['markers']) ? tracksRec['markers'] : [];
  for (const raw of rawMarkers) {
    const marker = asRecord(raw);
    const markerName = str(marker, 'name');
    const marked = asRecord(marker['marked_range']);
    const startTime = asRecord(marked['start_time']);
    const frame = num(startTime, 'value');
    if (markerName && frame !== null && frame >= 0) {
      markers.push({ name: markerName, frame });
    }
  }

  const tracks: CompositionIR['tracks'] = [];
  const clips: TimelineClip[] = [];
  const rawTracks = Array.isArray(tracksRec['children']) ? tracksRec['children'] : [];
  rawTracks.forEach((rawTrack, trackIndex) => {
    const track = asRecord(rawTrack);
    const trackName = str(track, 'name') ?? `Track ${trackIndex + 1}`;
    tracks.push({ name: trackName });
    const otioKind = str(track, 'kind');
    let cursor = 0;
    const items = Array.isArray(track['children']) ? track['children'] : [];
    for (const rawItem of items) {
      const item = asRecord(rawItem);
      const itemSchema = str(item, 'OTIO_SCHEMA') ?? '';
      const sourceRange = asRecord(item['source_range']);
      const durationRec = asRecord(sourceRange['duration']);
      const duration = num(durationRec, 'value') ?? 0;
      if (itemSchema.startsWith('Gap')) {
        cursor += duration;
        continue;
      }
      if (!itemSchema.startsWith('Clip')) continue;
      const itemMeta = asRecord(item['metadata']);
      const itemBf = asRecord(itemMeta['brandlyframes']);
      const mediaReferenceRec = asRecord(item['media_reference']);
      const targetUrl = str(mediaReferenceRec, 'target_url');
      const kind: TimelineClipKind =
        str(itemBf, 'kind') !== null && str(itemBf, 'kind') !== undefined
          ? (str(itemBf, 'kind') as TimelineClipKind)
          : otioKind === 'Audio'
            ? 'audio'
            : 'video';
      const clipName = str(item, 'name') ?? `Clip ${clips.length + 1}`;
      if (duration > 0) {
        clips.push({
          name: clipName,
          kind,
          track: trackIndex,
          startFrame: cursor,
          durationInFrames: duration,
          mediaReference: targetUrl,
        });
      }
      cursor += duration;
    }
  });

  const durationInFrames =
    num(bf, 'durationInFrames') ??
    clips.reduce((max, c) => Math.max(max, c.startFrame + c.durationInFrames), 0);

  return {
    id,
    name,
    width,
    height,
    fps,
    durationInFrames,
    tracks,
    clips,
    markers,
  };
}
