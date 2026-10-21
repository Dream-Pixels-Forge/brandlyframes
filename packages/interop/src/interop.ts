export interface HyperFrame {
  id: string;
  frames: number[];
  source: string;
}

export interface OtioClip {
  name: string;
  startFrame: number;
  duration: number;
  mediaReference: string;
}

export function importHyperFrames(_url: string): Promise<HyperFrame[]> {
  return Promise.resolve([]);
}

export function exportOtio(_clips: OtioClip[]): string {
  return 'otio';
}

export function exportEdl(_clips: OtioClip[]): string {
  return 'edl';
}

export function exportFcpXml(_clips: OtioClip[]): string {
  return 'fcp-xml';
}
