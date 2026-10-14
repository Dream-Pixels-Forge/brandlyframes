import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FC } from 'react';
import { renderToString } from 'react-dom/server';
import {
  clearFontCache,
  mountFontEffect,
  resetFontEnvironment,
  setFontEnvironment,
  useFont,
} from '../../src/fonts';
import { clearFrameHolds, getActiveHolds } from '../../src/runtime';
import { createFakeFontEnvironment, type FakeFontHarness } from './font-harness';

const LOCAL_URL = 'https://assets.example.com/fonts/inter.woff2';

/** Drains the microtask queue so promise chains settle under fake timers. */
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

describe('useFont (BF-410)', () => {
  let harness: FakeFontHarness;

  beforeEach(() => {
    vi.useFakeTimers();
    clearFontCache();
    resetFontEnvironment();
    clearFrameHolds();
    harness = createFakeFontEnvironment();
    setFontEnvironment(harness.environment);
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFontEnvironment();
    clearFontCache();
    clearFrameHolds();
  });

  describe('mountFontEffect — the framework-free effect body useFont runs on mount', () => {
    it('holds the frame on mount, triggers loadFont, and releases the hold when the font finishes loading', async () => {
      const onLoaded = vi.fn();
      const cleanup = mountFontEffect('Inter', LOCAL_URL, { onLoaded });

      // While the font loads, the current frame is held so the renderer
      // never captures a fallback-font frame.
      const active = getActiveHolds();
      expect(active).toHaveLength(1);
      expect(active[0].name).toContain('Inter');
      expect(active[0].name).toContain(LOCAL_URL);
      expect(harness.faces).toHaveLength(1);
      expect(harness.faces[0].loadCalls).toBe(1);

      harness.faces[0].resolveLoad();
      await flush();

      expect(getActiveHolds()).toHaveLength(0);
      expect(onLoaded).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('releases the hold when the font fails and reports the error naming the family and URL', async () => {
      const onError = vi.fn();
      const cleanup = mountFontEffect('Inter', LOCAL_URL, { onError });

      harness.faces[0].rejectLoad(new Error('network down'));
      await flush();

      expect(getActiveHolds()).toHaveLength(0);
      expect(onError).toHaveBeenCalledTimes(1);
      const error = onError.mock.calls[0][0] as Error;
      expect(error.message).toContain('Inter');
      expect(error.message).toContain(LOCAL_URL);
      cleanup();
    });

    it('releases the hold on unmount before the load settles and suppresses later callbacks', async () => {
      const onLoaded = vi.fn();
      const onError = vi.fn();
      const cleanup = mountFontEffect('Inter', LOCAL_URL, { onLoaded, onError });

      cleanup();
      expect(getActiveHolds()).toHaveLength(0);

      harness.faces[0].resolveLoad();
      await flush();

      expect(onLoaded).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('cleanup is idempotent after the load settled (never throws on duplicate release)', async () => {
      const cleanup = mountFontEffect('Inter', LOCAL_URL);
      harness.faces[0].resolveLoad();
      await flush();

      expect(() => cleanup()).not.toThrow();
      expect(() => cleanup()).not.toThrow();
      expect(getActiveHolds()).toHaveLength(0);
    });

    it('survives the holdFrame auto-expiry at the font timeout (releaseFrame after expiry must not throw)', async () => {
      const onError = vi.fn();
      mountFontEffect('Inter', LOCAL_URL, { onError }); // font load never resolves

      await vi.advanceTimersByTimeAsync(30_000);

      // The holdFrame timeout safety net released the hold, and the font
      // timeout error still surfaced with the family and URL.
      expect(getActiveHolds()).toHaveLength(0);
      expect(onError).toHaveBeenCalledTimes(1);
      const error = onError.mock.calls[0][0] as Error;
      expect(error.message).toContain('timed out');
      expect(error.message).toContain('Inter');
      expect(error.message).toContain(LOCAL_URL);
    });

    it('triggers loadFont only once across a StrictMode-style mount → cleanup → mount', async () => {
      const onLoaded = vi.fn();

      const cleanup1 = mountFontEffect('Inter', LOCAL_URL, { onLoaded });
      expect(getActiveHolds()).toHaveLength(1);
      cleanup1();
      expect(getActiveHolds()).toHaveLength(0);

      const cleanup2 = mountFontEffect('Inter', LOCAL_URL, { onLoaded });
      expect(getActiveHolds()).toHaveLength(1);
      // The idempotent loadFont cache means the remount reuses the in-flight
      // load: still exactly one FontFace, loaded exactly once.
      expect(harness.faces).toHaveLength(1);
      expect(harness.faces[0].loadCalls).toBe(1);

      harness.faces[0].resolveLoad();
      await flush();

      expect(getActiveHolds()).toHaveLength(0);
      expect(onLoaded).toHaveBeenCalledTimes(1);
      cleanup2();
    });

    it('tracks multiple concurrent font mounts with independent holds', async () => {
      const cleanupInter = mountFontEffect('Inter', 'https://a.example.com/a.woff2');
      const cleanupOswald = mountFontEffect('Oswald', 'https://b.example.com/b.woff2');
      expect(getActiveHolds()).toHaveLength(2);

      harness.faces[0].resolveLoad();
      await flush();
      expect(getActiveHolds()).toHaveLength(1);
      expect(getActiveHolds()[0].name).toContain('Oswald');

      harness.faces[1].resolveLoad();
      await flush();
      expect(getActiveHolds()).toHaveLength(0);

      cleanupInter();
      cleanupOswald();
    });

    it('passes the configured timeout to both the load and the hold', async () => {
      const onError = vi.fn();
      mountFontEffect('Inter', LOCAL_URL, { onError, timeoutInMilliseconds: 5_000 });

      await vi.advanceTimersByTimeAsync(4_999);
      expect(getActiveHolds()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(getActiveHolds()).toHaveLength(0);
      expect(onError).toHaveBeenCalledTimes(1);
      const error = onError.mock.calls[0][0] as Error;
      expect(error.message).toContain('timed out');
      expect(error.message).toContain('Inter');
      expect(error.message).toContain(LOCAL_URL);
    });
  });

  describe('SSR safety', () => {
    const FontProbe: FC = () => <>{`loaded:${String(useFont('Inter', LOCAL_URL))}`}</>;

    it('renders with renderToString while no font environment exists and creates no holds', () => {
      resetFontEnvironment();
      const html = renderToString(<FontProbe />);
      expect(html).toContain('loaded:false');
      expect(getActiveHolds()).toHaveLength(0);
    });

    it('renders with renderToString without touching the font environment (effects stay client-side)', () => {
      const html = renderToString(<FontProbe />);
      expect(html).toContain('loaded:false');
      expect(harness.faces).toHaveLength(0);
      expect(harness.fetchUrls).toHaveLength(0);
      expect(getActiveHolds()).toHaveLength(0);
    });
  });
});
