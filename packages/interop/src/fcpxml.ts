/**
 * BF-231: FCP XML (xmeml v4) export and round-trip parse.
 *
 * Emits FCP7-style xmeml v4 (`<xmeml version="4">`), the interchange flavor
 * Premiere Pro and DaVinci Resolve both import: a `<sequence>` with
 * `<clipitem>` in/out (source) and start/end (timeline) frame points,
 * `<file>`/`<pathurl>` media references, and sequence-level `<marker>`
 * elements.
 *
 * Lossy fields (documented in the package README):
 * - track names are not representable in xmeml tracks; parse produces
 *   "Track N" names (video tracks first, then audio),
 * - non-audio sub-kinds (image/text/sequence) parse back as "video",
 * - non-integer frame rates round to an integer timebase,
 * - empty IR tracks vanish (xmeml has no empty-track representation).
 *
 * `parseFcpXml` is round-trip-grade for our own exports; it throws only when
 * the document lacks an `<xmeml>` root.
 */

import { decodeEntities } from './entities.js';
import { validateComposition } from './ir.js';
import type { CompositionIR, TimelineClip } from './ir.js';

const escText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escAttr = (value: string): string => escText(value).replace(/"/g, '&quot;');

/** Relative paths become file://localhost URLs; absolute URLs pass through. */
function toPathUrl(reference: string): string {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(reference) ? reference : `file://localhost/${reference}`;
}

/** Inverse of {@link toPathUrl} for our own exports. */
function fromPathUrl(url: string): string {
  return url.startsWith('file://localhost/') ? url.slice('file://localhost/'.length) : url;
}

function clipItemXml(clip: TimelineClip, index: number, timebase: number): string {
  const mediaTag = clip.kind === 'audio' ? '<audio/>' : '<video/>';
  const file = clip.mediaReference
    ? `      <file id="file-${index + 1}">\n` +
      `       <name>${escText(clip.mediaReference)}</name>\n` +
      `       <pathurl>${escText(toPathUrl(clip.mediaReference))}</pathurl>\n` +
      `       <rate><timebase>${timebase}</timebase><ntsc>FALSE</ntsc></rate>\n` +
      `       <media>${mediaTag}</media>\n` +
      `      </file>\n`
    : '';
  return (
    `     <clipitem id="clip-${index + 1}">\n` +
    `      <name>${escText(clip.name)}</name>\n` +
    `      <duration>${clip.durationInFrames}</duration>\n` +
    `      <rate><timebase>${timebase}</timebase><ntsc>FALSE</ntsc></rate>\n` +
    `      <in>0</in>\n` +
    `      <out>${clip.durationInFrames}</out>\n` +
    `      <start>${clip.startFrame}</start>\n` +
    `      <end>${clip.startFrame + clip.durationInFrames}</end>\n` +
    file +
    `     </clipitem>\n`
  );
}

/**
 * Serializes a composition timeline as FCP XML (xmeml v4). Non-audio clips
 * are grouped into `<video>` tracks by their IR track index; audio clips go
 * to `<audio>` tracks. Throws on IR violations (see validateComposition).
 */
export function exportFcpXml(ir: CompositionIR): string {
  validateComposition(ir);
  const timebase = Math.max(1, Math.round(ir.fps));

  const videoTracks = [
    ...new Set(ir.clips.filter((c) => c.kind !== 'audio').map((c) => c.track)),
  ].sort((a, b) => a - b);
  const audioTracks = [
    ...new Set(ir.clips.filter((c) => c.kind === 'audio').map((c) => c.track)),
  ].sort((a, b) => a - b);

  let clipCounter = 0;
  const nextClipItem = (clip: TimelineClip): string => clipItemXml(clip, clipCounter++, timebase);

  const trackXml = (trackIndex: number, predicate: (c: TimelineClip) => boolean): string => {
    const items = ir.clips
      .filter((c) => predicate(c) && c.track === trackIndex)
      .sort((a, b) => a.startFrame - b.startFrame);
    return `      <track>\n${items.map(nextClipItem).join('')}</track>\n`;
  };

  const markersXml = ir.markers
    .map(
      (marker) =>
        `   <marker>\n` +
        `    <comment></comment>\n` +
        `    <name>${escText(marker.name)}</name>\n` +
        `    <in>${marker.frame}</in>\n` +
        `    <out>-1</out>\n` +
        `   </marker>\n`,
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE xmeml>\n` +
    `<xmeml version="4">\n` +
    ` <sequence id="${escAttr(ir.id)}">\n` +
    `  <name>${escText(ir.name)}</name>\n` +
    `  <duration>${ir.durationInFrames}</duration>\n` +
    `  <rate><timebase>${timebase}</timebase><ntsc>FALSE</ntsc></rate>\n` +
    `  <media>\n` +
    `   <video>\n` +
    `    <format>\n` +
    `     <samplecharacteristics>\n` +
    `      <width>${ir.width}</width>\n` +
    `      <height>${ir.height}</height>\n` +
    `      <rate><timebase>${timebase}</timebase><ntsc>FALSE</ntsc></rate>\n` +
    `     </samplecharacteristics>\n` +
    `    </format>\n` +
    videoTracks.map((t) => trackXml(t, (c) => c.kind !== 'audio')).join('') +
    `   </video>\n` +
    `   <audio>\n` +
    audioTracks.map((t) => trackXml(t, (c) => c.kind === 'audio')).join('') +
    `   </audio>\n` +
    `  </media>\n` +
    markersXml +
    ` </sequence>\n` +
    `</xmeml>\n`
  );
}

// ---------------------------------------------------------------------------
// xmeml reader (round-trip grade)
// ---------------------------------------------------------------------------

const firstTag = (scope: string, tag: string): string | null => {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(scope);
  return match ? decodeEntities(match[1].trim()) : null;
};

const firstNumber = (scope: string, tag: string): number | null => {
  const match = new RegExp(`<${tag}>(-?\\d+)</${tag}>`, 'i').exec(scope);
  return match ? parseInt(match[1], 10) : null;
};

const matchAll = (scope: string, pattern: RegExp): string[] => {
  const results: string[] = [];
  for (const match of scope.matchAll(pattern)) {
    if (match[1] !== undefined) results.push(match[1]);
  }
  return results;
};

function parseClipItems(
  trackScope: string,
  kind: TimelineClipKindForXml,
  track: number,
): TimelineClip[] {
  const clips: TimelineClip[] = [];
  for (const item of matchAll(trackScope, /<clipitem[^>]*>([\s\S]*?)<\/clipitem>/gi)) {
    const name = firstTag(item, 'name') ?? `Clip ${clips.length + 1}`;
    const inPoint = firstNumber(item, 'in') ?? 0;
    const outPoint = firstNumber(item, 'out') ?? inPoint;
    const start = firstNumber(item, 'start') ?? 0;
    const duration = outPoint - inPoint;
    const pathurl = firstTag(item, 'pathurl');
    clips.push({
      name,
      kind: kind === 'audio' ? 'audio' : 'video',
      track,
      startFrame: Math.max(0, start),
      durationInFrames: duration > 0 ? duration : 1,
      mediaReference: pathurl ? fromPathUrl(pathurl) : null,
    });
  }
  return clips;
}

type TimelineClipKindForXml = 'video' | 'audio';

/**
 * Parses xmeml v4 written by {@link exportFcpXml} back into composition IR.
 * Throws a descriptive Error when the document has no `<xmeml>` root.
 */
export function parseFcpXml(xml: string): CompositionIR {
  if (!/<xmeml[\s>]/i.test(xml)) {
    throw new Error('Not an FCP XML document: missing <xmeml> root element.');
  }
  const sequenceMatch = /<sequence\b[^>]*>([\s\S]*?)<\/sequence>/i.exec(xml);
  if (!sequenceMatch) {
    throw new Error('Not an FCP XML document: no <sequence> element found.');
  }
  const sequence = sequenceMatch[1];

  const idMatch = /<sequence\b[^>]*\bid="([^"]*)"/i.exec(xml);
  const id = idMatch ? decodeEntities(idMatch[1]) : 'composition';
  const name = firstTag(sequence, 'name') ?? 'FCP XML Import';
  const timebase = firstNumber(sequence, 'timebase') ?? 30;
  const width = firstNumber(sequence, 'width') ?? 1920;
  const height = firstNumber(sequence, 'height') ?? 1080;

  // Sequence-level duration sits in the header before <media>; fall back to
  // the latest clip end when absent.
  const headerEnd = sequence.toLowerCase().indexOf('<media>');
  const header = headerEnd === -1 ? sequence : sequence.slice(0, headerEnd);
  let durationInFrames = firstNumber(header, 'duration') ?? 0;

  const videoSection = /<video>([\s\S]*?)<\/video>/i.exec(sequence)?.[1] ?? '';
  const audioSection = /<audio>([\s\S]*?)<\/audio>/i.exec(sequence)?.[1] ?? '';

  const clips: TimelineClip[] = [];
  const trackCount = { video: 0, audio: 0 };
  for (const trackScope of matchAll(videoSection, /<track>([\s\S]*?)<\/track>/gi)) {
    clips.push(...parseClipItems(trackScope, 'video', trackCount.video));
    trackCount.video++;
  }
  for (const trackScope of matchAll(audioSection, /<track>([\s\S]*?)<\/track>/gi)) {
    // audio track indices continue after the video tracks
    clips.push(...parseClipItems(trackScope, 'audio', trackCount.video + trackCount.audio));
    trackCount.audio++;
  }

  const tracks: CompositionIR['tracks'] = [];
  const totalTracks = trackCount.video + trackCount.audio;
  for (let i = 0; i < Math.max(1, totalTracks); i++) {
    tracks.push({ name: `Track ${i + 1}` });
  }

  const markers: CompositionIR['markers'] = [];
  for (const markerScope of matchAll(sequence, /<marker>([\s\S]*?)<\/marker>/gi)) {
    const markerName = firstTag(markerScope, 'name') ?? 'marker';
    const frame = firstNumber(markerScope, 'in') ?? -1;
    if (frame >= 0) markers.push({ name: markerName, frame });
  }

  if (durationInFrames === 0) {
    durationInFrames = clips.reduce(
      (max, c) => Math.max(max, c.startFrame + c.durationInFrames),
      0,
    );
  }

  return {
    id,
    name,
    width,
    height,
    fps: timebase,
    durationInFrames,
    tracks,
    clips,
    markers,
  };
}
