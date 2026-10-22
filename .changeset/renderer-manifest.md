---
'@brandlyframes/renderer': patch
---

feat: extend render manifest with reproducibility fields [BF-429]

- `RenderManifest` now includes optional `sdkVersion`, `propsHash`, `assetHashes`, `seed`, `encoderFlags`
- `RenderJobOptions` accepts the same fields for reproducibility and debuggability
- Fresh renders write the manifest with all fields before capturing
