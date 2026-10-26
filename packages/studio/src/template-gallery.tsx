/**
 * BF-481 — TemplateGallery: browses a template registry (the core registry
 * from PR #75 / BF-301-302, or any injectable equivalent), shows previews,
 * and drives the use-template flow: pick a template → fill the no-code
 * props form → render from the form.
 */
import { useState, type CSSProperties } from 'react';
import { z } from 'zod';
import { cssVar } from '@brandlyframes/design';
import { NoCodePropsForm } from './no-code-props-form';
import { readTemplatePayload, type PropsSchema } from './template-payload';

/** Structural twin of the core template registry's `Template` entry. */
export interface GalleryTemplate {
  readonly name: string;
  readonly version: string;
  readonly payload: unknown;
}

/** Injectable registry source (mock in tests; core adapter by default). */
export interface GalleryRegistry {
  list(): readonly GalleryTemplate[];
}

export interface TemplateGalleryProps {
  /** Where templates come from — {@link coreTemplateGalleryRegistry} by default. */
  readonly registry: GalleryRegistry;
  /** Render-from-form action: selected template + schema-validated props. */
  readonly onRender?: (template: GalleryTemplate, props: Record<string, unknown>) => void;
}

const cardStyle: CSSProperties = {
  border: `1px solid ${cssVar('bf-border')}`,
  borderRadius: 6,
  backgroundColor: cssVar('bf-surface-1'),
  padding: 12,
  fontFamily: 'inherit',
  color: cssVar('bf-white'),
};

const selectedCardStyle: CSSProperties = {
  ...cardStyle,
  borderColor: cssVar('bf-orange'),
  backgroundColor: cssVar('bf-orange-dim'),
};

const previewStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  backgroundColor: cssVar('bf-black'),
  border: `1px solid ${cssVar('bf-border')}`,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: cssVar('bf-text-muted'),
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
  marginBottom: 8,
  overflow: 'hidden',
};

const mutedStyle: CSSProperties = {
  color: cssVar('bf-text-muted'),
  fontSize: 12,
};

/**
 * Browsable template gallery (BF-481). Selecting "Use template" opens the
 * no-code props form; submitting it calls {@link TemplateGalleryProps.onRender}
 * with the validated props.
 */
export function TemplateGallery({ registry, onRender }: TemplateGalleryProps) {
  const templates = registry.list();
  const [selectedName, setSelectedName] = useState<string | null>(null);

  return (
    <div className="template-gallery" data-testid="template-gallery">
      {templates.length === 0 ? (
        <div data-testid="template-gallery-empty" style={mutedStyle}>
          No templates registered.
        </div>
      ) : (
        <div className="template-gallery-list" style={{ display: 'grid', gap: 12 }}>
          {templates.map((template) => {
            const payload = readTemplatePayload(template.payload);
            const isSelected = template.name === selectedName;
            return (
              <article
                key={template.name}
                data-testid={`template-item-${template.name}`}
                style={isSelected ? selectedCardStyle : cardStyle}
              >
                <div data-testid={`template-preview-${template.name}`} style={previewStyle}>
                  {payload.preview !== undefined ? (
                    <img src={payload.preview} alt={payload.title ?? template.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{payload.title ?? template.name}</span>
                  )}
                </div>
                <header>
                  <strong>{payload.title ?? template.name}</strong>{' '}
                  <span style={mutedStyle}>
                    {template.name} · v{template.version}
                  </span>
                </header>
                {payload.description !== undefined && <p style={mutedStyle}>{payload.description}</p>}
                <button
                  type="button"
                  data-testid={`use-template-${template.name}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedName(template.name)}
                  style={{
                    marginTop: 8,
                    backgroundColor: isSelected ? cssVar('bf-orange') : 'transparent',
                    color: isSelected ? cssVar('bf-black') : cssVar('bf-white'),
                    border: `1px solid ${isSelected ? 'transparent' : cssVar('bf-border')}`,
                    borderRadius: 4,
                    padding: '6px 14px',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSelected ? 'Using template' : 'Use template'}
                </button>
                {isSelected && (
                  <div data-testid="template-props-form" style={{ marginTop: 12 }}>
                    <NoCodePropsForm
                      schema={payload.propsSchema ?? EMPTY_SCHEMA}
                      initialData={readDefaults(template.payload)}
                      onSubmit={(props) => onRender?.(template, props)}
                      submitLabel="Render"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EMPTY_SCHEMA: PropsSchema = z.object({});

/** Optional `defaultProps` convention on template payloads feeds the form prefill. */
function readDefaults(payload: unknown): Record<string, unknown> | undefined {
  if (typeof payload === 'object' && payload !== null) {
    const defaults = (payload as { defaultProps?: unknown }).defaultProps;
    if (typeof defaults === 'object' && defaults !== null) {
      return defaults as Record<string, unknown>;
    }
  }
  return undefined;
}
