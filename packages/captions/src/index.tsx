/**
 * @brandlyframes/captions — caption/subtitle components [BF-070]
 *
 * Supports SRT, VTT parsing, karaoke timing, RTL text, and styling.
 * Frame-exact caption rendering synchronized with video frames.
 *
 * Clean-room implementation.
 */

import type { FC, ReactElement } from 'react';

/**
 * Caption cue with timing and styling.
 */
export interface CaptionCue {
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
  /** Caption text content. */
  text: string;
  /** Optional style overrides. */
  style?: CaptionStyle;
  /** Optional unique identifier. */
  id?: string;
}

/**
 * Caption style options.
 */
export interface CaptionStyle {
  /** Font family. */
  fontFamily?: string;
  /** Font size in pixels. */
  fontSize?: number;
  /** Text color (CSS color). */
  color?: string;
  /** Background color (CSS color). */
  backgroundColor?: string;
  /** Text alignment. */
  textAlign?: 'left' | 'center' | 'right';
  /** Writing direction. */
  direction?: 'ltr' | 'rtl';
  /** Bold weight. */
  fontWeight?: number | 'normal' | 'bold';
  /** Italic style. */
  fontStyle?: 'normal' | 'italic';
  /** Text decoration. */
  textDecoration?: 'none' | 'underline' | 'line-through';
}

/**
 * Caption track with multiple cues.
 */
export interface CaptionTrack {
  /** Track language code (BCP 47). */
  language: string;
  /** Track label for UI. */
  label?: string;
  /** Whether this is the default track. */
  default?: boolean;
  /** Array of caption cues. */
  cues: CaptionCue[];
}

/**
 * Props for CaptionRenderer component.
 */
export interface CaptionRendererProps {
  /** Array of caption tracks. */
  tracks: CaptionTrack[];
  /** Current time in seconds (derived from frame). */
  currentTime: number;
  /** Active track language. */
  activeLanguage?: string;
  /** Default style for all captions. */
  defaultStyle?: CaptionStyle;
  /** Custom className for container. */
  className?: string;
}

/**
 * Parses SRT format caption text into CaptionTrack.
 */
export function parseSRT(srtText: string, language = 'en', label?: string): CaptionTrack {
  const cues: CaptionCue[] = [];
  const blocks = srtText.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Skip index line (first line)
    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    if (!timeMatch) continue;

    const start = parseSRTTime(timeMatch[1]);
    const end = parseSRTTime(timeMatch[2]);
    const text = lines.slice(2).join('\n');

    cues.push({
      start,
      end,
      text,
      id: `cue-${cues.length}`,
    });
  }

  return {
    language,
    label,
    cues,
  };
}

/**
 * Parses WebVTT format caption text into CaptionTrack.
 */
export function parseVTT(vttText: string, language = 'en', label?: string): CaptionTrack {
  const cues: CaptionCue[] = [];
  const lines = vttText.trim().split('\n');
  let i = 0;

  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const timeLine = lines[i].trim();
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (!timeMatch) {
      i++;
      continue;
    }

    const start = parseVTTTime(timeMatch[1]);
    const end = parseVTTTime(timeMatch[2]);
    i++;

    // Collect text lines until blank line or end
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i].trim());
      i++;
    }

    cues.push({
      start,
      end,
      text: textLines.join('\n'),
      id: `cue-${cues.length}`,
    });

    i++; // Skip blank line
  }

  return {
    language,
    label,
    cues,
  };
}

/**
 * Parses SRT time format (HH:MM:SS,mmm or HH:MM:SS.mmm) to seconds.
 */
