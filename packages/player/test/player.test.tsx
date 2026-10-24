import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Player, PlayerRef } from '../src/index';
import React from 'react';
import '@testing-library/jest-dom';

// Mock registerRoot
vi.mock('brandlyframes', async () => {
  const actual = await vi.importActual('brandlyframes');
  return {
    ...actual,
    registerRoot: vi.fn(),
    useVideoConfig: () => ({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 300,
    }),
    useCurrentFrame: () => 0,
  };
});

describe('Player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<Player compositionId="test-comp" />);
    expect(screen.getByTestId('composition-frame')).toBeInTheDocument();
  });

  it('applies custom width and height', () => {
    const { container: containerEl } = render(<Player compositionId="test-comp" width={640} height={480} />);
    const player = containerEl.querySelector('.brandlyframes-player');
    expect(player).toHaveStyle({ width: '640px', height: '480px' });
  });

  it('shows controls when enabled', () => {
    render(<Player compositionId="test-comp" controls={true} />);
    expect(screen.getByText('0:00 / 0:10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /▶/ })).toBeInTheDocument();
  });

  it('hides controls when disabled', () => {
    render(<Player compositionId="test-comp" controls={false} />);
    expect(screen.queryByText('0:00 / 0:10')).not.toBeInTheDocument();
  });

  it('exposes play/pause via control buttons', async () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    render(<Player compositionId="test-comp" onPlay={onPlay} onPause={onPause} controls />);
    
    const playButton = screen.getByRole('button', { name: /▶/ });
    
    act(() => {
      fireEvent.click(playButton);
    });
    
    expect(onPlay).toHaveBeenCalled();
    
    const pauseButton = screen.getByRole('button', { name: /⏸/ });
    act(() => {
      fireEvent.click(pauseButton);
    });
    
    expect(onPause).toHaveBeenCalled();
  });

  it('passes inputProps to composition display', () => {
    render(<Player compositionId="test-comp" inputProps={{ foo: 'bar', count: 42 }} />);
    expect(screen.getByTestId('composition-frame')).toHaveTextContent('foo');
    expect(screen.getByTestId('composition-frame')).toHaveTextContent('bar');
  });

  it('displays composition ID and frame info', () => {
    render(<Player compositionId="my-composition" />);
    expect(screen.getByTestId('composition-frame')).toHaveTextContent('my-composition');
  });
});

describe('Player seek accuracy', () => {
  it('seeks to exact frame without drift via imperative API', () => {
    const player = { current: null as PlayerRef | null };
    render(
      <>
        <Player ref={player} compositionId="test-comp" />
        <button data-testid="seek-30" onClick={() => player.current.seekTo(30)}>
          Seek 30
        </button>
      </>,
    );

    act(() => {
      screen.getByTestId('seek-30').click();
    });

    expect(player.current.getCurrentFrame()).toBe(30);
  });

  it('clamps seek to duration - 1 when beyond range', () => {
    const player = { current: null as PlayerRef | null };
    render(<Player ref={player} compositionId="test-comp" />);

    act(() => {
      player.current.seekTo(1000);
    });

    // durationInFrames mocked to 300, so clamped to 299
    expect(player.current.getCurrentFrame()).toBe(299);
  });

  it('clamps negative seek to 0', () => {
    const player = { current: null as PlayerRef | null };
    render(<Player ref={player} compositionId="test-comp" />);

    act(() => {
      player.current.seekTo(-5);
    });

    expect(player.current.getCurrentFrame()).toBe(0);
  });

  it('seeks frame-exactly across repeated seeks', () => {
    const player = { current: null as PlayerRef | null };
    render(<Player ref={player} compositionId="test-comp" />);

    for (const frame of [0, 1, 15, 50, 120, 299]) {
      act(() => {
        player.current.seekTo(frame);
      });
      expect(player.current.getCurrentFrame()).toBe(frame);
    }
  });

  it('emits onFrameChange on seek', () => {
    const onFrameChange = vi.fn();
    const player = { current: null as PlayerRef | null };
    render(
      <Player ref={player} compositionId="test-comp" onFrameChange={onFrameChange} />,
    );

    act(() => {
      player.current.seekTo(42);
    });

    expect(onFrameChange).toHaveBeenCalledWith(42);
  });

  it('exposes duration and playback rate via ref API', () => {
    const player = { current: null as PlayerRef | null };
    render(<Player ref={player} compositionId="test-comp" />);

    expect(player.current.getDurationInFrames()).toBe(300);
    expect(player.current.getPlaybackRate()).toBe(1);
    expect(player.current.isPlaying()).toBe(false);
  });
});

describe('Render-parity mode (BF-440)', () => {
  const parityPixels = new Uint8Array([255, 0, 0, 255]);

  it('invokes onRenderFrame with the current frame when paused + parity mode + callback', async () => {
    const onRenderFrame = vi.fn().mockResolvedValue(parityPixels);
    render(
      <Player compositionId="test-comp" renderParityMode onRenderFrame={onRenderFrame} />,
    );

    expect(onRenderFrame).toHaveBeenCalledWith(0);

    // The render promise resolves on the microtask queue and exposes the frame on a canvas overlay.
    await act(async () => {});
    expect(screen.getByTestId('render-parity-frame')).toBeInTheDocument();
  });

  it('is a no-op when parity mode is on but onRenderFrame is missing', () => {
    render(<Player compositionId="test-comp" renderParityMode />);
    expect(screen.queryByTestId('render-parity-frame')).not.toBeInTheDocument();
  });

  it('renderFrame() throws a clear error without onRenderFrame', async () => {
    const player = { current: null as PlayerRef | null };
    render(<Player ref={player} compositionId="test-comp" renderParityMode />);

    await expect(player.current.renderFrame(1)).rejects.toThrow(/onRenderFrame/i);
  });

  it('does not invoke onRenderFrame while playing', async () => {
    const onRenderFrame = vi.fn().mockResolvedValue(parityPixels);
    render(
      <Player
        compositionId="test-comp"
        autoPlay
        renderParityMode
        onRenderFrame={onRenderFrame}
      />,
    );

    expect(onRenderFrame).not.toHaveBeenCalled();
    expect(screen.queryByTestId('render-parity-frame')).not.toBeInTheDocument();
  });

  it('re-renders the parity frame when seeking while paused', async () => {
    const onRenderFrame = vi.fn().mockResolvedValue(parityPixels);
    const player = { current: null as PlayerRef | null };
    render(
      <>
        <Player
          ref={player}
          compositionId="test-comp"
          renderParityMode
          onRenderFrame={onRenderFrame}
        />
        <button data-testid="seek-10" onClick={() => player.current.seekTo(10)}>
          Seek 10
        </button>
      </>,
    );

    expect(onRenderFrame).toHaveBeenCalledWith(0);
    await act(async () => {});

    act(() => {
      screen.getByTestId('seek-10').click();
    });

    expect(onRenderFrame).toHaveBeenCalledWith(10);
  });

  it('exposes renderFrame imperatively and returns the render pixels', async () => {
    const onRenderFrame = vi.fn().mockResolvedValue(parityPixels);
    const player = { current: null as PlayerRef | null };
    render(<Player ref={player} compositionId="test-comp" renderParityMode onRenderFrame={onRenderFrame} />);

    await act(async () => {});

    const pixels = await act(async () => player.current.renderFrame(42)!);

    expect(onRenderFrame).toHaveBeenCalledWith(42);
    expect(pixels).toEqual(parityPixels);
    expect(screen.getByTestId('render-parity-frame')).toBeInTheDocument();
  });
});