import type { FC } from 'react';
import { useBeat } from '../../../src/hooks/use-audio-data';

/**
 * BF-132 demo clip: a circle that pulses exactly on detected beats.
 *
 * The visual size is `BASE_SIZE` at rest and `BASE_SIZE * (1 + beat.strength)`
 * while a beat is active — so the rendered size peaks on (or within ±1 frame
 * of) each detected beat. Rendered as a size string so the fixture is
 * testable in Node with injected synthetic audio (no network, no canvas).
 */
export const BASE_SIZE = 100;

export const BeatPulse: FC<{ src: string }> = ({ src }) => {
  const beat = useBeat(src);
  const size = BASE_SIZE * (beat ? 1 + beat.strength : 1);
  return <>{`size:${size.toFixed(2)}`}</>;
};
