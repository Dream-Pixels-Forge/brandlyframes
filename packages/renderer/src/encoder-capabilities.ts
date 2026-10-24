/**
 * Encoder capabilities (BF-425).
 *
 * Probes available FFmpeg encoders, recommends a hardware encoder when one
 * is present, and warns when only slow software codecs (VP8/VP9) are
 * available. The ffmpeg probe is injectable so tests run without FFmpeg.
 */

export interface EncoderCapabilities {
  /** Encoder FFmpeg would pick by default (null = software fallback). */
  readonly recommended: string | null;
  /** Every encoder name the probe reported. */
  readonly available: readonly string[];
  /** Hardware encoders found among the available ones. */
  readonly hardware: readonly string[];
  /** Human-readable warnings (e.g. VP8/VP9 is slow). */
  readonly warns: readonly string[];
}

/** Hardware encoder families we prefer, in priority order. */
const HARDWARE_FAMILIES: readonly string[] = [
  'nvenc',
  'videotoolbox',
  'vaapi',
  'qsv',
];

/** Slow software codecs we warn about. */
const SLOW_CODECS: readonly string[] = ['libvpx', 'libvpx-vp9'];

/** Default probe: shell out to `ffmpeg -encoders` and parse encoder names. */
async function defaultProbe(): Promise<string[]> {
  const { execFile } = await import('node:child_process');
  const { stdout } = await execFile('ffmpeg', ['-hide_banner', '-encoders']);
  const encoders: string[] = [];
  for (const line of String(stdout).split('\n')) {
    const match = line.match(/^\s*[DE.]\s+(\S+)\s/);
    if (match) encoders.push(match[1]);
  }
  return encoders;
}

/** Probe encoders and build capabilities. */
export async function getEncoderCapabilities(
  probe: () => Promise<string[]> = defaultProbe,
): Promise<EncoderCapabilities> {
  const available = await probe();
  const availableSet = new Set(available);

  const hardware: string[] = [];
  for (const family of HARDWARE_FAMILIES) {
    for (const enc of available) {
      if (enc.includes(family) && !hardware.includes(enc)) {
        hardware.push(enc);
      }
    }
  }

  const recommended = hardware[0] ?? null;

  const warns: string[] = [];
  for (const codec of SLOW_CODECS) {
    if (availableSet.has(codec)) {
      warns.push(`${codec} is available but slow — prefer a hardware encoder`);
    }
  }
  if (!recommended && warns.length === 0 && available.length > 0) {
    warns.push('no hardware encoder detected — software encoding may be slow');
  }

  return { recommended, available, hardware, warns };
}
