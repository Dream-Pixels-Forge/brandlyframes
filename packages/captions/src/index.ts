/**
 * @brandlyframes/captions
 * SRT/VTT parsing, karaoke timing, and text rendering for BrandlyFrames
 */

// Core types
export interface TimeCode {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export interface CaptionCue {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  settings?: CaptionSettings;
  karaoke?: KaraokeData;
}

export interface CaptionSettings {
  position?: 'top' | 'bottom' | 'center';
  alignment?: 'start' | 'center' | 'end';
  size?: number; // percentage
  line?: number;
  vertical?: boolean;
}

export interface KaraokeData {
  words: KaraokeWord[];
  // Timing for each syllable/word
}

export interface KaraokeWord {
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface ParsedCaption {
  format: 'srt' | 'vtt';
  cues: CaptionCue[];
  metadata: CaptionMetadata;
}

export interface CaptionMetadata {
  title?: string;
  language?: string;
  kind?: 'captions' | 'subtitles' | 'descriptions' | 'chapters' | 'metadata';
  region?: string;
}

/**
 * Parse SRT format captions
 */
export function parseSRT(content: string): ParsedCaption {
  const cues: CaptionCue[] = [];
  const blocks = content.trim().split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 2) continue;

    // First line might be an index number
    let lineIndex = 0;
    const firstLine = lines[0].trim();
    if (/^\d+$/.test(firstLine)) {
      lineIndex = 1;
    }

    if (lineIndex >= lines.length) continue;

    // Parse timestamp line
    const timestampLine = lines[lineIndex].trim();
    const timeMatch = timestampLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,\.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,\.](\d{3})/
    );

    if (!timeMatch) continue;

    const startTime = timeToSeconds(
      parseInt(timeMatch[1]),
      parseInt(timeMatch[2]),
      parseInt(timeMatch[3]),
      parseInt(timeMatch[4])
    );
    const endTime = timeToSeconds(
      parseInt(timeMatch[5]),
      parseInt(timeMatch[6]),
      parseInt(timeMatch[7]),
      parseInt(timeMatch[8])
    );

    // Remaining lines are text
    const text = lines.slice(lineIndex + 1).join('\n');

    cues.push({
      id: `cue-${cues.length}`,
      startTime,
      endTime,
      text: text.trim(),
    });
  }

  return {
    format: 'srt',
    cues,
    metadata: {},
  };
}

/**
 * Parse VTT format captions
 */
export function parseVTT(content: string): ParsedCaption {
  const cues: CaptionCue[] = [];
  const lines = content.split(/\r?\n/);

  let inCue = false;
  let currentCue: Partial<CaptionCue> = {};
  let cueTextLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header and metadata
    if (line.startsWith('WEBVTT') || line.startsWith('NOTE') || line.startsWith('STYLE') || line.startsWith('REGION')) {
      continue;
    }

    // Empty line ends a cue
    if (line === '' && inCue) {
      if (currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
        cues.push({
          id: currentCue.id || `cue-${cues.length}`,
          startTime: currentCue.startTime,
          endTime: currentCue.endTime,
          text: cueTextLines.join('\n').trim(),
          settings: currentCue.settings,
          karaoke: currentCue.karaoke,
        });
      }
      inCue = false;
      currentCue = {};
      cueTextLines = [];
      continue;
    }

    // Timestamp line
    const timeMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})(?:\s+(.*))?/
    );

    if (timeMatch) {
      inCue = true;
      currentCue.id = `cue-${cues.length}`;
      currentCue.startTime = timeToSeconds(
        parseInt(timeMatch[1]),
        parseInt(timeMatch[2]),
        parseInt(timeMatch[3]),
        parseInt(timeMatch[4])
      );
      currentCue.endTime = timeToSeconds(
        parseInt(timeMatch[5]),
        parseInt(timeMatch[6]),
        parseInt(timeMatch[7]),
        parseInt(timeMatch[8])
      );

      // Parse settings after timestamp
      if (timeMatch[9]) {
        currentCue.settings = parseVTTSettings(timeMatch[9]);
      }
      continue;
    }

    // Cue text
    if (inCue) {
      cueTextLines.push(line);
    }
  }

  // Handle last cue if no trailing empty line
  if (inCue && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
    cues.push({
      id: currentCue.id || `cue-${cues.length}`,
      startTime: currentCue.startTime,
      endTime: currentCue.endTime,
      text: cueTextLines.join('\n').trim(),
      settings: currentCue.settings,
      karaoke: currentCue.karaoke,
    });
  }

  return {
    format: 'vtt',
    cues,
    metadata: {},
  };
}

