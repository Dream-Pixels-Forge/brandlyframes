/**
 * BF-303 live mode — real-time broadcast overlays.
 *
 * {@link LiveServer} ticks a composition on a wall-time deterministic clock
 * (60 fps for an hour without drift — the frame is derived from absolute
 * wall time, never integrated from ticks); {@link HttpLiveTransport} is the
 * local HTTP/WebSocket endpoint an OBS-style browser source opens. NDI and
 * WebRTC output adapters implement the same injectable
 * {@link LiveTransport} interface.
 *
 * Node-only (uses node:http): imported via `@brandlyframes/studio/live`, so
 * the browser-safe root entry stays DOM-only.
 */
export { frameAt, wallClock, type LiveClock } from './live-clock';
export {
  LiveServer,
  type LiveFrameMessage,
  type LiveTimers,
  type LiveServerOptions,
  type LiveTransport,
} from './live-server';
export { HttpLiveTransport, type HttpLiveTransportOptions } from './http-live-transport';
