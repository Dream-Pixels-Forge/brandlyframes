---
'@brandlyframes/cloud': minor
---

feat(cloud): deploy plan, artifact-free audio concat, props by reference, warm render pool, tenant safety, preview links [BF-470, BF-472, BF-473, BF-474, BF-475, BF-300]

- **BF-470 one-command cloud (plan/dry-run)**: `planCloudDeploy` computes the
  IAM roles, buckets and functions a deploy WOULD create (deterministic names,
  no cloud calls, no credentials) and `formatDeployPlan` prints them;
  `CLOUD_ERROR_EXPLANATIONS` + `explainCloudError` map cloud error codes to
  plain-language explanations and fixes for `cloud doctor`.
- **BF-472 artifact-free audio concat**: `buildAudioConcatList` /
  `buildAudioConcatArgs` / `concatAudioStreams` concatenate per-chunk audio
  with the FFmpeg concat demuxer and stream copy (`-c:a copy -copyts`, exact
  frame-mapped outpoints — no re-encoding, no boundary clicks); the injectable
  spawn mirrors the renderer's mix/stitch pattern. `runAudioDriftHarness`
  replays a synthetic 10-minute timeline (18000 frames @ 30 fps) through a
  deterministic mocked clock (`createMockClock`) and measures A/V drift at
  every chunk boundary — pure computation, no real render.
- **BF-473 large props by reference**: `createPropRef(data)` stores the payload
  in an injectable `PropRefStore` (in-memory adapter included) and returns a
  branded `PropRef` handle; `resolvePropRefs` walks props and resolves handles
  renderer-side before invoke; `estimatePropsBytes` / `assertPropsUnderLimit`
  enforce the 256 KiB inline budget (`PropSizeExceededError`).
- **BF-474 warm render server**: `WarmRenderPool` interface with pre-launched
  workers, pre-loaded bundles, a priority queue (higher first, FIFO within),
  and `onScaleUp`/`onScaleDown` autoscaling hooks;
  `InMemoryWarmPool` is the reference mock (injectable launch/clock, no real
  browsers) with acquire/release/preloadBundle/stats/dispose.
- **BF-475 safe multi-tenant rendering**: `validateTenantProps` entry point
  (size, JSON-safety, depth), `TenantRenderLimits` resource/time limits with
  the `networkSandbox` flag carried on every invocation, `TenantQuotaLedger`
  per-tenant concurrency + fixed-window quotas, and `MockTenantOrchestrator`
  enforcing all of it around an injected mock render (slots always released).
- **BF-300 shareable preview links**: `buildPreviewLink` emits frame-accurate
  anchors (`#frame=123&t=4.1`, exact `frame / fps`, never rounded) and
  `parsePreviewLink` round-trips them; `PreviewCommentStore` interface with an
  `InMemoryCommentStore` adapter (frame-filtered listing, resolve flag,
  mocked-clock timestamps).
