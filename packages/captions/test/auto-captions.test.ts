import { describe, expect, it } from 'vitest';
import { AutoCaptions } from '../src/auto-captions';
import { CAPTION_STYLE_PRESETS } from '../src/styles';
import type { CaptionCue } from '../src/index';

/** Word-level cue spanning 1s→3s at 30fps (frames 30→90) — BF-222. */
const wordCue: CaptionCue = {
  id: 'cue-0',
  startTime: 1,
  endTime: 3,
  text: 'Hello<00:00:01.500> big<00:00:02.000> world',
  settings: { position: 'bottom', alignment: 'center' },
};

const cues = [wordCue];

describe('<AutoCaptions> [BF-222 word-level captions]', () => {
  it('renders nothing before the first cue or after the last', () => {
    expect(AutoCaptions({ cues, frame: 0, fps: 30 })).toBeNull();
    expect(AutoCaptions({ cues, frame: 120, fps: 30 })).toBeNull();
  });

  it('renders the active cue text at the given frame', () => {
    const el = AutoCaptions({ cues, frame: 45, fps: 30 }); // t=1.5s
    expect(el).not.toBeNull();
    expect(el!.props.style.color).toBe(CAPTION_STYLE_PRESETS['cinema-black'].color);
  });

  it('exposes per-word karaoke state as data attributes', () => {
    const el = AutoCaptions({ cues, frame: 60, fps: 30 }); // t=2.0s
    const spans = el!.props.children as Array<Record<string, unknown>>;
    const states = spans.map((s) => s['data-state']);
    // words: Hello [1,1.5] done, big [1.5,2] done, world [2,3] active
    expect(states).toEqual(['done', 'done', 'active']);
    expect(spans.map((s) => s['data-word-index'])).toEqual([0, 1, 2]);
    expect(spans[2]['data-progress']).toBe(0);
  });

  it('highlights done/active words with the style highlight color', () => {
    const el = AutoCaptions({ cues, frame: 75, fps: 30 }); // t=2.5s, world halfway
    const spans = el!.props.children as Array<Record<string, unknown>>;
    const active = spans[2] as { props: { style: { color: string; opacity?: number } } };
    expect(active.props.style.color).toBe(CAPTION_STYLE_PRESETS['cinema-black'].highlightColor);
    expect(active.props.style.opacity).toBeCloseTo(0.5);
  });

  it('falls back to plain text when highlight is off', () => {
    const el = AutoCaptions({ cues, frame: 45, fps: 30, highlight: 'plain' });
    expect(typeof el!.props.children).toBe('string');
    expect(el!.props.children).toContain('Hello');
  });

  it('sets dir="rtl" for Arabic cue text', () => {
    const rtlCues: CaptionCue[] = [
      { id: 'c', startTime: 0, endTime: 1, text: 'مرحبا بالعالم' },
    ];
    const el = AutoCaptions({ cues: rtlCues, frame: 15, fps: 30 });
    expect(el!.props.dir).toBe('rtl');
  });

  it('positions bottom captions at the 9:16 title-safe bottom edge', () => {
    const el = AutoCaptions({ cues, frame: 45, fps: 30, aspect: '9:16', width: 1080, height: 1920 });
    const style = el!.props.style as { top: number; height: number };
    expect(style.top + style.height).toBeCloseTo(0.9 * 1920);
  });

  it('is deterministic — identical props produce identical elements', () => {
    expect(JSON.stringify(AutoCaptions({ cues, frame: 45, fps: 30 }))).toBe(
      JSON.stringify(AutoCaptions({ cues, frame: 45, fps: 30 })),
    );
  });

  it('honors a style override', () => {
    const el = AutoCaptions({ cues, frame: 45, fps: 30, style: { fontSize: 77 } });
    expect((el!.props.style as { fontSize: number }).fontSize).toBe(77);
  });

  it('uses simple equal-share timing when a cue has no word data', () => {
    const plainCues: CaptionCue[] = [
      { id: 'c', startTime: 0, endTime: 2, text: 'alpha beta gamma' },
    ];
    const el = AutoCaptions({ cues: plainCues, frame: 15, fps: 30 }); // t=0.5 = 25%
    const spans = el!.props.children as Array<Record<string, unknown>>;
    expect(spans.map((s) => s['data-state'])).toEqual(['done', 'active', 'pending']);
  });
});
