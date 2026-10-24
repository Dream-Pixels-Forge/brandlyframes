/**
 * Wall-clock guard (BF-420): `warnWallClock()` names the component that
 * reads wall-clock time during a virtual-clock render — silent outside
 * renders, and reports the current virtual frame.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getVirtualClockFrame,
  installVirtualClock,
  uninstallVirtualClock,
  warnWallClock,
} from '../../src/runtime';

describe('wall-clock guard (BF-420)', () => {
  beforeEach(() => {
    uninstallVirtualClock();
    vi.useRealTimers();
  });

  afterEach(() => {
    uninstallVirtualClock();
    vi.useRealTimers();
  });

  it('does not warn when the virtual clock is inactive', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnWallClock('MyComponent');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns with the component name when the virtual clock is active', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installVirtualClock(7);
    warnWallClock('MyComponent');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('BrandlyFrames: MyComponent reads wall-clock time'),
    );
    warn.mockRestore();
  });

  it('includes the current virtual frame in the warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installVirtualClock(42);
    warnWallClock('MyComponent');
    const message = warn.mock.calls[0][0];
    expect(message).toContain(`Frame ${getVirtualClockFrame()}`);
    expect(message).toContain('Frame 42');
    warn.mockRestore();
  });

  it('defaults componentName to "component"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installVirtualClock(3);
    warnWallClock();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('BrandlyFrames: component reads wall-clock time'),
    );
    warn.mockRestore();
  });
});
