---
'@brandlyframes/cache': minor
---

feat: remote asset cache with checksums, retry and prefetch [BF-428]

`@brandlyframes/cache` is repurposed as the remote asset cache for
BrandlyFrames: content-addressed caching of remote assets (fonts, videos,
images) with SHA-256 checksums, retry with exponential backoff, LRU/TTL
eviction and a `prefetch()` helper. Replaces the previous frame-render-cache
experiment; no dependency on `brandlyframes` core.
