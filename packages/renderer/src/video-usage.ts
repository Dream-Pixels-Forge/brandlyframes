/**
 * `detectVideoUsage(source)` — scans a composition source file for `<Video>`
 * JSX usage so the render pipeline can transparently route `<Video>` frames
 * through the FFmpeg frame-exact decode backend instead of Chrome screenshot
 * capture (BF-450 auto-promotion).
 *
 * Returns `true` when `Video` (capitalized component) appears as a JSX
 * element — either imported from `brandlyframes` (and possibly aliased) or
 * referenced directly as `<Video .../>`. Returns `false` when no `<Video>`
 * JSX element is present.
 *
 * Pure TypeScript: no React, no DOM, no filesystem — deterministic for the
 * same source. Safe to call in the CLI/build step.
 *
 * @param source Composition source file text
 * @returns `true` when `<Video>` (or an alias) is used in the source
 */
export const detectVideoUsage = (source: string): boolean => {
  if (typeof source !== 'string' || source.length === 0) {
    return false;
  }

  // Collect every local binding that resolves to the imported `Video`:
  //   import { Video } from 'brandlyframes';   -> "Video"
  //   const MyVideo = Video;                    -> "MyVideo"
  const videoBindings = new Set<string>();
  const importVideo = /import\s*\{\s*[^}]*\bVideo\b[^}]*\}\s*from\s*['"]brandlyframes['"]/;
  if (importVideo.test(source)) {
    videoBindings.add('Video');
  }
  // Alias: const Xxx = Video;
  const aliasRegex = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*Video\b/g;
  let match: RegExpExecArray | null;
  while ((match = aliasRegex.exec(source)) !== null) {
    videoBindings.add(match[1]);
  }

  // Always check for bare <Video JSX (capital V component), even without an
  // import in this file (the import may live in another module).
  const bareVideoRegex = /<Video(?=[\s>/])/;
  if (bareVideoRegex.test(source)) {
    return true;
  }

  // JSX usage of aliased bindings: <MyVideo .../>
  if (videoBindings.size > 0) {
    // Remove 'Video' since we already checked it bare; check remaining aliases.
    const aliases = [...videoBindings].filter((b) => b !== 'Video');
    if (aliases.length > 0) {
      const bindingsPattern = aliases
        .map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      const jsxRegex = new RegExp(`<(${bindingsPattern})(?=[\\s>/])`, 'g');
      if (jsxRegex.test(source)) {
        return true;
      }
    }
  }

  return false;
};
