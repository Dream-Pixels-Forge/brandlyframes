/**
 * BF-231: CMX3600 EDL export and round-trip parse.
 *
 * Emits classic CMX3600 text: TITLE / FCM headers, numbered cut events with
 * V (video) / A (audio) channel letters, source and record timecodes at the
 * composition frame rate, and `* FROM CLIP NAME:` comments.
 *
 * CMX3600 is a lossy target by design; the lossy fields are:
 * - markers (not representable) are dropped,
 * - media references (not representable) are dropped,
 * - track names become the conventional V1/A1,
 * - non-audio sub-kinds (image/text/sequence) all parse back as "video",
 * - the frame rate is not carried: `parseEdl` defaults to 30 fps and accepts
 *   an explicit rate for non-30 timelines,
 * - drop-frame timecode (never emitted here) is read back as non-drop.
 *
 * `parseEdl` is round-trip-grade for our own exports and tolerant of
 * malformed input (unknown lines are skipped, never thrown).
 */

import { validateComposition } from './ir.js';
import type { CompositionIR, TimelineClip, TimelineClipKind } from './ir.js';

/** Formats a frame index as HH:MM:SS:FF timecode at the given integer fps. */
function framesToTimecode(frames: number, fps: number): string {
  const pad2 = (v: number): string => String(v).padStart(2, '0');
  const f = ((frames % fps) + fps) % fps;
  const totalSeconds = Math.floor(frames / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}:${pad2(f)}`;
}

/** Parses HH:MM:SS:FF timecode into a frame index at the given fps. */
function timecodeToFrames(tc: string, fps: number): number {
  const parts = tc.split(':').map((p) => parseInt(p, 10));
  const [h = 0, m = 0, s = 0, f = 0] = parts;
  return h * 3600 * fps + m * 60 * fps + s * fps + f;
}

/**
 * Serializes a composition timeline as a CMX3600 EDL. Events are ordered
 * chronologically (record start, then track). Throws on IR violations and
 * on non-integer frame rates (timecode math requires integer fps).
 */
export function exportEdl(ir: CompositionIR): string {
  validateComposition(ir);
  if (!Number.isInteger(ir.fps)) {
    throw new Error(`EDL export requires an integer fps, got ${ir.fps}.`);
  }

  const events = [...ir.clips].sort((a, b) => a.startFrame - b.startFrame || a.track - b.track);

  const lines: string[] = [`TITLE: ${ir.name}`, 'FCM: NON-DROP FRAME', ''];
  events.forEach((clip, index) => {
    const number = String(index + 1).padStart(3, '0');
    const channel = clip.kind === 'audio' ? 'A' : 'V';
    const sourceIn = 0;
    const sourceOut = clip.durationInFrames - 1;
    const recordIn = clip.startFrame;
    const recordOut = clip.startFrame + clip.durationInFrames - 1;
    lines.push(
      `${number}  ${channel}     C        ${framesToTimecode(sourceIn, ir.fps)} ${framesToTimecode(
        sourceOut,
        ir.fps,
      )} ${framesToTimecode(recordIn, ir.fps)} ${framesToTimecode(recordOut, ir.fps)}`,
    );
    lines.push(`* FROM CLIP NAME: ${clip.name}`);
  });

  return `${lines.join('\n')}\n`;
}

const EVENT_PATTERN =
  /^(\d+)\s+([VA])\s+C\s+(\d{1,2}:\d{2}:\d{2}:\d{2})\s+(\d{1,2}:\d{2}:\d{2}:\d{2})\s+(\d{1,2}:\d{2}:\d{2}:\d{2})\s+(\d{1,2}:\d{2}:\d{2}:\d{2})/;

/**
 * Parses a CMX3600 EDL into composition IR. `fps` sets the timecode rate —
 * EDLs do not carry a frame rate, so pass the known rate for non-30 fps
 * timelines. Malformed input never throws: unparseable lines are skipped.
 */
export function parseEdl(edl: string, fps = 30): CompositionIR {
  interface RawEvent {
    number: string;
    channel: 'V' | 'A';
    recordIn: number;
    recordOut: number;
    name: string | null;
  }

  const titleMatch = /^TITLE:\s*(.*)$/m.exec(edl);
  const name = titleMatch?.[1]?.trim() || 'EDL Import';

  const events: RawEvent[] = [];
  for (const line of edl.split(/\r?\n/)) {
    const eventMatch = EVENT_PATTERN.exec(line);
    if (eventMatch) {
      // shortcut: drop-frame EDLs (FCM: DROP FRAME / semicolon timecodes)
      // are read back as non-drop; we never emit drop-frame.
      events.push({
        number: eventMatch[1],
        channel: eventMatch[2] === 'A' ? 'A' : 'V',
        recordIn: timecodeToFrames(eventMatch[5], fps),
        recordOut: timecodeToFrames(eventMatch[6], fps),
        name: null,
      });
      continue;
    }
    const nameComment = /^\*\s*FROM CLIP NAME:\s*(.*)$/.exec(line);
    if (nameComment && events.length > 0) {
      events[events.length - 1].name = nameComment[1].trim();
    }
  }

  const clips: TimelineClip[] = events.map((event) => {
    const duration = event.recordOut - event.recordIn + 1;
    const kind: TimelineClipKind = event.channel === 'A' ? 'audio' : 'video';
    const clip: TimelineClip = {
      name: event.name ?? `Event ${event.number}`,
      kind,
      track: 0,
      startFrame: event.recordIn,
      // clamp degenerate record ranges to 1 frame (tolerant of malformed EDLs)
      durationInFrames: duration > 0 ? duration : 1,
      mediaReference: null,
    };
    return clip;
  });

  const videoCount = events.filter((e) => e.channel === 'V').length;
  const audioCount = events.length - videoCount;
  const tracks: CompositionIR['tracks'] = [];
  if (videoCount > 0) tracks.push({ name: 'V1' });
  if (audioCount > 0) tracks.push({ name: 'A1' });
  clips.forEach((clip) => {
    if (clip.kind === 'audio') clip.track = videoCount > 0 ? 1 : 0;
  });
  if (tracks.length === 0) tracks.push({ name: 'V1' });

  const durationInFrames = clips.reduce(
    (max, c) => Math.max(max, c.startFrame + c.durationInFrames),
    0,
  );

  const composition: CompositionIR = {
    id: 'edl-import',
    name,
    width: 1920,
    height: 1080,
    fps,
    durationInFrames,
    tracks,
    clips,
    markers: [],
  };
  return composition;
}
