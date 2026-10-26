import { describe, expect, it } from 'vitest';
import {
  CAPTION_SAFE_AREA_PRESETS,
  getCaptionSafeArea,
  resolveCaptionLayout,
} from '../src/safe-area';
import type { CaptionCue } from '../src/index';

const cue = (settings: { position?: 'top' | 'center' | 'bottom'; alignment?: 'start' | 'center' | 'end' } = {}): CaptionCue => ({
  id: 'cue-0',
  startTime: 0,
  endTime: 1,
  text: 'Hello world',
  settings,
});

describe('CAPTION_SAFE_AREA_PRESETS [BF-460 safe-area positioning]', () => {
  it('covers 9:16, 16:9 and 1:1 with 10% title-safe / 5% action-safe margins', () => {
    for (const aspect of ['9:16', '16:9', '1:1'] as const) {
      const preset = CAPTION_SAFE_AREA_PRESETS[aspect];
      expect(preset.titleSafe).toEqual({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
      expect(preset.actionSafe).toEqual({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
    }
  });

  it('getCaptionSafeArea returns the preset and throws for unknown aspect', () => {
    expect(getCaptionSafeArea('9:16').aspect).toBe('9:16');
    expect(() => getCaptionSafeArea('4:3' as never)).toThrow();
  });
});

describe('resolveCaptionLayout [BF-460 safe-area positioning]', () => {
  const W = 1080;
  const H = 1920; // 9:16

  it('bottom captions end at the title-safe bottom edge by default', () => {
    const layout = resolveCaptionLayout(cue(), '9:16', W, H);
    expect(layout.maxWidth).toBeCloseTo(0.8 * W);
    expect(layout.maxHeight).toBeCloseTo(0.8 * H);
    // Bottom-aligned: box bottom == title-safe bottom
    expect(layout.y + layout.maxHeight).toBeCloseTo(0.9 * H);
  });

  it('top captions start at the title-safe top edge', () => {
    const layout = resolveCaptionLayout(cue({ position: 'top' }), '9:16', W, H);
    expect(layout.y).toBeCloseTo(0.1 * H);
  });

  it('center captions are centered within the title-safe area', () => {
    const layout = resolveCaptionLayout(cue({ position: 'center' }), '9:16', W, H);
    expect(layout.y + layout.maxHeight / 2).toBeCloseTo(H / 2);
  });

  it('alignment drives the horizontal anchor', () => {
    expect(resolveCaptionLayout(cue({ alignment: 'center' }), '1:1', 1000, 1000).x).toBeCloseTo(500);
    expect(resolveCaptionLayout(cue({ alignment: 'start' }), '1:1', 1000, 1000).x).toBeCloseTo(100);
    expect(resolveCaptionLayout(cue({ alignment: 'end' }), '1:1', 1000, 1000).x).toBeCloseTo(900);
  });

  it('layout stays deterministic for identical inputs', () => {
    expect(resolveCaptionLayout(cue(), '16:9', 1920, 1080)).toEqual(
      resolveCaptionLayout(cue(), '16:9', 1920, 1080),
    );
  });
});
