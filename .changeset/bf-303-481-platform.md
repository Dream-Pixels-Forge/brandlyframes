---
'@brandlyframes/studio': minor
'brandlyframes': minor
---

feat: live mode + template gallery & no-code props form [BF-303][BF-481]

- `@brandlyframes/studio/live` (Node-only subpath): live mode for real-time
  broadcast overlays — `LiveServer` ticks a composition on a wall-time
  deterministic clock (frames derived from absolute wall time, never
  integrated from ticks; ticks scheduled on the absolute frame grid, so
  60 fps for an hour accumulates zero drift — validated with an accelerated
  mocked clock over a simulated hour, 216,000 tick broadcasts, exact at
  every point). `HttpLiveTransport` is the local HTTP/WebSocket browser-source
  endpoint (Cinema Black overlay page + RFC 6455 frame pushes); NDI/WebRTC
  adapters implement the same injectable `LiveTransport` interface (mock
  transport in tests).
- `@brandlyframes/studio`: `TemplateGallery` browses the core template
  registry (injectable `GalleryRegistry`; default adapter
  `coreTemplateGalleryRegistry`), with preview thumbnails and a use-template
  flow, and `NoCodePropsForm` renders a template's Zod `propsSchema` as a
  fillable, validated form (string/number/boolean/enum inputs, JSON fallback)
  with a render-from-form action.
- `brandlyframes`: new `brandlyframes/template-registry` subpath export
  exposing the existing BF-302 template registry (`registerTemplate`,
  `getTemplate`, `listTemplates`, `clearTemplates`) so host apps and the
  studio gallery can consume it.
