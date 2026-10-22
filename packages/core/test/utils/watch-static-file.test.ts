import { describe, expect, it, vi } from 'vitest';
import { watchStaticFile } from '../../src/utils';

describe('watchStaticFile', () => {
  it('invokes onChange when the watched file changes', () => {
    const onChange = vi.fn();
    let capturedListener: ((event: string) => void) | null = null;
    const fakeFS = {
      watch: (_filename: string, listener: (event: string) => void) => {
        capturedListener = listener;
        return { close: vi.fn() };
      },
    };
    const { close } = watchStaticFile('/images/hero.png', { onChange }, fakeFS);

    expect(capturedListener).not.toBeNull();
    capturedListener!('change');
    expect(onChange).toHaveBeenCalledTimes(1);
    close();
  });

  it('passes the watched path through to the filesystem watcher', () => {
    const onChange = vi.fn();
    let capturedPath: string | null = null;
    const fakeFS = {
      watch: (filename: string, _listener: (event: string) => void) => {
        capturedPath = filename;
        return { close: vi.fn() };
      },
    };
    watchStaticFile('/clips/intro.mp4', { onChange }, fakeFS);
    expect(capturedPath).toBe('/clips/intro.mp4');
  });

  it('close() releases the underlying watcher', () => {
    const onChange = vi.fn();
    const closeWatcher = vi.fn();
    const fakeFS = {
      watch: (_filename: string, _listener: (event: string) => void) => ({
        close: closeWatcher,
      }),
    };
    const { close } = watchStaticFile('/images/hero.png', { onChange }, fakeFS);
    close();
    expect(closeWatcher).toHaveBeenCalledTimes(1);
  });
});
