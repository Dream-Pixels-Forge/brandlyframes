---
"@brandlyframes/renderer": minor
"@brandlyframes/cli": minor
---

Print + video from one source (BF-524): a `<Composition>` that renders MP4 now also prints. `@brandlyframes/renderer` gains `buildPosterPdf` — a hand-rolled multi-page PDF writer (300 DPI default, N-up tiling, FlateDecode image XObjects, deterministic bytes) plus `pdfPageDimensions`, `estimatePosterPages`, `hashPosterPdf`. The `@brandlyframes/cli` gains a `poster <url> <out> <start> <end>` subcommand: captures the same frames headlessly via CDP, decodes PNG → raw RGBA, and assembles the print PDF. 16 renderer + 3 CLI tests.
