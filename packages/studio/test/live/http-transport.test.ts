/*!
 * @vitest-environment node
 */
/**
 * BF-303 live mode — HttpLiveTransport: local HTTP + WebSocket endpoint for
 * OBS browser-source overlays. Real node:http on an ephemeral localhost
 * port; no external services.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { get } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { connect } from 'node:net';
import type { Socket } from 'node:net';
import { HttpLiveTransport } from '../../src/http-live-transport';

const WS_ACCEPT_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Minimal WS test client: RFC 6455 handshake + decode unmasked server text
 * frames (server→client frames are unmasked; browser sources send nothing).
 */
class TestWsClient {
  private buffer = Buffer.alloc(0);
  private readonly messages: string[] = [];
  private readonly waiters: ((value: string) => void)[] = [];

  private constructor(private readonly socket: Socket, private readonly handshake: string, private readonly requestKey: string) {
    socket.on('data', (chunk: Buffer) => this.consume(chunk));
  }

  static async connect(port: number, path: string): Promise<TestWsClient> {
    const requestKey = createHash('sha1').update(String(Math.random())).digest('base64');
    const socket = connect(port, '127.0.0.1');
    const handshake = await new Promise<string>((resolve, reject) => {
      let text = '';
      const onData = (chunk: Buffer) => {
        text += chunk.toString('utf8');
        if (text.includes('\r\n\r\n')) {
          socket.off('data', onData);
          resolve(text);
        }
      };
      socket.on('data', onData);
      socket.once('error', reject);
      socket.write(
        `GET ${path} HTTP/1.1\r\n` +
          `Host: 127.0.0.1:${port}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${requestKey}\r\n` +
          `Sec-WebSocket-Version: 13\r\n\r\n`,
      );
    });
    return new TestWsClient(socket, handshake, requestKey);
  }

  private consume(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // Server→client frame: FIN+opcode(2B) + length (7-bit, 16-bit or 64-bit).
    while (this.buffer.length >= 2) {
      const opcode = this.buffer[0] & 0x0f;
      const len0 = this.buffer[1] & 0x7f;
      let offset = 2;
      let length = len0;
      if (len0 === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (len0 === 127) {
        if (this.buffer.length < 10) return;
        length = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      if (this.buffer.length < offset + length) return;
      const payload = this.buffer.subarray(offset, offset + length).toString('utf8');
      this.buffer = this.buffer.subarray(offset + length);
      if (opcode === 0x1) {
        this.messages.push(payload);
        const waiter = this.waiters.shift();
        if (waiter) waiter(payload);
      }
    }
  }

  /** Resolve with the next text message (fails after `timeoutMs`). */
  next(timeoutMs = 2000): Promise<string> {
    const buffered = this.messages.shift();
    if (buffered !== undefined) return Promise.resolve(buffered);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for WS message')), timeoutMs);
      this.waiters.push((payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  get handshakeResponse(): string {
    return this.handshake;
  }

  get sentWebSocketKey(): string {
    return this.requestKey;
  }

  destroy(): void {
    this.socket.destroy();
  }
}

function httpGet(url: string): Promise<{ status: number; body: string; type: string }> {
  return new Promise((resolve, reject) => {
    get(url, (res: IncomingMessage) => {
      let body = '';
      res.on('data', (c: Buffer) => (body += c.toString('utf8')));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, body, type: String(res.headers['content-type']) }),
      );
    }).on('error', reject);
  });
}

describe('HttpLiveTransport (BF-303 browser-source overlay server)', () => {
  it('serves the overlay page over local HTTP', async () => {
    const transport = new HttpLiveTransport({ port: 0 });
    await transport.start();
    try {
      const res = await httpGet(transport.url);
      expect(res.status).toBe(200);
      expect(res.type).toContain('text/html');
      expect(res.body).toContain('id="brandlyframes-overlay"'); // mount point
      expect(res.body).toContain('#0A0A0A'); // Cinema Black dark default
      expect(res.body).toContain('WebSocket');
    } finally {
      await transport.stop();
    }
  });

  it('upgrades WebSocket connections with the RFC 6455 accept key', async () => {
    const transport = new HttpLiveTransport({ port: 0 });
    await transport.start();
    try {
      const port = Number(new URL(transport.url).port);
      const client = await TestWsClient.connect(port, '/');
      expect(client.handshakeResponse).toMatch(/^HTTP\/1\.1 101/);
      const acceptHeader = client.handshakeResponse
        .split('\r\n')
        .find((line) => line.startsWith('Sec-WebSocket-Accept:'));
      const expected = createHash('sha1').update(client.sentWebSocketKey + WS_ACCEPT_GUID).digest('base64');
      expect(acceptHeader).toBe(`Sec-WebSocket-Accept: ${expected}`);
      client.destroy();
    } finally {
      await transport.stop();
    }
  });

  it('pushes frame updates to every connected browser source', async () => {
    const transport = new HttpLiveTransport({ port: 0 });
    await transport.start();
    try {
      const port = Number(new URL(transport.url).port);
      const a = await TestWsClient.connect(port, '/');
      const b = await TestWsClient.connect(port, '/');
      transport.sendFrame({ frame: 42, elapsedMs: 700 });
      const msgA = JSON.parse(await a.next());
      const msgB = JSON.parse(await b.next());
      expect(msgA).toEqual({ frame: 42, elapsedMs: 700 });
      expect(msgB).toEqual({ frame: 42, elapsedMs: 700 });
      a.destroy();
      b.destroy();
    } finally {
      await transport.stop();
    }
  });

  it('stop() releases the port', async () => {
    const transport = new HttpLiveTransport({ port: 0 });
    await transport.start();
    const url = transport.url;
    await transport.stop();
    await expect(httpGet(url)).rejects.toThrow();
  });
});
