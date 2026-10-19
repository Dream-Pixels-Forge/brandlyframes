export interface AIComponentProps {
  prompt: string;
  model?: string;
}

export interface CaptionSegment {
  startFrame: number;
  endFrame: number;
  text: string;
}

export interface TranslationOptions {
  sourceLang: string;
  targetLang: string;
}

export interface DubbingOptions {
  voice: string;
  language: string;
}

export class AIVideoComponent {
  constructor(private props: AIComponentProps) {}
  async generate(): Promise<string> {
    return `ai-video:${this.props.prompt}`;
  }
}

export async function autoCaptions(_src: string): Promise<CaptionSegment[]> {
  return [];
}

export async function translateText(_text: string, _options: TranslationOptions): Promise<string> {
  return _text;
}

export async function dubAudio(_src: string, _options: DubbingOptions): Promise<string> {
  return _src;
}
