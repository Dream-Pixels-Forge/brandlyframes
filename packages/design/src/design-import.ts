/**
 * Design import (BF-490) — pure stub.
 *
 * Bringing layouts in from Figma/Paper as editable compositions, with tokens
 * mapped to `brand.json`, is not yet implemented. This stub throws a clear
 * error so callers fail fast instead of silently producing empty compositions.
 */
export function designImport(_source: string): never {
  throw new Error('designImport is not implemented yet (BF-490)');
}