/**
 * Parse VTT cue settings
 */
function parseVTTSettings(settingsStr: string): CaptionSettings {
  const settings: CaptionSettings = {};
  const parts = settingsStr.split(/\s+/);

  for (const part of parts) {
    const [key, value] = part.split(':');
    switch (key) {
      case 'position':
        // Convert percentage values to position enum
        switch (value) {
          case '0%':
            settings.position = 'top';
            break;
          case '50%':
            settings.position = 'center';
            break;
          case '100%':
            settings.position = 'bottom';
            break;
          default:
            // If it's already a valid enum value, use it directly
            if (['top', 'bottom', 'center'].includes(value as CaptionSettings['position'])) {
              settings.position = value as CaptionSettings['position'];
            }
            // Default to center for unrecognized values
            else {
              settings.position = 'center';
            }
        }
        break;
      case 'align':
        // Convert alignment values to enum
        switch (value) {
          case 'start':
          case 'left':
            settings.alignment = 'start';
            break;
          case 'center':
          case 'middle':
            settings.alignment = 'center';
            break;
          case 'end':
          case 'right':
            settings.alignment = 'end';
            break;
          default:
            // If it's already a valid enum value, use it directly
            if (['start', 'center', 'end'].includes(value as CaptionSettings['alignment'])) {
              settings.alignment = value as CaptionSettings['alignment'];
            }
            // Default to center for unrecognized values
            else {
              settings.alignment = 'center';
            }
        }
        break;
      case 'size':
        settings.size = parseInt(value, 10);
        break;
      case 'line':
        settings.line = parseInt(value, 10);
        break;
      case 'vertical':
        settings.vertical = value === 'rl' || value === 'lr';
        break;
    }
  }

  return settings;
}

/**
 * Convert time components to seconds
 */
