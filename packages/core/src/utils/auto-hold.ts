import { holdFrame, releaseFrame } from '../runtime/holds';

/**
 * Auto-wait an asset with a timeout, naming the asset (BF-423) —
 * framework-free (no React, no DOM), so any runtime can drive it.
 *
 * Registers a `holdFrame(name)` so the current frame is blocked until
 * `acquire()` settles — resolve or reject both release the hold.
 * The hold's own timeout (`options.timeoutInMilliseconds`) is the safety
 * net: if `acquire()` never settles, the hold auto-expires and
 * `releaseFrame()` throws for the expired handle; that throw is caught
 * and ignored because the renderer is unblocked either way.
 *
 * If `acquire()` throws synchronously, the hold is still released and the
 * error is rethrown — a failing mount never leaks a hold.
 */
export const autoHoldFrame = (
  name: string,
  acquire: () => Promise<void>,
  options?: { timeoutInMilliseconds?: number },
): void => {
  const hold = holdFrame(name, options);
  let released = false;
  const releaseHoldOnce = (): void => {
    if (released) {
      return;
    }
    released = true;
    try {
      releaseFrame(hold);
    } catch {
      // The hold already auto-expired via its own timeout —
      // releaseFrame() throws for expired handles; unblocked anyway.
    }
  };
  try {
    acquire().then(releaseHoldOnce, releaseHoldOnce);
  } catch (error) {
    releaseHoldOnce();
    throw error;
  }
};
