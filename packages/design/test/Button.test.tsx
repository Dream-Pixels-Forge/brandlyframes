/**
 * Button variant tests (BF-013): primary orange / secondary outline / ghost,
 * deterministic per variant, with the AA-checked black-on-orange primary
 * (white-on-orange fails AA at 2.75:1 — see test/contrast.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Button } from '../src/components/Button';

const render = (ui: React.ReactElement): string => renderToString(ui);

describe('Button variants (BF-013)', () => {
  it('primary uses the orange token fill with AA-passing black text', () => {
    const html = render(<Button variant="primary">Render</Button>);
    expect(html).toContain('background-color:var(--bf-orange)');
    expect(html).toContain('color:var(--bf-black)');
    expect(html).toContain('Render');
  });

  it('secondary is an outline on the border token', () => {
    const html = render(<Button variant="secondary">Render</Button>);
    expect(html).toContain('background-color:transparent');
    expect(html).toContain('border:1px solid var(--bf-border)');
    expect(html).not.toContain('var(--bf-orange)');
  });

  it('ghost is bare text on the muted token with no visible border', () => {
    const html = render(<Button variant="ghost">Render</Button>);
    expect(html).toContain('color:var(--bf-text-muted)');
    expect(html).toContain('border:1px solid transparent');
    expect(html).not.toContain('var(--bf-orange)');
  });

  it('defaults to the primary variant', () => {
    expect(render(<Button>Go</Button>)).toBe(render(<Button variant="primary">Go</Button>));
  });

  it('switching the variant changes the style while keeping the label', () => {
    const label = 'Export';
    const primary = render(<Button variant="primary">{label}</Button>);
    const secondary = render(<Button variant="secondary">{label}</Button>);
    const ghost = render(<Button variant="ghost">{label}</Button>);

    for (const html of [primary, secondary, ghost]) {
      expect(html).toContain(label);
    }
    expect(primary).not.toBe(secondary);
    expect(secondary).not.toBe(ghost);
    expect(primary).not.toBe(ghost);
  });

  it('each variant is SSR-deterministic (renderToString twice — identical)', () => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      const [first, second] = [render(<Button variant={variant}>A</Button>), render(<Button variant={variant}>A</Button>)];
      expect(first).toBe(second);
    }
  });

  it('passes native button attributes through (e.g. disabled)', () => {
    const html = render(
      <Button variant="primary" disabled aria-label="Render project">
        Render
      </Button>,
    );
    expect(html).toContain('disabled');
    expect(html).toContain('aria-label="Render project"');
  });
});
