import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { FC } from 'react';
import { CompositionMarkersProvider, useMarker } from '../../src/runtime';

const MarkerProbe: FC<{ name: string }> = ({ name }) => {
  const frame = useMarker(name);
  return <>{`marker:${name}=${frame === null ? 'null' : frame}`}</>;
};

describe('useMarker (BF-401)', () => {
  it('resolves a named marker from the composition markers to its frame', () => {
    const html = renderToString(
      <CompositionMarkersProvider markers={{ drop: 45, outro: 120 }}>
        <MarkerProbe name="drop" />
      </CompositionMarkersProvider>,
    );
    expect(html).toContain('marker:drop=45');
  });

  it('returns null for an unknown marker name', () => {
    const html = renderToString(
      <CompositionMarkersProvider markers={{ drop: 45 }}>
        <MarkerProbe name="missing" />
      </CompositionMarkersProvider>,
    );
    expect(html).toContain('marker:missing=null');
  });

  it('returns null outside a provider (no markers in scope)', () => {
    const html = renderToString(<MarkerProbe name="drop" />);
    expect(html).toContain('marker:drop=null');
  });
});
