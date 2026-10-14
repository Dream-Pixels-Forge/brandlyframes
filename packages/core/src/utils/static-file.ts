/**
 * `staticFile()` — resolves an asset path inside the project's `public/`
 * folder to a root-absolute URL path (BF-006). Pure module — no React,
 * no DOM, no filesystem access.
 *
 * `staticFile("images/hero.png")` → `"/images/hero.png"`.
 */

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

/**
 * Normalizes `path` to `/<path>`: leading and trailing slashes are trimmed
 * and duplicate slashes collapse to one. Throws a helpful error for empty
 * paths, absolute URLs (serve those directly — they already carry their
 * origin) and `..` traversal segments.
 */
export const staticFile = (path: string): string => {
  if (typeof path !== 'string' || path.trim() === '') {
    throw new Error(
      `staticFile(): expected a non-empty asset path relative to the public folder (e.g. staticFile("images/hero.png")), but got ${JSON.stringify(
        path,
      )}.`,
    );
  }
  if (ABSOLUTE_URL_PATTERN.test(path)) {
    throw new Error(
      `staticFile(): "${path}" is an absolute URL. Pass a path relative to the public folder instead — e.g. staticFile("images/hero.png") — or use the URL directly in your component.`,
    );
  }
  if (path.split('/').includes('..')) {
    throw new Error(
      `staticFile(): "${path}" must not contain ".." segments — assets always resolve inside the public folder.`,
    );
  }
  const cleaned = path.replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  return `/${cleaned}`;
};