function timeToSeconds(hours: number, minutes: number, seconds: number, milliseconds: number): number {
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Auto-detect caption format and parse
 */
export function parseCaption(content: string): ParsedCaption {
  const trimmed = content.trim();

  if (trimmed.startsWith('WEBVTT')) {
    return parseVTT(content);
  }

  // Check for SRT format (starts with number)
  const firstLine = trimmed.split(/\r?\n/)[0].trim();
  if (/^\d+$/.test(firstLine)) {
    return parseSRT(content);
  }

  // Default to SRT
  return parseSRT(content);
}

/**
 * Convert seconds to timecode string (HH:MM:SS.mmm)
 */
export function secondsToTimecode(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Convert seconds to SRT timecode (HH:MM:SS,mmm)
 */
export function secondsToSRTTimecode(seconds: number): string {
  return secondsToTimecode(seconds).replace('.', ',');
}

/**
 * Generate SRT output from parsed captions
 */
export function generateSRT(parsed: ParsedCaption): string {
  let output = '';

  for (let i = 0; i < parsed.cues.length; i++) {
    const cue = parsed.cues[i];
    output += `${i + 1}\n`;
    output += `${secondsToSRTTimecode(cue.startTime)} --> ${secondsToSRTTimecode(cue.endTime)}\n`;
    output += `${cue.text}\n\n`;
  }

  return output.trim();
}

/**
 * Generate VTT output from parsed captions
 */
export function generateVTT(parsed: ParsedCaption): string {
  let output = 'WEBVTT\n\n';

  for (const cue of parsed.cues) {
    if (cue.id) {
      output += `${cue.id}\n`;
    }
    output += `${secondsToTimecode(cue.startTime)} --> ${secondsToTimecode(cue.endTime)}`;

    if (cue.settings) {
      const settings = formatVTTSettings(cue.settings);
      if (settings) {
        output += ` ${settings}`;
      }
    }

    output += `\n${cue.text}\n\n`;
  }

  return output.trim();
}

/**
 * Format VTT settings object to string
 */
function formatVTTSettings(settings: CaptionSettings): string {
  const parts: string[] = [];

  if (settings.position) {
    // Convert position enum to percentage for VTT output
    switch (settings.position) {
      case 'top':
        parts.push('position:0%');
        break;
      case 'center':
        parts.push('position:50%');
        break;
      case 'bottom':
        parts.push('position:100%');
        break;
    }
  }

  if (settings.alignment) {
    // Convert alignment enum to VTT values
    switch (settings.alignment) {
      case 'start':
        parts.push('align:start');
        break;
      case 'center':
        parts.push('align:center');
        break;
      case 'end':
        parts.push('align:end');
        break;
    }
  }

  if (settings.size !== undefined) parts.push(`size:${settings.size}%`);
  if (settings.line !== undefined) parts.push(`line:${settings.line}`);
  if (settings.vertical) parts.push('vertical:rl');

  return parts.join(' ');
}

/**
 * Find active cue at given time
 */
export function getActiveCue(cues: CaptionCue[], time: number): CaptionCue | null {
  for (const cue of cues) {
    if (time >= cue.startTime && time < cue.endTime) {
      return cue;
    }
  }
  return null;
}

/**
 * Get all cues overlapping a time range
 */
export function getCuesInRange(cues: CaptionCue[], startTime: number, endTime: number): CaptionCue[] {
  return cues.filter(cue => cue.startTime < endTime && cue.endTime > startTime);
}

/**
 * Split caption text into karaoke words with timing
 * This is a simplified version - real implementation would use forced alignment
 */
export function generateKaraokeTiming(
  text: string,
  startTime: number,
  endTime: number,
  wordCount?: number
): KaraokeData {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const duration = endTime - startTime;
  const perWordDuration = duration / words.length;

  const karaokeWords: KaraokeWord[] = words.map((word, index) => ({
    text: word,
    startTime: startTime + index * perWordDuration,
    endTime: startTime + (index + 1) * perWordDuration,
    confidence: 1.0,
  }));

  return { words: karaokeWords };
}

/**
 * Apply karaoke highlighting to text at current time
 */
export function applyKaraokeHighlight(
  karaoke: KaraokeData,
  currentTime: number
): { highlighted: string; progress: number } {
  let highlighted = '';
  let progress = 0;

  for (const word of karaoke.words) {
    if (currentTime >= word.endTime) {
      // Word fully highlighted
      highlighted += `<mark>${word.text}</mark> `;
      progress += 1;
    } else if (currentTime >= word.startTime) {
      // Word partially highlighted
      const wordProgress = (currentTime - word.startTime) / (word.endTime - word.startTime);
      highlighted += `<mark style="opacity:${wordProgress}">${word.text}</mark> `;
      progress += wordProgress;
    } else {
      // Word not yet reached
      highlighted += `${word.text} `;
    }
  }

  return {
    highlighted: highlighted.trim(),
    progress: progress / karaoke.words.length,
  };
}

/**
 * Merge overlapping or adjacent cues
 */
export function mergeCues(cues: CaptionCue[], maxGap: number = 0.5): CaptionCue[] {
  if (cues.length === 0) return [];

  const sorted = [...cues].sort((a, b) => a.startTime - b.startTime);
  const merged: CaptionCue[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    if (next.startTime - current.endTime <= maxGap) {
      // Merge cues
      current.endTime = next.endTime;
      current.text += '\n' + next.text;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Offset all cue times by a given amount
 */
export function offsetCues(cues: CaptionCue[], offsetSeconds: number): CaptionCue[] {
  return cues.map(cue => ({
    ...cue,
    startTime: Math.max(0, cue.startTime + offsetSeconds),
    endTime: Math.max(0, cue.endTime + offsetSeconds),
  }));
}

/**
 * Scale cue times by a factor (for speed changes)
 */
export function scaleCues(cues: CaptionCue[], factor: number): CaptionCue[] {
  return cues.map(cue => ({
    ...cue,
    startTime: cue.startTime * factor,
    endTime: cue.endTime * factor,
  }));
}

export * from './caption-renderer';
export * from './karaoke';