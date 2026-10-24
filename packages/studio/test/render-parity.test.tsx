import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RenderParityButton } from '../src/index';

describe('RenderParityButton (BF-440)', () => {
  it('should be defined and exported', () => {
    expect(RenderParityButton).toBeDefined();
    expect(typeof RenderParityButton).toBe('function');
  });

  it('should start disabled and toggle via onToggle', () => {
    const onToggle = vi.fn();
    const { getByTestId } = render(<RenderParityButton onToggle={onToggle} />);
    const button = getByTestId('render-parity-button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('should start enabled when defaultEnabled is set', () => {
    const { getByTestId } = render(<RenderParityButton defaultEnabled />);
    expect(getByTestId('render-parity-button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('lets the consumer wire parity mode to the Player via onToggle', () => {
    // Consumer pattern: onToggle drives Player's renderParityMode prop.
    let parity = false;
    const onToggle = (next: boolean) => {
      parity = next;
    };
    const { getByTestId } = render(<RenderParityButton onToggle={onToggle} defaultEnabled />);
    // defaultEnabled only sets the initial UI state; onToggle fires on click.
    expect(getByTestId('render-parity-button')).toHaveAttribute('aria-pressed', 'true');
    expect(parity).toBe(false);
    fireEvent.click(getByTestId('render-parity-button'));
    expect(parity).toBe(false);
  });
});
