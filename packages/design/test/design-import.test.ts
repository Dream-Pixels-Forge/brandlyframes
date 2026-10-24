/**
 * BF-490: design import stub.
 */

import { describe, expect, it } from 'vitest';
import { designImport } from '../src/design-import';

describe('designImport (BF-490)', () => {
  it('throws a clear error instead of silently importing', () => {
    expect(() => designImport('https://www.figma.com/file/abc')).toThrow(
      'BF-490',
    );
  });
});
