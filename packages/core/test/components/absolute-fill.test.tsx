import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AbsoluteFill } from '../../src/components/absolute-fill';

describe('<AbsoluteFill>', () => {
  it('renders a full-size absolute-positioned flex container', () => {
    const output = renderToString(<AbsoluteFill />);
    expect(output).toContain('position:absolute');
    expect(output).toContain('top:0');
    expect(output).toContain('left:0');
    expect(output).toContain('width:100%');
    expect(output).toContain('height:100%');
    expect(output).toContain('display:flex');
    expect(output).toContain('flex-direction:column');
  });

  it('renders its children', () => {
    expect(renderToString(<AbsoluteFill><span>content</span></AbsoluteFill>)).toContain('content');
  });

  it('merges the style prop over the base styles', () => {
    const output = renderToString(<AbsoluteFill style={{ background: 'red' }} />);
    expect(output).toContain('background:red');
    expect(output).toContain('position:absolute');
  });

  it('lets the style prop override base styles', () => {
    const output = renderToString(<AbsoluteFill style={{ position: 'relative' }} />);
    expect(output).toContain('position:relative');
    expect(output).not.toContain('position:absolute');
  });

  it('forwards standard div props like className', () => {
    expect(renderToString(<AbsoluteFill className="layer" />)).toContain('class="layer"');
  });

  it('needs no frame context (usable anywhere)', () => {
    expect(() => renderToString(<AbsoluteFill />)).not.toThrow();
  });
});
