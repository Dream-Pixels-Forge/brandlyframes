/**
 * Real headless-Chrome launcher wired to the renderer's injectable
 * {@link LauncherFn} contract [BF-020][BF-025].
 *
 * Launches a Chrome binary with `--remote-debugging-port`, connects to the
 * Chrome DevTools Protocol over Node's built-in WebSocket, creates one Page
 * per tab, seeks the virtual clock via the `?frame=N` URL contract, and
 * pulls PNG screenshots via `Page.captureScreenshot`.
 *
 * Clean-room implementation.
 */
import { spawn, ChildProcess } from 'node:child_process';
import type { BrowserLauncherLike, BrowserTabLike, LauncherFn } from '@brandlyframes/renderer';

const CHROME_BIN = process.env.CHROME_BIN ?? '/usr/bin/google-chrome';

interface CdpMessage {
  id?: number;
  method?: string;
  params?: unknown;
  error?: { code: number; message: string };
  result?: unknown;
}

interface _CdpPage {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}

/** Chrome DevTools Protocol client over a WebSocket. */
class CdpClient {
  private ws: WebSocket;
  private pending = new Map<number, (payload: CdpMessage) => void>;
  private nextId = 1;
  private closed = false;
  private eventListeners = new Map<string, Array<(params: unknown) => void>>();

  constructor(webSocketDebuggerUrl: string) {
    this.ws = new WebSocket(webSocketDebuggerUrl);
    this.ws.addEventListener('message', (event: MessageEvent) => {
      const message = JSON.parse(event.data as string) as CdpMessage;
      if (message.id !== undefined) {
        const resolver = this.pending.get(message.id);
        if (resolver) {
          this.pending.delete(message.id);
          resolver(message);
        }
      } else if (message.method) {
        const listeners = this.eventListeners.get(message.method);
        if (listeners) {
          for (const listener of listeners) listener(message.params);
        }
      }
    });
    this.ws.addEventListener('close', () => {
      this.closed = true;
      for (const resolver of this.pending.values()) {
        resolver({ id: -1, error: { code: -32000, message: 'CDP connection closed' } });
      }
      this.pending.clear();
    });
    this.ws.addEventListener('error', () => {
      this.closed = true;
    });
  }

  /** Wait for the socket to be ready. */
  async ready(): Promise<void> {
    if (this.closed) throw new Error('CDP connection closed');
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', (err) => reject(err), { once: true });
    });
  }

  /** Send a CDP command and wait for its result. */
  async send(method: string, params: unknown = {}): Promise<unknown> {
    await this.ready();
    if (this.closed) throw new Error('CDP connection closed');
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, (message) => {
        if (message.error) {
          reject(new Error(`CDP ${method} failed: ${message.error.message}`));
        } else {
          resolve(message.result);
        }
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  /** Wait for a CDP event with the given method to fire. */
  async waitForEvent(method: string, timeoutMs = 30000): Promise<unknown> {
    if (this.closed) throw new Error('CDP connection closed');
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(method, handler);
        reject(new Error(`Timed out waiting for CDP event: ${method}`));
      }, timeoutMs);
      const handler = (params: unknown) => {
        clearTimeout(timer);
        this.off(method, handler);
        resolve(params);
      };
      this.on(method, handler);
    });
  }

  on(method: string, listener: (params: unknown) => void): void {
    const list = this.eventListeners.get(method) ?? [];
    list.push(listener);
    this.eventListeners.set(method, list);
  }

  off(method: string, listener: (params: unknown) => void): void {
    const list = this.eventListeners.get(method);
    if (!list) return;
    const idx = list.indexOf(listener);
    if (idx >= 0) list.splice(idx, 1);
  }

  close(): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
    this.closed = true;
  }
}

/** One CDP-bound tab on a composition URL. */
class CdpTab implements BrowserTabLike {
  readonly url: string;
  private client: CdpClient;
  private sessionId: string;

