import type { CompositionIR } from '../src/index.js';

/**
 * Shared factory for round-trip test compositions. Produces a canonical,
 * already-valid IR (see validateComposition) that every exporter accepts.
 */
export function makeComposition(overrides: Partial<CompositionIR> = {}): CompositionIR {
  return {
    id: 'comp-1',
    name: 'Test Composition',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 90,
    tracks: [{ name: 'Track 1' }],
    clips: [
      {
        name: 'Clip A',
        kind: 'video',
        track: 0,
        startFrame: 0,
        durationInFrames: 45,
        mediaReference: 'assets/a.mp4',
      },
      {
        name: 'Clip B',
        kind: 'video',
        track: 0,
        startFrame: 45,
        durationInFrames: 45,
        mediaReference: null,
      },
    ],
    markers: [{ name: 'start', frame: 0 }],
    ...overrides,
  };
}
