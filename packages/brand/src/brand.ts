import { z } from 'zod';
import { validateBrandKit } from '@brandlyframes/zod-types';

export type BrandKit = ReturnType<typeof validateBrandKit>;

export function useBrand(_brandId: string): BrandKit {
  return { name: '', primaryColor: '#000000', secondaryColor: '#ffffff', fontFamily: 'sans-serif' };
}

export function loadBrandKit(_input: unknown): BrandKit {
  return validateBrandKit(_input);
}

export const batchRenderSchema = z.object({
  compositions: z.array(z.string().min(1)),
  outputDir: z.string().min(1),
});

export type BatchRenderOptions = z.infer<typeof batchRenderSchema>;

export function batchRender(_options: BatchRenderOptions): Promise<void> {
  return Promise.resolve();
}
