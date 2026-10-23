import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import {
  InspectorRegistry,
  resolveElementProps,
  getElementStyles,
  inspectElement,
} from '../src/inspector';

// Small components used as fiber-walk fixtures (BF-412)
const TitleCard = (props: { title: string; scale: number }) =>
  createElement('span', { 'data-testid': 'leaf' }, props.title);

const Wrap = (props: { title: string; scale: number }) => createElement(TitleCard, props);

describe('InspectorRegistry (BF-412 state logic)', () => {
  let registry: InspectorRegistry;

  beforeEach(() => {
    registry = new InspectorRegistry();
  });

  it('resolves props for a registered element', () => {
    const el = document.createElement('div');
    registry.register(el, { title: 'Hello' });
    expect(registry.resolve(el)).toEqual({ title: 'Hello' });
  });

  it('returns null for unregistered elements', () => {
    expect(registry.resolve(document.createElement('div'))).toBeNull();
  });

  it('the unregister function returned by register removes the entry', () => {
    const el = document.createElement('div');
    const unregister = registry.register(el, { a: 1 });
    expect(registry.resolve(el)).toEqual({ a: 1 });
    unregister();
    expect(registry.resolve(el)).toBeNull();
  });

  it('re-registering an element replaces its props', () => {
    const el = document.createElement('div');
    registry.register(el, { frame: 1 });
    registry.register(el, { frame: 2 });
    expect(registry.resolve(el)).toEqual({ frame: 2 });
  });
});

describe('resolveElementProps (BF-412 React fiber walk)', () => {
  it('returns the owning component props for a rendered element', () => {
    const { getByTestId } = render(createElement(Wrap, { title: 'Hello', scale: 2 }));
    const props = resolveElementProps(getByTestId('leaf'));
    expect(props).toMatchObject({ title: 'Hello', scale: 2 });
  });

  it('walks up nested fibers to the nearest component props', () => {
    const { getByTestId } = render(
      createElement('div', null, createElement(Wrap, { title: 'Nested', scale: 3 })),
    );
    // The wrapping div itself is a host node; fiber walk from a leaf inside still works.
    const leaf = getByTestId('leaf');
    expect(resolveElementProps(leaf)).toMatchObject({ title: 'Nested', scale: 3 });
  });

  it('falls back to host element props when no component fiber exists', () => {
    const { getByTestId } = render(createElement('div', { 'data-testid': 'host', id: 'root' }));
    const props = resolveElementProps(getByTestId('host'));
    expect(props).toMatchObject({ id: 'root' });
  });

  it('returns null for a plain DOM element outside React', () => {
    expect(resolveElementProps(document.createElement('div'))).toBeNull();
  });
});

describe('getElementStyles (BF-412 computed styles snapshot)', () => {
  it('reads computed styles set at the current frame', () => {
    const el = document.createElement('div');
    el.style.opacity = '0.5';
    el.style.width = '1920px';
    const styles = getElementStyles(el);
    expect(styles.opacity).toBe('0.5');
    expect(styles.width).toBe('1920px');
  });

  it('omits unset styles instead of emitting empty strings', () => {
    const el = document.createElement('div');
    const styles = getElementStyles(el);
    for (const value of Object.values(styles)) {
      expect(value).not.toBe('');
    }
  });
});

describe('inspectElement (BF-412 click -> props + styles)', () => {
  it('combines registry props (priority) with computed styles', () => {
    const { getByTestId } = render(createElement(Wrap, { title: 'Hello', scale: 2 }));
    const leaf = getByTestId('leaf');
    leaf.style.opacity = '0.25';

    const registry = new InspectorRegistry();
    registry.register(leaf, { override: true });

    const { props, styles } = inspectElement(leaf, registry);
    expect(props).toEqual({ override: true });
    expect(styles.opacity).toBe('0.25');
  });

  it('falls back to the fiber walk when the registry has no entry', () => {
    const { getByTestId } = render(createElement(Wrap, { title: 'Fallback', scale: 1 }));
    const { props } = inspectElement(getByTestId('leaf'), new InspectorRegistry());
    expect(props).toMatchObject({ title: 'Fallback' });
  });
});
