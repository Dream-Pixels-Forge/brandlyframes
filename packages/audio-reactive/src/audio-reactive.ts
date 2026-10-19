export interface Beat {
  frame: number;
  strength: number;
}

export interface AudioAnalysis {
  beats: Beat[];
  loudness: number[];
  spectrum: number[][];
  durationInFrames: number;
  fps: number;
}

export interface UseAudioOptions {
  src: string;
  fps?: number;
}

export function analyzeAudio(_src: string, _options?: UseAudioOptions): AudioAnalysis {
  return { beats: [], loudness: [], spectrum: [], durationInFrames: 0, fps: _options?.fps ?? 30 };
}

export function getBeatAtFrame(_analysis: AudioAnalysis, _frame: number): Beat | null {
  return null;
}
