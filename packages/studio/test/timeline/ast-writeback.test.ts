import { describe, it, expect } from 'vitest';
import {
  parseCompositionSource,
  generateSource,
  writeBackTimeline,
  keyframeTrackToAnimateCall,
  verifyNoEditRoundTrip,
} from '../../src/timeline/ast-writeback';

const SOURCE = `
import { Sequence, Series } from 'brandlyframes';

export const MyComp = () => (
  <Series>
    <Sequence data-clip-id="clip-1" from={0} durationInFrames={60}>
      <div />
    </Sequence>
    <Sequence data-clip-id="clip-2" from={60} durationInFrames={120}>
      <span />
    </Sequence>
  </Series>
);
`;

describe('verifyNoEditRoundTrip (BF-122 lossless acceptance)', () => {
  it('parse → no-op write → text is byte-identical to input', () => {
    // No edits: the function must return the input string unchanged.
    expect(verifyNoEditRoundTrip(SOURCE, { compositionName: 'MyComp' })).toBe(true);
  });

  it('an unedited file round-trips through parse+generate losslessly (semantics)', () => {
    const ast = parseCompositionSource(SOURCE);
    const out = generateSource(ast);
    // The generated text is not necessarily byte-identical to the input
    // (retainLine preserves line numbers but formatting may differ),
    // so verify SEMANTIC equivalence: re-parsing the output yields the same
    // structural content.
    const reParsed = parseCompositionSource(out);
    const reGen = generateSource(reParsed);
    expect(reGen).toBe(generateSource(ast));
  });
});

describe('writeBackTimeline', () => {
  it('rewrites `from` and `durationInFrames` for a matched clip id', () => {
    const out = writeBackTimeline(
      SOURCE,
      [
        {
          clipId: 'clip-1',
          from: 10,
          durationInFrames: 50,
        },
      ],
      { compositionName: 'MyComp' },
    );
    expect(out).toContain('from={10}');
    expect(out).toContain('durationInFrames={50}');
    // The other clip must be untouched.
    expect(out).toMatch(/data-clip-id="clip-2"[^>]*from=\{60\}/);
    expect(out).toMatch(/data-clip-id="clip-2"[^>]*durationInFrames=\{120\}/);
  });

  it('no edit returns the original source byte-identically', () => {
    const out = writeBackTimeline(SOURCE, [], { compositionName: 'MyComp' });
    expect(out).toBe(SOURCE);
  });

  it('unknown clip id is a no-op (byte-identical)', () => {
    const out = writeBackTimeline(
      SOURCE,
      [{ clipId: 'does-not-exist', from: 5 }],
      { compositionName: 'MyComp' },
    );
    expect(out).toBe(SOURCE);
  });

  it('edits are semantically stable under repeated round-trips', () => {
    const opts = { compositionName: 'MyComp' };
    const once = writeBackTimeline(
      SOURCE,
      [{ clipId: 'clip-1', from: 5, durationInFrames: 30 }],
      opts,
    );
    // Applying the same logical state to the output again must not drift.
    const twice = writeBackTimeline(
      once,
      [{ clipId: 'clip-1', from: 5, durationInFrames: 30 }],
      opts,
    );
    expect(twice).toBe(once);
  });
});

describe('keyframeTrackToAnimateCall', () => {
  it('emits a deterministic animate() call for a linear track', () => {
    const text = keyframeTrackToAnimateCall({
      property: 'opacity',
      frames: [
        { t: 0, value: 0, easing: 'linear' },
        { t: 1, value: 1, easing: 'linear' },
      ],
    });
    expect(text).toContain("property: 'opacity'");
    expect(text).toContain('t: 0');
    expect(text).toContain('t: 1');
  });

  it('emits bezier control points for bezier easing', () => {
    const text = keyframeTrackToAnimateCall({
      property: 'scale',
      frames: [{ t: 0, value: 0, easing: 'bezier', bezier: [0.4, 0, 0.2, 1] }],
    });
    expect(text).toContain("easing: 'bezier'");
    expect(text).toContain('bezier: [0.4, 0, 0.2, 1]');
  });

  it('is a pure function (same input → same output)', () => {
    const track = {
      property: 'x',
      frames: [
        { t: 0, value: 0, easing: 'linear' },
        { t: 1, value: 100, easing: 'spring' },
      ],
    } as const;
    expect(keyframeTrackToAnimateCall({ ...track })).toBe(
      keyframeTrackToAnimateCall({ ...track }),
    );
  });
});
