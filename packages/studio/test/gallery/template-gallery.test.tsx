/**
 * BF-481 template gallery — browsable list from an injectable registry
 * (mocked here; the real core registry is exercised in
 * core-registry-adapter.test.tsx), previews, use-template flow, and the
 * render-from-form action.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fireEvent, render } from '@testing-library/react';
import { TemplateGallery, type GalleryRegistry, type GalleryTemplate } from '../../src/template-gallery';

function registryOf(...templates: GalleryTemplate[]): GalleryRegistry {
  return { list: () => templates };
}

const HERO_TEMPLATE: GalleryTemplate = {
  name: 'hero',
  version: '1.2.0',
  payload: {
    title: 'Hero Title',
    description: 'Big bold intro slate',
    preview: 'data:image/png;base64,PREVIEW',
    propsSchema: z.object({ title: z.string(), mood: z.enum(['calm', 'bold']) }),
  },
};

const PLAIN_TEMPLATE: GalleryTemplate = {
  name: 'plain',
  version: '0.1.0',
  payload: 'just a payload',
};

describe('TemplateGallery (BF-481)', () => {
  it('lists every template in the registry with name, version and payload metadata', () => {
    const { getByTestId } = render(<TemplateGallery registry={registryOf(HERO_TEMPLATE, PLAIN_TEMPLATE)} />);
    expect(getByTestId('template-item-hero').textContent).toContain('hero');
    expect(getByTestId('template-item-hero').textContent).toContain('1.2.0');
    expect(getByTestId('template-item-hero').textContent).toContain('Hero Title');
    expect(getByTestId('template-item-hero').textContent).toContain('Big bold intro slate');
    expect(getByTestId('template-item-plain')).toBeTruthy();
  });

  it('shows a preview thumbnail from the payload and a placeholder without one', () => {
    const { getByTestId } = render(<TemplateGallery registry={registryOf(HERO_TEMPLATE, PLAIN_TEMPLATE)} />);
    const img = getByTestId('template-preview-hero').querySelector('img');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,PREVIEW');
    expect(getByTestId('template-preview-plain')).toBeTruthy();
  });

  it('use-template flow: selecting a template opens its props form', () => {
    const { getByTestId, queryByTestId } = render(
      <TemplateGallery registry={registryOf(HERO_TEMPLATE, PLAIN_TEMPLATE)} />,
    );
    expect(queryByTestId('template-props-form')).toBeNull();
    fireEvent.click(getByTestId('use-template-hero'));
    expect(getByTestId('template-props-form')).toBeTruthy();
    expect(getByTestId('field-title')).toBeTruthy();
    expect(getByTestId('field-mood')).toBeTruthy();
  });

  it('render-from-form: submits the selected template with validated form props', () => {
    const onRender = vi.fn();
    const { getByTestId } = render(
      <TemplateGallery registry={registryOf(HERO_TEMPLATE, PLAIN_TEMPLATE)} onRender={onRender} />,
    );
    fireEvent.click(getByTestId('use-template-hero'));
    fireEvent.change(getByTestId('field-title'), { target: { value: 'BrandlyFrames' } });
    fireEvent.change(getByTestId('field-mood'), { target: { value: 'bold' } });
    fireEvent.click(getByTestId('props-form-submit'));
    expect(onRender).toHaveBeenCalledOnce();
    const [template, props] = onRender.mock.calls[0];
    expect(template.name).toBe('hero');
    expect(props).toEqual({ title: 'BrandlyFrames', mood: 'bold' });
  });

  it('renders a schema-less template with an empty props form', () => {
    const onRender = vi.fn();
    const { getByTestId } = render(
      <TemplateGallery registry={registryOf(PLAIN_TEMPLATE)} onRender={onRender} />,
    );
    fireEvent.click(getByTestId('use-template-plain'));
    fireEvent.click(getByTestId('props-form-submit'));
    expect(onRender).toHaveBeenCalledOnce();
    const [template, props] = onRender.mock.calls[0];
    expect(template.name).toBe('plain');
    expect(props).toEqual({});
  });

  it('shows an empty state when nothing is registered', () => {
    const { getByTestId } = render(<TemplateGallery registry={registryOf()} />);
    expect(getByTestId('template-gallery-empty').textContent).toMatch(/no templates/i);
  });
});
