/**
 * BF-481 — gallery-facing view of a template payload.
 *
 * The core template registry (BF-302) keeps payloads opaque (`unknown`);
 * the gallery reads a documented, optional convention off them and treats
 * everything else as an unstyled template. Templates remain plain data —
 * the gallery never mutates the registry.
 */

import type { z } from 'zod';

/** Zod schema constraining a template's fillable props (rendered by the no-code form). */
export type PropsSchema = z.ZodType<Record<string, unknown>>;

/** What the template gallery understands inside a template payload. */
export interface GalleryTemplatePayload {
  /** Display title (defaults to the template name). */
  readonly title?: string;
  /** One-line description shown under the title. */
  readonly description?: string;
  /** Composition id this template renders (informational). */
  readonly compositionId?: string;
  /** Zod schema driving the no-code props form. Absent → form renders no fields. */
  readonly propsSchema?: PropsSchema;
  /** Preview image URL/data-URI for the gallery thumbnail. */
  readonly preview?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Defensively read the gallery convention off an opaque template payload.
 * Never throws; unknown shapes yield an empty payload (name-only gallery
 * entry, schema-less form).
 */
export function readTemplatePayload(payload: unknown): GalleryTemplatePayload {
  if (!isRecord(payload)) return {};
  const out: {
    title?: string;
    description?: string;
    compositionId?: string;
    propsSchema?: PropsSchema;
    preview?: string;
  } = {};
  if (typeof payload.title === 'string') out.title = payload.title;
  if (typeof payload.description === 'string') out.description = payload.description;
  if (typeof payload.compositionId === 'string') out.compositionId = payload.compositionId;
  if (typeof payload.preview === 'string') out.preview = payload.preview;
  // A props schema is anything Zod-shaped with safeParse (payloads are opaque,
  // so the structural check keeps the gallery decoupled from a specific zod instance).
  const schema = payload.propsSchema;
  if (isRecord(schema) && typeof (schema as { safeParse?: unknown }).safeParse === 'function') {
    out.propsSchema = schema as unknown as PropsSchema;
  }
  return out;
}
