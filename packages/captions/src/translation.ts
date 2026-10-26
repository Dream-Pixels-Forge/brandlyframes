/**
 * Caption translation + dubbing hooks [BF-222].
 *
 * Both providers are injectable registries: host apps (or tests) register an
 * adapter implementing {@link CaptionTranslator} / {@link DubbingProvider}
 * and route through the registry by name. No network happens inside this
 * package — adapters own their transports, tests register in-memory fakes.
 */

import type { CaptionCue } from './index';

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

export interface TranslationOptions {
  /** BCP-47 target language, e.g. 'de' or 'pt-BR'. */
  targetLanguage: string;
  /** Optional BCP-47 source language; adapters may auto-detect. */
  sourceLanguage?: string;
}

/**
 * Adapter interface for caption translation. Implementations must keep cue
 * timing intact and return the same number of cues, in order.
 */
export interface CaptionTranslator {
  translate(cues: CaptionCue[], options: TranslationOptions): Promise<CaptionCue[]>;
}

const translators = new Map<string, CaptionTranslator>();

/** Register a translation adapter under `name` (overwrites existing). */
export function registerCaptionTranslator(name: string, translator: CaptionTranslator): void {
  translators.set(name, translator);
}

/** Return the registered translator for `name`, or `undefined` if none. */
export function getCaptionTranslator(name: string): CaptionTranslator | undefined {
  return translators.get(name);
}

/**
 * Translate cues through the named registered adapter. Timing and ordering
 * pass through the adapter contract: same cues, same order, same times.
 *
 * @throws when no adapter is registered under `translatorName`
 */
export async function translateCues(
  cues: CaptionCue[],
  targetLanguage: string,
  translatorName: string,
  sourceLanguage?: string,
): Promise<CaptionCue[]> {
  const translator = translators.get(translatorName);
  if (!translator) {
    throw new Error(`No caption translator registered under "${translatorName}"`);
  }
  return translator.translate(cues, { targetLanguage, sourceLanguage });
}

// ---------------------------------------------------------------------------
// Dubbing
// ---------------------------------------------------------------------------

/** One speakable unit, mapped 1:1 from a caption cue. */
export interface DubbingSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  language: string;
  voice?: string;
}

export interface DubbingOptions {
  /** BCP-47 language to dub into. */
  language: string;
  /** Optional voice identifier forwarded to the provider. */
  voice?: string;
}

export interface DubbingRequestOptions extends DubbingOptions {
  /** Registered provider to synthesize with. */
  providerName: string;
}

/** Synthesized audio for one {@link DubbingSegment}. */
export interface DubbedAudio {
  segmentId: string;
  src: string;
  durationSeconds: number;
  language: string;
}

/**
 * Adapter interface for dubbing (per-segment audio mapping). Implementations
 * own the actual TTS/synthesis; this package only maps segments to audio.
 */
export interface DubbingProvider {
  synthesize(segment: DubbingSegment): Promise<DubbedAudio>;
}

const dubbingProviders = new Map<string, DubbingProvider>();

/** Register a dubbing provider under `name` (overwrites existing). */
export function registerDubbingProvider(name: string, provider: DubbingProvider): void {
  dubbingProviders.set(name, provider);
}

/** Return the registered dubbing provider for `name`, or `undefined` if none. */
export function getDubbingProvider(name: string): DubbingProvider | undefined {
  return dubbingProviders.get(name);
}

/** One dubbing segment per cue, in cue order. */
export function buildDubbingSegments(cues: CaptionCue[], options: DubbingOptions): DubbingSegment[] {
  return cues.map((cue, index) => ({
    id: `dub-${index}`,
    text: cue.text,
    startTime: cue.startTime,
    endTime: cue.endTime,
    language: options.language,
    voice: options.voice,
  }));
}

/**
 * Map cues to dubbed audio through the named provider, one segment per cue,
 * synthesized in segment order.
 *
 * @throws when no provider is registered under `providerName`
 */
export async function dubCues(
  cues: CaptionCue[],
  options: DubbingRequestOptions,
): Promise<DubbedAudio[]> {
  const provider = dubbingProviders.get(options.providerName);
  if (!provider) {
    throw new Error(`No dubbing provider registered under "${options.providerName}"`);
  }
  const segments = buildDubbingSegments(cues, options);
  const audio: DubbedAudio[] = [];
  for (const segment of segments) {
    audio.push(await provider.synthesize(segment));
  }
  return audio;
}

/** The dubbed segment active at `time`, with playback mapping for the host. */
export interface ActiveDubbing {
  segment: DubbingSegment;
  audio: DubbedAudio;
  /** Seconds into the segment where playback currently sits. */
  offsetSeconds: number;
  /** audio.durationSeconds / slot length — the rate that fits audio to the cue. */
  playbackRate: number;
}

/**
 * Map a timeline position to the active dubbed segment. Returns `null`
 * between cues or when no audio was produced for the active segment.
 */
export function getActiveDubbing(
  segments: DubbingSegment[],
  audio: DubbedAudio[],
  time: number,
): ActiveDubbing | null {
  const segment = segments.find((s) => time >= s.startTime && time < s.endTime);
  if (!segment) return null;
  const track = audio.find((a) => a.segmentId === segment.id);
  if (!track) return null;
  return {
    segment,
    audio: track,
    offsetSeconds: time - segment.startTime,
    playbackRate: track.durationSeconds / (segment.endTime - segment.startTime),
  };
}
