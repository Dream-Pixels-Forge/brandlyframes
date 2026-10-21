import { z } from 'zod';

export const brandKitSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Primary color must be a hex color'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Secondary color must be a hex color'),
  fontFamily: z.string().min(1, 'Font family is required'),
  logoUrl: z.string().url().optional(),
});

export type BrandKit = z.infer<typeof brandKitSchema>;

export const compositionConfigSchema = z.object({
  id: z.string().min(1, 'Composition id is required'),
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive(),
  duration: z.number().positive(),
});

export type CompositionConfig = z.infer<typeof compositionConfigSchema>;

export function validateBrandKit(input: unknown): BrandKit {
  return brandKitSchema.parse(input);
}

export function validateCompositionConfig(input: unknown): CompositionConfig {
  return compositionConfigSchema.parse(input);
}
