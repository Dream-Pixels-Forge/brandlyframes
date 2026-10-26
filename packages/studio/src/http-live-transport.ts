/**
 * BF-303 live mode — HttpLiveTransport: the local HTTP/WebSocket endpoint an
 * OBS-style browser source points at (add a Browser Source with the
 * transport URL). Serves a Cinema Black overlay page that renders the frame
 * pushed on the wall-time deterministic clock, and upgrades WebSocket
 * connections to receive every frame update (RFC 6455, server→client text
 * frames only — a browser source sends nothing back).
 */
import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import type { LiveFrameMessage, LiveTransport } from './live-server';

export interface HttpLiveTransportOptions {
  /** TCP port to bind. Default: 0 (ephemeral) — read the real one from {@link url}. */
  readonly port?: number;
  /** Bind address. Default `127.0.0.1` — a local overlay endpoint. */
  readonly host?: string;
}

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** Unmasked server→client text frame (RFC 6455 §5.1). */
function encodeTextFrame(payload: string): Buffer {
  const data = Buffer.from(payload, 'utf8');
  const length = data.length;
  let header: Buffer;
  if (length < 126) {
    header = Buffer.from([0x81, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  return Buffer.concat([header, data]);
}

/**
 * Dark overlay page (Cinema Black tokens): a mount point for the host's
 * composition plus a live frame readout driven by the pushed WS messages.
 */
function overlayPage(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>BrandlyFrames Live Overlay</title>
<style>
  html, body { margin: 0; height: 100%; background: #0A0A0A; color: #FAFAFA;
    font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  #brandlyframes-overlay { display: flex; align-items: center; justify-content: center;
    height: 100%; font-size: 24px; letter-spacing: 0.12em; }
  #brandlyframes-overlay .frame { color: #FF6A00; }
</style>
</head>
<body>
<div id="brandlyframes-overlay">FRAME <span class="frame">------</span></div>
<script>
  // Receives {"frame":N,"elapsedMs":T} pushes from the live server's
  // wall-time deterministic clock and mirrors them onto the mount point
  // (text readout + data-frame attribute hosts can key their composition on).
  var mount = document.getElementById('brandlyframes-overlay');
  var readout = mount.querySelector('.frame');
  var ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/');
  ws.onmessage = function (event) {
    var message = JSON.parse(event.data);
    mount.setAttribute('data-frame', String(message.frame));
    readout.textContent = ('000000' + message.frame).slice(-6);
  };
</script>
</body>
</html>
`;
}

/**
 * Local HTTP + WebSocket transport for browser-source overlays. Implements
 * {@link LiveTransport}; pair with {@link LiveServer}, which drives it from
 * the wall-time deterministic clock. NDI/WebRTC adapters implement the same
 * interface.
 */
export class HttpLiveTransport implements LiveTransport {
  private readonly port: number;
  private readonly host: string;
  private server: Server | null = null;
  private readonly connections = new Set<Duplex>();

  constructor(options: HttpLiveTransportOptions = {}) {
    this.port = options.port ?? 0;
    this.host = options.host ?? '127.0.0.1';
  }

  /** Human-readable page URL (available after {@link start}). */
  get url(): string {
    const address = this.server?.address();
    if (typeof address !== 'object' || address === null) {
      throw new Error('HttpLiveTransport: not started');
    }
    return `http://${this.host}:${address.port}/`;
  }

  async start(): Promise<void> {
    if (this.server) throw new Error('HttpLiveTransport: already started');
    const server = createServer((_request: IncomingMessage, response: ServerResponse) => {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(overlayPage());
    });
    server.on('upgrade', (request, socket) => this.handleUpgrade(request, socket));
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(this.port, this.host, () => {
        server.off('error', reject);
        resolve();
      });
    });
    this.server = server;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = null;
    for (const socket of this.connections) socket.destroy();
    this.connections.clear();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  sendFrame(message: LiveFrameMessage): void {
    const payload = encodeTextFrame(JSON.stringify(message));
    for (const socket of this.connections) {
      if (!socket.destroyed) socket.write(payload);
    }
  }

  private handleUpgrade(request: IncomingMessage, socket: Duplex): void {
    const key = request.headers['sec-websocket-key'];
    const isWebSocket = request.headers.upgrade?.toLowerCase() === 'websocket';
    if (!isWebSocket || typeof key !== 'string') {
      socket.destroy();
      return;
    }
    const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    // Browser sources never send data; incoming bytes are discarded rather
    // than parsed. shortcut: no client-frame parsing or close codes, upgrade
    // when a two-way overlay control channel is needed.
    socket.on('data', () => undefined);
    this.connections.add(socket);
    socket.once('close', () => this.connections.delete(socket));
    socket.once('error', () => {
      this.connections.delete(socket);
      socket.destroy();
    });
  }
}
