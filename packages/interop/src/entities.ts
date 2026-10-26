/**
 * Shared HTML/XML entity decoding for the interop parsers (BF-230/231).
 * Internal to this package; not part of the public API.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

const ENTITY_PATTERN = /&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/**
 * Decodes named (`&` style) and numeric (`&#65;` / `&#x41;`) character
 * references. Unrecognized or malformed references are left verbatim so
 * lenient real-world markup round-trips instead of crashing.
 */
export function decodeEntities(value: string): string {
  return value.replace(ENTITY_PATTERN, (match, body: string) => {
    if (body.startsWith('#')) {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}
