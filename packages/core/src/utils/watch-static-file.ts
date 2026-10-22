import { watch as nodeWatch, type FSWatcher } from 'node:fs';

type Listener = (event: string) => void;

/** A filesystem surface capable of watching a file for changes. */
interface FileSystem {
  watch(filename: string, listener: Listener): { close(): void };
}

const nodeFileSystem: FileSystem = {
  watch: (filename, listener) => {
    const watcher: FSWatcher = nodeWatch(filename, listener);
    return { close: () => watcher.close() };
  },
};

export type WatchStaticFileOptions = {
  /** Called whenever the watched asset is modified on disk. */
  onChange: () => void;
};

/**
 * Watches a static asset file and invokes `onChange` whenever it changes,
 * so a composition can hot-reload when its source image, video or font is
 * edited on disk (dev hot-reload). Returns `close()` to stop watching.
 *
 * The filesystem surface is injected and defaults to `node:fs`, so the
 * watcher can be faked in unit tests and swapped out in environments
 * without a real filesystem (browser, render workers).
 */
export const watchStaticFile = (
  src: string,
  { onChange }: WatchStaticFileOptions,
  fs: FileSystem = nodeFileSystem,
): { close(): void } => {
  const watcher = fs.watch(src, (event) => {
    if (event === 'change') {
      onChange();
    }
  });
  return { close: () => watcher.close() };
};
