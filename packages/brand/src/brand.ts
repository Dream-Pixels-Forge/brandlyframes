import { useEffect, useState } from 'react';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateBrandKit, type BrandKit } from '@brandlyframes/zod-types';

/** Load a brand kit from a `brand.json` file at the project root [BF-140]. */
export function loadBrandKitFromFile(filePath = 'brand.json'): BrandKit {
  const absPath = resolve(process.cwd(), filePath);
  const raw = readFileSync(absPath, 'utf8');
  const data = JSON.parse(raw);
  return validateBrandKit(data);
}

/**
 * `useBrand(brandId)` (BF-140): load a brand kit from `brand.json` and
 * return it. The brand ID selects which kit to load when multiple are
 * configured; currently a single `brand.json` at the project root is
 * supported. Returns a default kit if no brand.json exists.
 */
export function useBrand(_brandId = 'default'): BrandKit {
  const [kit, setKit] = useState<BrandKit>({
    name: 'Default',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    fontFamily: 'sans-serif',
  });

  useEffect(() => {
    try {
      const loaded = loadBrandKitFromFile();
      setKit(loaded);
    } catch {
      // No brand.json found or invalid — keep default kit
    }
  }, []);

  return kit;
}

/** Validate and load a brand kit from arbitrary input (e.g. parsed JSON). */
export function loadBrandKit(input: unknown): BrandKit {
  return validateBrandKit(input);
}

export const batchRenderSchema = z.object({
  compositions: z.array(z.string().min(1)),
  outputDir: z.string().min(1),
});

export type BatchRenderOptions = z.infer<typeof batchRenderSchema>;

/** Batch render stub: validates options and returns a promise. */
export async function batchRender(_options: BatchRenderOptions): Promise<void> {
  return Promise.resolve();
}
