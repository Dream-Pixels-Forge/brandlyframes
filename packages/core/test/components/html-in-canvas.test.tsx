import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HtmlInCanvas } from '../../src/components/html-in-canvas';

/** Minimal DOM environment so the component can create a canvas element. */
const installDom = (): void => {
  if (typeof globalThis.document === 'undefined') {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => ({
          getContext: () => ({
            fillRect: () => undefined,
            clearRect: () => undefined,
          }),
          width: 0,
          height: 0,
          style: {},
        } as unknown as HTMLCanvasElement),
      },
      writable: true,
    });
  }
};

describe('<HtmlInCanvas>', () => {
  beforeEach(() => {
    installDom();
  });

  it('renders a canvas element', () => {
    const html = renderToString(<HtmlInCanvas><div>content</div></HtmlInCanvas>);
    expect(html).toContain('<canvas');
  });

  it('is deterministic: identical props at frame N produce an identical tree', () => {
    const tree = <HtmlInCanvas><div>content</div></HtmlInCanvas>;
    expect(renderToString(tree)).toBe(renderToString(tree));
  });

  it('throws a helpful error outside a browser environment (no document)', () => {
    const originalDocument = globalThis.document;
    // intentionally removing document for the test
    delete (globalThis as { document?: unknown }).document;
    expect(() =>
      renderToString(<HtmlInCanvas><div>content</div></HtmlInCanvas>),
    ).toThrowError(/HtmlInCanvas/);
    // restore
    if (originalDocument) {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
        writable: true,
      });
    }
  });
});
