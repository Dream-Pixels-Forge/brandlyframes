/**
 * BF-481 — template gallery + no-code props form. Browsers-friendly React:
 * browse a template registry, pick a template, fill the Zod-driven props
 * form, render from the form. (Live mode / node-only server lives behind
 * the `@brandlyframes/studio/live` subpath.)
 */
export { TemplateGallery, type GalleryRegistry, type GalleryTemplate, type TemplateGalleryProps } from './template-gallery';
export { NoCodePropsForm, type NoCodePropsFormProps } from './no-code-props-form';
export {
  readTemplatePayload,
  type GalleryTemplatePayload,
  type PropsSchema,
} from './template-payload';
export { coreTemplateGalleryRegistry } from './core-template-registry';
