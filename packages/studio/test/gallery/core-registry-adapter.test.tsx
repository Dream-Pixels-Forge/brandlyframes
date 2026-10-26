/**
 * BF-481 — the gallery wired to the REAL core template registry (PR #75,
 * BF-301/302) via the default adapter: register templates in
 * `brandlyframes/template-registry`, browse them, render from the form.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fireEvent, render } from '@testing-library/react';
import { clearTemplates, listTemplates, registerTemplate, type Template } from 'brandlyframes/template-registry';
import { coreTemplateGalleryRegistry, TemplateGallery } from '../../src/gallery';

function register(name: string, payload: unknown): void {
  const template: Template = { name, version: '1.0.0', payload };
  registerTemplate(name, template);
}

describe('core template registry adapter (BF-481)', () => {
  afterEach(() => {
    clearTemplates();
  });

  it('surfaces every registered core template to the gallery', () => {
    register('promo', { title: 'Product Promo' });
    register('slate', { title: 'Slate' });
    const { getByTestId } = render(<TemplateGallery registry={coreTemplateGalleryRegistry} />);
    expect(getByTestId('template-item-promo')).toBeTruthy();
    expect(getByTestId('template-item-slate')).toBeTruthy();
    expect(getByTestId('template-item-promo').textContent).toContain('Product Promo');
  });

  it('full use-template → render-from-form flow on a core-registered template', () => {
    register('promo', {
      title: 'Product Promo',
      propsSchema: z.object({ headline: z.string(), seconds: z.number() }),
    });
    const onRender = vi.fn();
    const { getByTestId } = render(
      <TemplateGallery registry={coreTemplateGalleryRegistry} onRender={onRender} />,
    );
    expect([...listTemplates()]).toContain('promo');
    fireEvent.click(getByTestId('use-template-promo'));
    fireEvent.change(getByTestId('field-headline'), { target: { value: 'Ship it' } });
    fireEvent.change(getByTestId('field-seconds'), { target: { value: '30' } });
    fireEvent.click(getByTestId('props-form-submit'));
    expect(onRender).toHaveBeenCalledWith(expect.objectContaining({ name: 'promo' }), {
      headline: 'Ship it',
      seconds: 30,
    });
  });
});