function parseSRTTime(timeStr: string): number {
  const normalized = timeStr.replace(',', '.');
  const parts = normalized.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parses VTT time format (HH:MM:SS.mmm) to seconds.
 */
function parseVTTTime(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Converts seconds to SRT time format.
 */
export function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * CaptionRenderer component — renders active captions at current time.
 */
export const CaptionRenderer = ({
  tracks,
  currentTime,
  activeLanguage,
  defaultStyle = {},
  className = '',
}: CaptionRendererProps) => {
  // Find active track
  const activeTrack = tracks.find(
    (t) => t.language === activeLanguage || (activeLanguage === undefined && t.default)
  ) || tracks[0];

  if (!activeTrack) return null;

  // Find active cues
  const activeCues = activeTrack.cues.filter(
    (cue) => currentTime >= cue.start && currentTime <= cue.end
  );

  if (activeCues.length === 0) return null;

  // Merge styles
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '60px',
    left: '10%',
    right: '10%',
    textAlign: 'center',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    pointerEvents: 'none',
    zIndex: 100,
    ...defaultStyle,
  };

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {activeCues.map((cue) => (
        <div
          key={cue.id || cue.start}
          style={{
            ...baseStyle,
            ...cue.style,
            direction: cue.style?.direction || 'ltr',
            textAlign: cue.style?.textAlign || 'center',
            color: cue.style?.color || baseStyle.color,
            backgroundColor: cue.style?.backgroundColor || baseStyle.backgroundColor,
            fontSize: cue.style?.fontSize || baseStyle.fontSize,
            fontFamily: cue.style?.fontFamily || baseStyle.fontFamily,
            fontWeight: cue.style?.fontWeight || baseStyle.fontWeight,
            fontStyle: cue.style?.fontStyle || baseStyle.fontStyle,
            textDecoration: cue.style?.textDecoration || baseStyle.textDecoration,
          } as React.CSSProperties}
        >
          {cue.text}
        </div>
      ))}
    </div>
  );
};

/**
 * KaraokeCaptionRenderer — renders karaoke-style captions with per-word highlighting.
 */
export interface KaraokeCaptionRendererProps extends CaptionRendererProps {
  /** Current word index being highlighted. */
  currentWordIndex: number;
  /** Word-level timing data for karaoke effect. */
  wordTimings?: Array<{ word: string; start: number; end: number }>;
}

export const KaraokeCaptionRenderer: FC<KaraokeCaptionRendererProps> = ({
  tracks,
  currentTime,
  activeLanguage,
  defaultStyle = {},
  className = '',
  currentWordIndex = 0,
  wordTimings = [],
} = {} as KaraokeCaptionRendererProps) => {
  const activeTrack = tracks.find(
    (t) => t.language === activeLanguage || (activeLanguage === undefined && t.default)
  ) || tracks[0];

  if (!activeTrack) return null;

  const activeCues = activeTrack.cues.filter(
    (cue) => currentTime >= cue.start && currentTime <= cue.end
  );

  if (activeCues.length === 0) return null;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '60px',
    left: '10%',
    right: '10%',
    textAlign: 'center',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    pointerEvents: 'none',
    zIndex: 100,
    ...defaultStyle,
  };

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {activeCues.map((cue) => (
        <div
          key={cue.id || cue.start}
          style={{
            ...baseStyle,
            ...cue.style,
            direction: cue.style?.direction || 'ltr',
            textAlign: cue.style?.textAlign || 'center',
          } as React.CSSProperties}
        >
          {wordTimings.length > 0 ? (
            <span>
              {wordTimings.map((wt, idx) => (
                <span
                  key={idx}
                  style={{
                    color: idx === currentWordIndex ? '#FFD700' : '#FFFFFF',
                    transition: 'color 0.1s ease',
                  } as React.CSSProperties}
                >
                  {wt.word}
                </span>
              ))}
            </span>
          ) : (
            cue.text
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Auto-detects caption format from text content.
 */
export function detectCaptionFormat(text: string): 'srt' | 'vtt' | 'unknown' {
  if (text.trim().startsWith('WEBVTT')) return 'vtt';
  if (text.match(/^\d+\s*\n\d{2}:\d{2}:\d{2}/m)) return 'srt';
  return 'unknown';
}

/**
 * Parses caption text using auto-detected format.
 */
export function parseCaption(text: string, language = 'en', label?: string): CaptionTrack {
  const format = detectCaptionFormat(text);
  if (format === 'vtt') return parseVTT(text, language, label);
  if (format === 'srt') return parseSRT(text, language, label);
  throw new Error('Unknown caption format');
}
