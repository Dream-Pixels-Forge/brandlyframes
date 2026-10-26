/**
 * BF-481 — NoCodePropsForm: renders a Zod props schema as a fillable,
 * validated form with a render action. Designers fill fields; no code.
 *
 * Field mapping: string → text input, number → number input, boolean →
 * checkbox, enum → select, anything else → JSON textarea validated by the
 * schema. Cinema Black tokens throughout.
 */
import { useState, type CSSProperties } from 'react';
import { z } from 'zod';
import { cssVar } from '@brandlyframes/design';
import type { PropsSchema } from './template-payload';

export interface NoCodePropsFormProps {
  /** Zod schema the form validates against (typically the template's `propsSchema`). */
  readonly schema: PropsSchema;
  /** Prefill values (e.g. the template's default props). */
  readonly initialData?: Record<string, unknown>;
  /** Render action: called with the parsed, schema-valid props. */
  readonly onSubmit: (props: Record<string, unknown>) => void;
  /** Submit label. Default: "Render". */
  readonly submitLabel?: string;
}

type RawValues = Record<string, string | boolean>;

const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'inherit',
  fontSize: 12,
  color: cssVar('bf-text-muted'),
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: cssVar('bf-surface-2'),
  border: `1px solid ${cssVar('bf-border')}`,
  borderRadius: 4,
  color: cssVar('bf-white'),
  fontFamily: 'inherit',
  fontSize: 14,
  padding: '6px 8px',
};

const errorStyle: CSSProperties = {
  color: cssVar('bf-white'),
  fontSize: 12,
  marginTop: 2,
};

type FieldKind = 'string' | 'number' | 'boolean' | 'enum' | 'json';

interface FieldSpec {
  readonly key: string;
  readonly kind: FieldKind;
  readonly options?: readonly string[];
}

function fieldKind(field: z.ZodType): FieldSpec {
  if (field instanceof z.ZodString) return { key: '', kind: 'string' };
  if (field instanceof z.ZodNumber) return { key: '', kind: 'number' };
  if (field instanceof z.ZodBoolean) return { key: '', kind: 'boolean' };
  if (field instanceof z.ZodEnum) return { key: '', kind: 'enum', options: field.options.map(String) };
  return { key: '', kind: 'json' };
}

/** Build the schema candidate from raw input values (JSON fields parsed here). */
function buildCandidate(
  fields: readonly FieldSpec[],
  raw: RawValues,
): { value: Record<string, unknown>; parseErrors: Record<string, string> } {
  const value: Record<string, unknown> = {};
  const parseErrors: Record<string, string> = {};
  for (const field of fields) {
    const present = raw[field.key];
    if (present === undefined) continue;
    if (field.kind === 'number') {
      if (present === '') continue; // blank numbers stay absent (required ones fail validation)
      value[field.key] = Number(present);
    } else if (field.kind === 'json') {
      try {
        value[field.key] = JSON.parse(String(present));
      } catch {
        parseErrors[field.key] = 'Invalid JSON';
      }
    } else {
      value[field.key] = present;
    }
  }
  return { value, parseErrors };
}

function seedRaw(fields: readonly FieldSpec[], initialData: Record<string, unknown>): RawValues {
  const raw: RawValues = {};
  for (const field of fields) {
    const value = initialData[field.key];
    if (value === undefined) {
      // The select displays its first option; seed the candidate to match so
      // an untouched enum field still validates.
      if (field.kind === 'enum' && field.options && field.options.length > 0) {
        raw[field.key] = field.options[0];
      }
      continue;
    }
    if (field.kind === 'boolean') raw[field.key] = value === true;
    else if (field.kind === 'number') raw[field.key] = String(value);
    else if (field.kind === 'json') raw[field.key] = JSON.stringify(value, null, 2);
    else raw[field.key] = String(value);
  }
  return raw;
}

/** No-code form generated from a Zod schema (BF-481). */
export function NoCodePropsForm({ schema, initialData, onSubmit, submitLabel = 'Render' }: NoCodePropsFormProps) {
  const shape = schema instanceof z.ZodObject ? schema.shape : undefined;
  const fields: FieldSpec[] = shape
    ? Object.keys(shape).map((key) => ({ ...fieldKind(shape[key]), key }))
    : [];

  const [raw, setRaw] = useState<RawValues>(() => seedRaw(fields, initialData ?? {}));

  const { value: candidate, parseErrors } = buildCandidate(fields, raw);
  const parsed = schema.safeParse(candidate);
  const issues: Record<string, string> = { ...parseErrors };
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (issues[key] === undefined) issues[key] = issue.message;
    }
  }
  const valid = parsed.success;

  const setField = (key: string, value: string | boolean) =>
    setRaw((previous) => ({ ...previous, [key]: value }));

  return (
    <form
      className="props-form"
      data-testid="props-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit(parsed.data);
      }}
    >
      {fields.map((field) => (
        <div key={field.key} className="props-form-field">
          <label htmlFor={`props-form-${field.key}`} style={labelStyle}>
            {field.key}
          </label>
          {field.kind === 'boolean' ? (
            <input
              id={`props-form-${field.key}`}
              type="checkbox"
              data-testid={`field-${field.key}`}
              checked={raw[field.key] === true}
              onChange={(event) => setField(field.key, event.target.checked)}
            />
          ) : field.kind === 'enum' ? (
            <select
              id={`props-form-${field.key}`}
              data-testid={`field-${field.key}`}
              value={String(raw[field.key] ?? field.options?.[0] ?? '')}
              style={inputStyle}
              onChange={(event) => setField(field.key, event.target.value)}
            >
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.kind === 'json' ? (
            <textarea
              id={`props-form-${field.key}`}
              data-testid={`field-${field.key}`}
              rows={3}
              value={String(raw[field.key] ?? '')}
              style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
              onChange={(event) => setField(field.key, event.target.value)}
            />
          ) : (
            <input
              id={`props-form-${field.key}`}
              type={field.kind === 'number' ? 'number' : 'text'}
              data-testid={`field-${field.key}`}
              value={String(raw[field.key] ?? '')}
              style={inputStyle}
              onChange={(event) => setField(field.key, event.target.value)}
            />
          )}
          {issues[field.key] !== undefined && (
            <div className="props-form-error" data-testid={`form-error-${field.key}`} style={errorStyle} role="alert">
              {issues[field.key]}
            </div>
          )}
        </div>
      ))}
      {issues.form !== undefined && (
        <div className="props-form-error" data-testid="form-error" style={errorStyle} role="alert">
          {issues.form}
        </div>
      )}
      <button
        type="submit"
        data-testid="props-form-submit"
        disabled={!valid}
        style={{
          marginTop: 10,
          backgroundColor: valid ? cssVar('bf-orange') : cssVar('bf-surface-2'),
          color: cssVar('bf-black'),
          border: '1px solid transparent',
          borderRadius: 4,
          padding: '8px 16px',
          fontFamily: 'inherit',
          fontWeight: 600,
          cursor: valid ? 'pointer' : 'not-allowed',
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
