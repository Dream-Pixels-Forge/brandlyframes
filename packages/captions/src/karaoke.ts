/**
 * Karaoke utilities for BrandlyFrames
 * Advanced karaoke timing, highlighting, and effects
 */

import type { KaraokeData, KaraokeWord, CaptionCue } from './index';

export interface KaraokeOptions {
  highlightColor?: string;
  defaultColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  animationDuration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface KaraokeState {
  currentWordIndex: number;
  currentWordProgress: number;
  overallProgress: number;
  completedWords: string[];
  currentWord: string | null;
  remainingWords: string[];
}

/**
 * Create default karaoke options
 */
export function createKaraokeOptions(overrides: Partial<KaraokeOptions> = {}): KaraokeOptions {
  return {
    highlightColor: '#ffff00',
    defaultColor: '#ffffff',
    outlineColor: '#000000',
    outlineWidth: 2,
    animationDuration: 300,
    easing: 'ease-out',
    ...overrides,
  };
}

/**
 * Parse karaoke timing from ASS/SSA format
 * Format: {\kf100}word{\kf50}next
 */
export function parseASSKaraoke(text: string): KaraokeData {
  const words: KaraokeWord[] = [];
  // Match {\kf<number>} or {\k<number>} tags - capture the tag and the following text.
  // The text segment ends at the next tag (`{`) or closing `}` — using [^{}]
  // prevents swallowing the next tag's body (e.g. "Hello{\kf50").
  const regex = /{\\kf?(\d+)}([^{}]*)/g;
  let match;
  let currentTime = 0; // in seconds

  while ((match = regex.exec(text)) !== null) {
    const duration = parseInt(match[1], 10) / 100; // convert centiseconds to seconds
    const wordText = match[2];

    if (wordText.trim()) {
      words.push({
        text: wordText,
        startTime: currentTime,
        endTime: currentTime + duration,
        confidence: 1.0,
      });
      currentTime += duration;
    }
  }

  // If no karaoke tags found, fall back to simple word splitting
  if (words.length === 0) {
    return generateSimpleKaraoke(text, 0, currentTime || 5);
  }

  return { words };
}

/**
 * Generate simple karaoke timing by dividing duration equally
 */
export function generateSimpleKaraoke(
  text: string,
  startTime: number,
  endTime: number
): KaraokeData {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const duration = endTime - startTime;
  const perWordDuration = duration / Math.max(1, words.length);

  return {
    words: words.map((word, index) => ({
      text: word,
      startTime: startTime + index * perWordDuration,
      endTime: startTime + (index + 1) * perWordDuration,
      confidence: 1.0,
    })),
  };
}

/**
 * Get karaoke state at current time
 */
export function getKaraokeState(karaoke: KaraokeData, currentTime: number): KaraokeState {
  const words = karaoke.words;
  let currentWordIndex = -1;
  let currentWordProgress = 0;
  const completedWords: string[] = [];
  let currentWord: string | null = null;

  // Handle empty karaoke
  if (words.length === 0) {
    return {
      currentWordIndex: -1,
      currentWordProgress: 0,
      overallProgress: 0,
      completedWords: [],
      currentWord: null,
      remainingWords: [],
    };
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (currentTime >= word.endTime) {
      completedWords.push(word.text);
      // If this is the last word, set currentWordIndex to it
      if (i === words.length - 1) {
        currentWordIndex = i;
        currentWordProgress = 1;
        currentWord = word.text;
      }
    } else if (currentTime >= word.startTime) {
      currentWordIndex = i;
      currentWord = word.text;
      currentWordProgress = (currentTime - word.startTime) / (word.endTime - word.startTime);
      break;
    } else {
      // Haven't reached this word yet
      break;
    }
  }

  const remainingWords = words.slice(currentWordIndex + 1).map(w => w.text);
  const overallProgress = completedWords.length / words.length +
    (currentWordIndex >= 0 ? currentWordProgress / words.length : 0);

  return {
    currentWordIndex,
    currentWordProgress,
    overallProgress: Math.min(1, overallProgress),
    completedWords,
    currentWord,
    remainingWords,
  };
}

/**
 * Apply easing function to progress
 */
export function applyEasing(progress: number, easing: KaraokeOptions['easing']): number {
  switch (easing) {
    case 'ease-in':
      return progress * progress;
    case 'ease-out':
      return 1 - (1 - progress) * (1 - progress);
    case 'ease-in-out':
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    case 'linear':
    default:
      return progress;
  }
}

/**
 * Create karaoke from caption cue with forced alignment data
 * (Would integrate with Whisper or other ASR in real implementation)
 */
export function createKaraokeFromCue(
  cue: CaptionCue,
  wordTimings?: Array<{ word: string; start: number; end: number }>
): KaraokeData | null {
  if (wordTimings && wordTimings.length > 0) {
    return {
      words: wordTimings.map(w => ({
        text: w.word,
        startTime: w.start,
        endTime: w.end,
        confidence: 1.0,
      })),
    };
  }

  // Fallback to generated timing
  if (cue.karaoke) {
    return cue.karaoke;
  }

  return generateSimpleKaraoke(cue.text, cue.startTime, cue.endTime);
}

/**
 * Render karaoke to SVG for high-quality output
 */
export function renderKaraokeToSVG(
  karaoke: KaraokeData,
  currentTime: number,
  options: {
    width: number;
    height: number;
    fontFamily: string;
    fontSize: number;
    fontWeight?: string;
    defaultColor: string;
    highlightColor: string;
    outlineColor?: string;
    outlineWidth?: number;
    x: number;
    y: number;
  }
): string {
  const state = getKaraokeState(karaoke, currentTime);
  const lineHeight = options.fontSize * 1.4;

  let svg = `<svg width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<style>
    .karaoke-text { font-family: ${options.fontFamily}; font-size: ${options.fontSize}px; font-weight: ${options.fontWeight || 'normal'}; fill: ${options.defaultColor}; }
    .karaoke-highlight { fill: ${options.highlightColor}; }
    .karaoke-outline { stroke: ${options.outlineColor || 'none'}; stroke-width: ${options.outlineWidth || 0}; paint-order: stroke fill; }
  </style>`;

  const maxWidth = options.width - options.x * 2;

  // Simple layout - all words on one line with wrapping
  const words = karaoke.words;
  let lineWords: KaraokeWord[] = [];
  let lineWidth = 0;
  const lines: KaraokeWord[][] = [];

  // Create a temporary canvas for measurement (in real impl, use text metrics)
  // For SVG, we'll approximate
  const charWidth = options.fontSize * 0.6;

  for (const word of words) {
    const wordWidth = word.text.length * charWidth + charWidth; // + space
    if (lineWidth + wordWidth > maxWidth && lineWords.length > 0) {
      lines.push(lineWords);
      lineWords = [word];
      lineWidth = wordWidth;
    } else {
      lineWords.push(word);
      lineWidth += wordWidth;
    }
  }
  if (lineWords.length > 0) lines.push(lineWords);

  // Render each line
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let lineX = options.x;
    const lineY = options.y + lineIdx * lineHeight;

    for (const word of line) {
      const wordIndex = karaoke.words.indexOf(word);
      const isCompleted = wordIndex < state.currentWordIndex;
      const isCurrent = wordIndex === state.currentWordIndex;
      const progress = isCurrent ? state.currentWordProgress : (isCompleted ? 1 : 0);

      if (progress > 0) {
        // Draw highlighted portion
        const highlightedWidth = word.text.length * charWidth * progress;
        if (highlightedWidth > 0) {
          svg += `<text x="${lineX}" y="${lineY}" class="karaoke-text karaoke-highlight karaoke-outline">${word.text.substring(0, Math.ceil(word.text.length * progress))}</text>`;
        }

        // Draw remaining portion
        if (progress < 1) {
          svg += `<text x="${lineX + highlightedWidth}" y="${lineY}" class="karaoke-text karaoke-outline">${word.text.substring(Math.ceil(word.text.length * progress))}</text>`;
        }
      } else {
        svg += `<text x="${lineX}" y="${lineY}" class="karaoke-text karaoke-outline">${word.text}</text>`;
      }

      lineX += word.text.length * charWidth + charWidth;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Convert karaoke to LRC format (lyrics with timestamps)
 */
export function karaokeToLRC(karaoke: KaraokeData): string {
  let lrc = '';

  for (const word of karaoke.words) {
    const startMin = Math.floor(word.startTime / 60);
    const startSec = Math.floor(word.startTime % 60);
    const startMs = Math.round((word.startTime % 1) * 100);
    lrc += `[${startMin.toString().padStart(2, '0')}:${startSec.toString().padStart(2, '0')}.${startMs.toString().padStart(2, '0')}]${word.text} `;
  }

  return lrc.trim();
}

/**
 * Create bouncing ball effect data
 */
export function createBouncingBallData(
  karaoke: KaraokeData,
  currentTime: number
): { x: number; y: number; wordIndex: number; progress: number } | null {
  const state = getKaraokeState(karaoke, currentTime);

  // No active word: before the first word or after the last one completed
  if (state.currentWordIndex < 0 || state.currentWordProgress >= 1) return null;

  // Simplified - would calculate actual position based on rendered text
  return {
    x: 100 + state.currentWordIndex * 50,
    y: 500,
    wordIndex: state.currentWordIndex,
    progress: state.currentWordProgress,
  };
}

/**
 * Synchronize multiple karaoke tracks (e.g., for duet)
 */
export function syncKaraokeTracks(
  tracks: KaraokeData[],
  currentTime: number
): Array<{ trackIndex: number; state: KaraokeState }> {
  return tracks.map((track, index) => ({
    trackIndex: index,
    state: getKaraokeState(track, currentTime),
  }));
}

/**
 * Export karaoke as JSON for external use
 */
export function exportKaraokeJSON(karaoke: KaraokeData): string {
  return JSON.stringify({
    version: '1.0',
    words: karaoke.words.map(w => ({
      text: w.text,
      start: w.startTime,
      end: w.endTime,
      confidence: w.confidence,
    })),
  }, null, 2);
}

/**
 * Import karaoke from JSON
 */
/** Shape of the JSON accepted by {@link importKaraokeJSON}. */
interface ImportedKaraokeWord {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export function importKaraokeJSON(json: string): KaraokeData {
  const data = JSON.parse(json) as { words: ImportedKaraokeWord[] };
  return {
    words: data.words.map((w) => ({
      text: w.text,
      startTime: w.start,
      endTime: w.end,
      confidence: w.confidence || 1.0,
    })),
  };
}

export * from './index';