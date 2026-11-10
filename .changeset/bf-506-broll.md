---
"@brandlyframes/procedural": minor
---

Add auto-generated B-roll & cutaways (BF-506, part of #91): `buildBrollPlan(keywords, {keywordTable, fallbackGenerator, clipLength, gap})` maps script keywords ("ocean", "city", "forest"…) to deterministic procedural generators (fractal/terrain/cellular/L-system) with stable FNV-1a-derived seeds; `resolveBrollClip` turns a clip into a concrete generator config (defaults + keyword overrides); `weaveBroll(mains, plan, mapping)` inserts clips between main segments and shifts later segments to make room. `DEFAULT_KEYWORD_TABLE` ships 13 mappings. Pure + deterministic.
