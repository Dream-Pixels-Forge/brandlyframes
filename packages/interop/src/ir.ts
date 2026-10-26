/**
 * BrandlyFrames composition IR (BF-230/231).
 *
 * The frame-based timeline description every interop direction works with:
 * HyperFrames HTML imports into it (BF-230) and the OTIO / CMX3600 EDL /
 * FCP XML exporters serialize it (BF-231). Self-contained in this package —
 * deliberately not coupled to `brandlyframes` core so import/export can run
 * in any Node or browser context.
 */

/**
 * The kind of a timeline clip. `sequence` marks container-style layers
 * (BrandlyFrames `<Sequence>` placeholders, HyperFrames generic clips).
 */
export type TimelineClipKind = 'video' | 'audio' | 'image' | 'text' | 'sequence';

/** A named point on the composition timeline. */
export interface TimelineMarker {
  /** Marker name. */
  name: string;
  /** Absolute frame on the composition timeline. */
  frame: number;
}

/** A single clip (layer instance) on the composition timeline. */
export interface TimelineClip {
  /** Display name of the clip. */
  name: string;
  /** Clip kind; drives video/audio routing in the NLE exporters. */
  kind: TimelineClipKind;
  /** 0-based index into {@link CompositionIR.tracks}. */
  track: number;
  /** Absolute start frame on the composition timeline. */
  startFrame: number;
  /** Clip length in frames. */
  durationInFrames: number;
  /** Media file path or URL, or null for synthetic clips. */
  mediaReference: string | null;
}

/** A named timeline track (a clip routing lane). */
export interface TimelineTrack {
  /** Display name of the track. */
  name: string;
}

/**
 * The intermediate representation of a BrandlyFrames composition timeline:
 * geometry, frame rate, duration, named tracks, clips and markers.
 */
export interface CompositionIR {
  /** Stable composition identifier. */
  id: string;
  /** Human-readable composition name. */
  name: string;
  /** Composition width in pixels. */
  width: number;
  /** Composition height in pixels. */
  height: number;
  /** Frames per second (integer for most targets; EDL export requires an integer). */
  fps: number;
  /** Total composition duration in frames. */
  durationInFrames: number;
  /** Named tracks; clips reference them by index. */
  tracks: TimelineTrack[];
  /** Timeline clips in timeline order. */
  clips: TimelineClip[];
  /** Composition-level markers. */
  markers: TimelineMarker[];
}

/**
 * Validates the invariants every exporter relies on. Throws a descriptive
 * `Error` on the first violation; returns silently when the IR is well-formed.
 */
export function validateComposition(ir: CompositionIR): void {
  if (!(ir.fps > 0)) {
    throw new Error(`Composition fps must be positive, got ${ir.fps}.`);
  }
  for (const clip of ir.clips) {
    if (!(clip.startFrame >= 0)) {
      throw new Error(
        `Clip "${clip.name}" must have a non-negative startFrame, got ${clip.startFrame}.`,
      );
    }
    if (!(clip.durationInFrames > 0)) {
      throw new Error(
        `Clip "${clip.name}" must have a positive durationInFrames, got ${clip.durationInFrames}.`,
      );
    }
    if (!(clip.track >= 0) || clip.track >= ir.tracks.length) {
      throw new Error(
        `Clip "${clip.name}" references unknown track ${clip.track} (composition has ${ir.tracks.length} tracks).`,
      );
    }
  }
  for (const marker of ir.markers) {
    if (!(marker.frame >= 0)) {
      throw new Error(
        `Marker "${marker.name}" must have a non-negative frame, got ${marker.frame}.`,
      );
    }
  }
}
