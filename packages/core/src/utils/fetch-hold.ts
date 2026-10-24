import { holdFrame, releaseFrame } from '../runtime/holds';

/**
 * Auto-wait a `fetch()` with a timeout, naming the asset (`fetch <url>`)
 * so a timeout or leaked-hold report names exactly which fetch blocked
 * the frame (BF-423). `holdFrame()`'s own timeout is the safety net: if
 * the fetch never settles the hold auto-expires and `releaseFrame()` on
 * the expired handle throws — caught and ignored, the frame is unblocked
 * either way. A synchronous `fetch()` throw releases the hold and
 * rethrows, so a failing call never leaks a hold.
 */
export const fetchAutoHold = (
  url: string,
  options?: { signal?: AbortSignal; timeoutInMilliseconds?: number },
): Promise<Response> => {
  const hold = holdFrame(`fetch ${url}`, options);
  const releaseHold = (): void => {
    try {
      releaseFrame(hold);
    } catch {
      // Hold already auto-expired via its own timeout — unblocked anyway.
    }
  };
  let fetchPromise: Promise<Response>;
  try {
    fetchPromise = globalThis.fetch(url, { signal: options?.signal });
  } catch (error) {
    releaseHold();
    throw error;
  }
  return fetchPromise.then(
    (response: Response): Response => {
      releaseHold();
      return response;
    },
    (error: unknown): never => {
      releaseHold();
      throw error;
    },
  );
};