  constructor(url: string, client: CdpClient, sessionId: string) {
    this.url = url;
    this.client = client;
    this.sessionId = sessionId;
  }

  async gotoFrame(frame: number): Promise<void> {
    const targetUrl = `${this.url}${this.url.includes('?') ? '&' : '?'}frame=${frame}`;
    await this.client.send('Page.navigate', { url: targetUrl });
    await this.client.waitForEvent('Page.loadEventFired');
  }

  async screenshotPng(): Promise<Uint8Array> {
    const result = await this.client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const base64 = String(result);
    const bytes = Buffer.from(base64, 'base64');
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  async close(): Promise<void> {
    try {
      await this.client.send('Page.close', {});
    } catch {
      // ignore close errors
    }
  }
}

/** One Chrome browser instance bound to a remote-debugging port. */
class CdpLauncher implements BrowserLauncherLike {
  private process: ChildProcess;
  private closed = false;

  constructor(process: ChildProcess, private debugUrl: string) {
    this.process = process;
  }

  async launchTab(url: string, _flags: readonly string[]): Promise<BrowserTabLike> {
    const client = new CdpClient(this.debugUrl);
    await client.ready();

    const targets = (await client.send('Target.getTargets')) as {
      targetInfos: Array<{ type: string; targetId: string; url: string }>;
    };
    const pageTarget = targets.targetInfos.find((t) => t.type === 'page');

    let sessionId: string;
    if (pageTarget) {
      const attached = (await client.send('Target.attachToTarget', {
        targetId: pageTarget.targetId,
        flatten: true,
      })) as { sessionId: string };
      sessionId = attached.sessionId;
    } else {
      const created = (await client.send('Target.createTarget', {
        url: 'about:blank',
      })) as { targetId: string };
      const attached = (await client.send('Target.attachToTarget', {
        targetId: created.targetId,
        flatten: true,
      })) as { sessionId: string };
      sessionId = attached.sessionId;
    }

    return new CdpTab(url, client, sessionId);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      this.process.kill('SIGTERM');
    } catch {
      // ignore
    }
    await new Promise<void>((resolve) => {
      this.process.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
  }
}

/**
 * Launches headless Chrome with remote debugging enabled and returns a
 * `BrowserLauncherLike` bound to its CDP endpoint.
 *
 * @param flags Chrome flags (defaults merged in); `--remote-debugging-port`
 *   is added automatically on a free port.
 * @returns A `Promise<BrowserLauncherLike>` that resolves once CDP is ready.
 */
export const createCdpLauncher: LauncherFn = async (flags = []): Promise<BrowserLauncherLike> => {
  const debugPort = await findFreePort();
  const debugUrl = `http://127.0.0.1:${debugPort}`;

  const chromeFlags = [
    ...flags,
    `--remote-debugging-port=${debugPort}`,
    `--remote-debugging-address=127.0.0.1`,
    '--no-first-run',
    '--no-default-browser-check',
  ];

  const process = spawn(CHROME_BIN, chromeFlags, {
    stdio: 'ignore',
    detached: false,
  });

  return new Promise<BrowserLauncherLike>((resolve, reject) => {
    let resolved = false;
    process.on('error', (err: Error) => {
      if (!resolved) reject(err);
    });
    process.on('exit', (code: number | null) => {
      if (!resolved) {
        reject(new Error(`Chrome exited early with code ${code}`));
      }
    });

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`${debugUrl}/json/version`);
        if (response.ok) {
          const json = (await response.json()) as { webSocketDebuggerUrl: string };
          resolved = true;
          resolve(new CdpLauncher(process, json.webSocketDebuggerUrl));
          return;
        }
      } catch {
        // not ready yet
      }
      setTimeout(poll, 100);
    };
    poll();
  });
};

/** Find a free TCP port on localhost. */
async function findFreePort(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      server.close(() => resolve(port));
    });
  });
}
