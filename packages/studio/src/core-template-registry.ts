/**
 * BF-481 — default gallery registry: the real core template registry
 * (PR #75, BF-301/302) surfaced through the injectable
 * {@link GalleryRegistry} shape the studio gallery consumes.
 */
import { getTemplate, listTemplates } from 'brandlyframes/template-registry';
import type { GalleryRegistry, GalleryTemplate } from './template-gallery';

/** Gallery source backed by `brandlyframes/template-registry`. */
export const coreTemplateGalleryRegistry: GalleryRegistry = {
  list(): readonly GalleryTemplate[] {
    return listTemplates()
      .map((name) => getTemplate(name))
      .filter((template): template is GalleryTemplate => template !== undefined);
  },
};
