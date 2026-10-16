/**
 * Shapes tests — [BF-070]
 */

import { describe, it, expect } from 'vitest';
import {
  Rect,
  Circle,
  Ellipse,
  Line,
  Polyline,
  Polygon,
  Path,
  Star,
  ShapeStyle,
  ShapeProps,
} from '../src/index';

describe('Shapes types', () => {
  it('ShapeStyle has correct structure', () => {
    const style: ShapeStyle = {
      fill: '#FF0000',
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 0.5,
      transformOrigin: 'center',
    };
    expect(style.fill).toBe('#FF0000');
    expect(style.strokeWidth).toBe(2);
    expect(style.opacity).toBe(0.5);
  });

  it('ShapeStyle is optional', () => {
    const emptyStyle: ShapeStyle = {};
    expect(emptyStyle).toEqual({});
  });

  it('ShapeProps includes SVG props', () => {
    const props: ShapeProps = {
      width: 100,
      height: 100,
      style: { fill: 'red' },
      durationFrames: 30,
      easing: (t) => t * t,
    };
    expect(props.width).toBe(100);
    expect(props.durationFrames).toBe(30);
  });
});

describe('Shape components exist', () => {
  it('exports Rect', () => {
    expect(Rect).toBeDefined();
    expect(typeof Rect).toBe('function');
  });

  it('exports Circle', () => {
    expect(Circle).toBeDefined();
    expect(typeof Circle).toBe('function');
  });

  it('exports Ellipse', () => {
    expect(Ellipse).toBeDefined();
    expect(typeof Ellipse).toBe('function');
  });

  it('exports Line', () => {
    expect(Line).toBeDefined();
    expect(typeof Line).toBe('function');
  });

  it('exports Polyline', () => {
    expect(Polyline).toBeDefined();
    expect(typeof Polyline).toBe('function');
  });

  it('exports Polygon', () => {
    expect(Polygon).toBeDefined();
    expect(typeof Polygon).toBe('function');
  });

  it('exports Path', () => {
    expect(Path).toBeDefined();
    expect(typeof Path).toBe('function');
  });

  it('exports Star', () => {
    expect(Star).toBeDefined();
    expect(typeof Star).toBe('function');
  });
});

describe('Default export', () => {
  it('exports all shapes in default object', async () => {
    const shapes = await import('../src/index');
    const defaultExport = shapes.default;
    expect(defaultExport.Rect).toBeDefined();
    expect(defaultExport.Circle).toBeDefined();
    expect(defaultExport.Ellipse).toBeDefined();
    expect(defaultExport.Line).toBeDefined();
    expect(defaultExport.Polyline).toBeDefined();
    expect(defaultExport.Polygon).toBeDefined();
    expect(defaultExport.Path).toBeDefined();
    expect(defaultExport.Star).toBeDefined();
  });
});
