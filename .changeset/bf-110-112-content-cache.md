---
'@brandlyframes/cache': minor
'@brandlyframes/renderer': minor
'@brandlyframes/cli': minor
'@brandlyframes/studio': minor
---

feat: content-addressed frame/layer cache [BF-110][BF-111][BF-112]

- `@brandlyframes/cache`: `canonicalJson` + `frameCacheKey` — stable SHA-256
  keys over canonical JSON of (composition config + props + frame + render
  params); pluggable `CacheStore` interface with an fs store (`FsStore`) and
  S3/GCS interface stubs (`S3Store`/`GcsStore`); `ContentCache` with
  hit/miss counters and `getOrCompute`.
- `@brandlyframes/renderer`: `runRenderJob` accepts `cacheDir` to reuse
  frames across identical renders and reports `cacheHits` / `cacheMisses`.
- `@brandlyframes/cli`: `brandlyframes render --cache <dir>` enables the
  frame cache and prints hit/miss counters with hit rate.
- `@brandlyframes/studio`: `CacheCounters` component surfaces cache stats.
