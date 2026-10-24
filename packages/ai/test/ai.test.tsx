/**
 * BF-220: AI provider registry + <AIVideo>/<AIImage> components.
 * BF-221: prompt + seed + model cache.
 *
 * All providers under test are fakes — no network is ever used.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { AIProvider, AIVideo, AIImage, getAIProvider, registerAIProvider } from '../src/index';
import { getCached, setCached } from '../src/ai-cache';

// ---------------------------------------------------------------------------
// BF-220: registry
// ---------------------------------------------------------------------------

describe('AI provider registry (BF-220)', () => {
  it('registers a provider and returns it by name', () => {
    const fake: AIProvider = {
      generateImage: (p) => Promise.resolve(`img:${p}`),
      generateVideo: (p) => Promise.resolve(`vid:${p}`),
    };
    registerAIProvider('bf220-registry', fake);
    expect(getAIProvider('bf220-registry')).toBe(fake);
  });

  it('returns undefined for an unknown provider name', () => {
    expect(getAIProvider('bf220-unknown')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BF-220: <AIVideo> / <AIImage> call an injectable provider (no network)
// ---------------------------------------------------------------------------

const videoCalls: string[] = [];
const imageCalls: string[] = [];

const videoProvider: AIProvider = {
  generateImage: (p) => {
    imageCalls.push(p);
    return Promise.resolve(`data:image/fake,${p}`);
  },
  generateVideo: (p) => {
    videoCalls.push(p);
    return Promise.resolve(`data:video/fake,${p}`);
  },
};

beforeEach(() => {
  videoCalls.length = 0;
  imageCalls.length = 0;
  registerAIProvider('bf220-video', videoProvider);
  registerAIProvider('bf220-image', videoProvider);
});

describe('<AIVideo> (BF-220)', () => {
  it('calls the registered provider with the prompt and renders a video element', () => {
    const element = AIVideo({ prompt: 'hello world', provider: 'bf220-video' });

    expect(videoCalls).toEqual(['hello world']);
    expect(imageCalls).toEqual([]);
    expect(element.type).toBe('video');
    expect(element.props['aria-label']).toBe('hello world');
  });

  it('does not call the image provider', () => {
    AIVideo({ prompt: 'prompt-a', provider: 'bf220-video' });
    expect(videoCalls).toEqual(['prompt-a']);
    expect(imageCalls).toEqual([]);
  });
});

describe('<AIImage> (BF-220)', () => {
  it('calls the registered provider with the prompt and renders an img element', () => {
    const element = AIImage({ prompt: 'a cat', provider: 'bf220-image' });

    expect(imageCalls).toEqual(['a cat']);
    expect(videoCalls).toEqual([]);
    expect(element.type).toBe('img');
    expect(element.props.alt).toBe('a cat');
  });
});

// ---------------------------------------------------------------------------
// BF-221: prompt + seed + model cache
// ---------------------------------------------------------------------------

describe('ai-cache (BF-221)', () => {
  it('returns undefined on a cache miss without calling a provider', () => {
    expect(getCached('never-seen', 1, 'model-a')).toBeUndefined();
  });

  it('returns the stored result on a cache hit', () => {
    setCached('sunrise', 7, 'seedance', 'https://cache.example/sunrise.mp4');
    expect(getCached('sunrise', 7, 'seedance')).toBe('https://cache.example/sunrise.mp4');
  });

  it('is keyed by prompt + seed + model', () => {
    setCached('logo', 1, 'higgsfield', 'a');
    setCached('logo', 2, 'higgsfield', 'b'); // different seed
    setCached('logo', 1, 'seedance', 'c'); // different model
    setCached('icon', 1, 'higgsfield', 'd'); // different prompt

    expect(getCached('logo', 1, 'higgsfield')).toBe('a');
    expect(getCached('logo', 2, 'higgsfield')).toBe('b');
    expect(getCached('logo', 1, 'seedance')).toBe('c');
    expect(getCached('icon', 1, 'higgsfield')).toBe('d');
    expect(getCached('logo', 1, 'higgsfield')).toBe('a'); // stable on re-read
  });
});
