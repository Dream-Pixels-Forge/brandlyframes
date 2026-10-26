/**
 * Word-level auto-caption component [BF-222].
 *
 * Framework-agnostic element factory: given cues + frame, returns a plain
 * element descriptor (dir, positioned style, per-word karaoke spans) that
 * hosts (React/Studio/Player) render as-is. Consumes word timings from cue
 * text when present, falling back to equal-share timing.
 */

import type { CaptionCue } from './index';
import { parseWordTimings } from './word-timings';
import { resolveCaptionStyle, type CaptionStyle, type CaptionStylePresetName } from './styles';
import { resolveCaptionLayout, type CaptionAspectRatio } from './safe-area';
import { detectTextDirection } from './i18n';

export interface AutoCaptionsProps {
  cues: CaptionCue[];
  /** Current frame; converted to seconds with `fps`. */
  frame: number;
  fps: number;
  /** Safe-area aspect preset (default '16:9'). */
  aspect?: CaptionAspectRatio;
  /** Frame width/height in px (defaults 1920×1080). */
  width?: number;
  height?: number;
  /** Style overrides merged over the resolved preset. */
  style?: Partial<CaptionStyle>;
  /** 'karaoke' (default) renders per-word spans; 'plain' the cue text. */
  highlight?: 'karaoke' | 'plain';
}

/** Inline style shape hosts receive — token colors plus resolved layout. */
export type CaptionsCssStyle = CaptionStyle & {
  top: number;
  left: number;
  maxWidth: number;
  height: number;
};

/** Per-word child: flat data-* attributes for hosts, styling under `props`.
 * Type alias (not interface) so hosts can treat spans as `Record<string, unknown>`. */
export type CaptionsWordSpan = {
  'data-state': 'done' | 'active' | 'pending';
  'data-word-index': number;
  'data-progress': number;
  props: { style: { color: string; opacity?: number } };
};

export interface CaptionsElement {
  type: 'div';
  key: string;
  props: {
    dir: 'ltr' | 'rtl';
    style: CaptionsCssStyle;
    children: string | CaptionsWordSpan[];
  };
}

/**
 * Equal-share timing when a cue carries no word data: leading words advance
 * at a steady rate and the last word holds until the cue ends, so a word
 * flips to done exactly when the next one activates.
 */
function equalShareKaraoke(cue: CaptionCue): NonNullable<ReturnType<typeof parseWordTimings>> {
  const words = cue.text.split(/\s+/).filter(Boolean);
  const share = (cue.endTime - cue.startTime) / (words.length + 1);
  return {
    words: words.map((word, index) => ({
      text: word,
      startTime: cue.startTime + index * share,
      endTime:
        index + 1 < words.length ? cue.startTime + (index + 1) * share : cue.endTime,
      confidence: 1,
    })),
  };
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Strip inline word-timing/styling tags for display and direction detection. */
const stripInlineTags = (text: string): string => text.replace(/<[^<>]*>/g, '');

/**
 * Render the caption active at `frame`, or `null` outside any cue.
 * Deterministic: identical props produce identical elements.
 */
export function AutoCaptions(props: AutoCaptionsProps): CaptionsElement | null {
  const { cues, frame, fps, highlight = 'karaoke' } = props;
  const time = frame / fps;
  const cue = cues.find((c) => time >= c.startTime && time < c.endTime);
  if (!cue) return null;

  const presetName: CaptionStylePresetName = 'cinema-black';
  const style = resolveCaptionStyle(presetName, props.style);
  const layout = resolveCaptionLayout(
    cue,
    props.aspect ?? '16:9',
    props.width ?? 1920,
    props.height ?? 1080,
  );
  const text = stripInlineTags(cue.text);

  const element: CaptionsElement = {
    type: 'div',
    key: cue.id,
    props: {
      dir: detectTextDirection(text),
      style: {
        ...style,
        top: layout.y,
        left: layout.x,
        maxWidth: layout.maxWidth,
        height: layout.maxHeight,
      },
      children: text,
    },
  };

  if (highlight === 'plain') return element;

  const karaoke = parseWordTimings(cue) ?? equalShareKaraoke(cue);
  element.props.children = karaoke.words.map((word, index): CaptionsWordSpan => {
    const span = word.endTime - word.startTime;
    const progress = span > 0 ? clamp01((time - word.startTime) / span) : time >= word.startTime ? 1 : 0;
    const state =
      time >= word.endTime ? 'done' : time >= word.startTime ? 'active' : 'pending';
    return {
      'data-state': state,
      'data-word-index': index,
      'data-progress': state === 'done' ? 1 : progress,
      props: {
        style:
          state === 'pending'
            ? { color: style.color }
            : state === 'active'
              ? { color: style.highlightColor, opacity: progress }
              : { color: style.highlightColor },
      },
    };
  });
  return element;
}
