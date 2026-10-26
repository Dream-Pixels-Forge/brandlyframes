/**
 * BF-481 no-code props form — Zod schemas rendered as a fillable form with
 * a render action. No code, no console: designers fill fields and render.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fireEvent, render } from '@testing-library/react';
import { NoCodePropsForm } from '../../src/no-code-props-form';

describe('NoCodePropsForm (BF-481)', () => {
  it('renders a field per Zod schema key with the right input kind', () => {
    const schema = z.object({
      title: z.string(),
      volume: z.number(),
      enabled: z.boolean(),
      mood: z.enum(['calm', 'bold']),
    });
    const { getByTestId } = render(<NoCodePropsForm schema={schema} onSubmit={() => undefined} />);
    expect(getByTestId('field-title').tagName).toBe('INPUT');
    expect(getByTestId('field-volume')).toHaveAttribute('type', 'number');
    expect(getByTestId('field-enabled')).toHaveAttribute('type', 'checkbox');
    expect(getByTestId('field-mood').tagName).toBe('SELECT');
    const options = Array.from(getByTestId('field-mood').querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['calm', 'bold']);
  });

  it('keeps the submit disabled until the form validates, then submits parsed props', () => {
    const schema = z.object({ title: z.string(), volume: z.number() });
    const onSubmit = vi.fn();
    const { getByTestId } = render(<NoCodePropsForm schema={schema} onSubmit={onSubmit} />);
    const submit = getByTestId('props-form-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(getByTestId('field-title'), { target: { value: 'Launch' } });
    fireEvent.change(getByTestId('field-volume'), { target: { value: '0.8' } });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Launch', volume: 0.8 });
  });

  it('shows the validation reason and blocks submit for bad values', () => {
    const schema = z.object({ volume: z.number().min(1, 'volume must be at least 1') });
    const onSubmit = vi.fn();
    const { getByTestId } = render(<NoCodePropsForm schema={schema} onSubmit={onSubmit} />);
    fireEvent.change(getByTestId('field-volume'), { target: { value: '0.5' } });
    expect(getByTestId('form-error-volume').textContent).toContain('volume must be at least 1');
    expect(getByTestId('props-form-submit')).toBeDisabled();
    fireEvent.click(getByTestId('props-form-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prefills from initialData', () => {
    const schema = z.object({ title: z.string(), enabled: z.boolean() });
    const { getByTestId } = render(
      <NoCodePropsForm
        schema={schema}
        initialData={{ title: 'Hello', enabled: true }}
        onSubmit={() => undefined}
      />,
    );
    expect(getByTestId('field-title')).toHaveValue('Hello');
    expect(getByTestId('field-enabled')).toBeChecked();
  });

  it('falls back to a JSON field for non-primitive schema keys', () => {
    const schema = z.object({ badge: z.object({ label: z.string() }) });
    const onSubmit = vi.fn();
    const { getByTestId } = render(<NoCodePropsForm schema={schema} onSubmit={onSubmit} />);
    const json = getByTestId('field-badge');
    expect(json.tagName).toBe('TEXTAREA');

    fireEvent.change(json, { target: { value: 'not json' } });
    expect(getByTestId('form-error-badge').textContent).toMatch(/JSON/i);
    expect(getByTestId('props-form-submit')).toBeDisabled();

    fireEvent.change(json, { target: { value: '{"label":"BF"}' } });
    expect(getByTestId('props-form-submit')).toBeEnabled();
    fireEvent.click(getByTestId('props-form-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ badge: { label: 'BF' } });
  });

  it('renders and submits an empty schema with no fields', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<NoCodePropsForm schema={z.object({})} onSubmit={onSubmit} />);
    fireEvent.click(getByTestId('props-form-submit'));
    expect(onSubmit).toHaveBeenCalledWith({});
  });
});
