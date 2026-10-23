import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';
import { ErrorOverlay, TimeTravelDebugger, useFrameInspector } from '../src/index';
import { FrameHistory } from '../src/frameHistory';
import { InspectorRegistry } from '../src/inspector';

describe('ErrorOverlay (BF-411)', () => {
  it('renders nothing without an error', () => {
    const { container } = render(
      createElement(ErrorOverlay, { frameNumber: 0, componentStack: '' }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows failing component name, frame, props snapshot and suggested fix', () => {
    render(
      createElement(ErrorOverlay, {
        error: new Error("Cannot read properties of undefined (reading 'scale')"),
        frameNumber: 42,
        componentName: 'TitleCard',
        propsSnapshot: { title: 'Hello', scale: undefined },
        componentStack: '\n    at TitleCard',
      }),
    );

    expect(screen.getByTestId('error-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('error-component-name')).toHaveTextContent('TitleCard');
    expect(screen.getByTestId('error-frame')).toHaveTextContent('42');
    expect(screen.getByTestId('error-props-snapshot')).toHaveTextContent('"title": "Hello"');
    expect(screen.getByTestId('error-suggested-fix')).toHaveTextContent(/guard|optional chaining/i);
  });

  it('shows the error message', () => {
    render(
      createElement(ErrorOverlay, {
        error: new Error('boom at render'),
        frameNumber: 7,
      }),
    );
    expect(screen.getByTestId('error-message')).toHaveTextContent('boom at render');
  });
});

describe('TimeTravelDebugger (BF-241)', () => {
  let history: FrameHistory;

  beforeEach(() => {
    history = new FrameHistory(10);
    for (const frame of [0, 1, 2]) history.push(frame);
  });

  it('shows the current frame', () => {
    render(createElement(TimeTravelDebugger, { history }));
    expect(screen.getByTestId('time-travel-frame')).toHaveTextContent('2');
  });

  it('steps back/forward through rendered frames and seeks', () => {
    const onSeek = vi.fn();
    render(createElement(TimeTravelDebugger, { history, onSeek }));

    fireEvent.click(screen.getByTestId('time-travel-back'));
    expect(screen.getByTestId('time-travel-frame')).toHaveTextContent('1');
    expect(onSeek).toHaveBeenLastCalledWith(1);

    fireEvent.click(screen.getByTestId('time-travel-forward'));
    expect(screen.getByTestId('time-travel-frame')).toHaveTextContent('2');
    expect(onSeek).toHaveBeenLastCalledWith(2);
  });

  it('disables back at the oldest frame and forward at the newest', () => {
    render(createElement(TimeTravelDebugger, { history }));
    expect(screen.getByTestId('time-travel-forward')).toBeDisabled();
    fireEvent.click(screen.getByTestId('time-travel-back'));
    fireEvent.click(screen.getByTestId('time-travel-back'));
    expect(screen.getByTestId('time-travel-back')).toBeDisabled();
  });

  it('jumps to the first error frame when one exists', () => {
    const onSeek = vi.fn();
    render(createElement(TimeTravelDebugger, { history, firstErrorFrame: 0, onSeek }));

    const jump = screen.getByTestId('time-travel-jump-to-error');
    fireEvent.click(jump);
    expect(screen.getByTestId('time-travel-frame')).toHaveTextContent('0');
    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it('hides the jump-to-error button when there is no error', () => {
    render(createElement(TimeTravelDebugger, { history }));
    expect(screen.queryByTestId('time-travel-jump-to-error')).not.toBeInTheDocument();
  });
});

describe('useFrameInspector (BF-412 click -> panel)', () => {
  function Harness({ registry }: { registry?: InspectorRegistry }) {
    const { inspected, handlePreviewClick } = useFrameInspector(registry);
    return createElement(
      'div',
      { onClick: handlePreviewClick, 'data-testid': 'preview' },
      createElement('button', { 'data-testid': 'leaf' }, 'leaf'),
      inspected
        ? createElement(ErrorOverlay, null) // placeholder child to assert null panel renders nothing
        : null,
      inspected
        ? createElement('pre', { 'data-testid': 'inspected-tag' }, inspected.element.tagName)
        : null,
      inspected
        ? createElement(
            'pre',
            { 'data-testid': 'inspected-props' },
            JSON.stringify(inspected.props, null, 2),
          )
        : null,
    );
  }

  it('captures the clicked element with its props at the current frame', () => {
    const registry = new InspectorRegistry();
    const { getByTestId } = render(createElement(Harness, { registry }));
    const leaf = getByTestId('leaf');
    registry.register(leaf, { title: 'Hello', frame: 7 });

    fireEvent.click(leaf);

    expect(getByTestId('inspected-tag')).toHaveTextContent('BUTTON');
    expect(getByTestId('inspected-props')).toHaveTextContent('"title": "Hello"');
  });

  it('falls back to the fiber walk without a registry entry', () => {
    const { getByTestId } = render(createElement(Harness, {}));
    fireEvent.click(getByTestId('leaf'));
    expect(getByTestId('inspected-tag')).toHaveTextContent('BUTTON');
    expect(getByTestId('inspected-props')).toBeInTheDocument();
  });
});
