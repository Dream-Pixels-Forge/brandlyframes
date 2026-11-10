# @brandlyframes/procedural

## 1.3.0

### Minor Changes

- 3b826ff: Add auto-generated B-roll & cutaways (BF-506, part of #91): `buildBrollPlan(keywords, {keywordTable, fallbackGenerator, clipLength, gap})` maps script keywords ("ocean", "city", "forest"…) to deterministic procedural generators (fractal/terrain/cellular/L-system) with stable FNV-1a-derived seeds; `resolveBrollClip` turns a clip into a concrete generator config (defaults + keyword overrides); `weaveBroll(mains, plan, mapping)` inserts clips between main segments and shifts later segments to make room. `DEFAULT_KEYWORD_TABLE` ships 13 mappings. Pure + deterministic.

### Patch Changes

- @brandlyframes/noise@1.3.0
  - @brandlyframes/shapes@1.3.0
  - brandlyframes@1.3.0

## 1.2.0

### Minor Changes

- 4311b19: Add frame-by-frame L-system growth (BF-514): `lSystemGrowthPath` renders a growing subset of a derived string each frame so plants, coral, and lightning extend over time like a time-lapse. Includes `plantGrowth` / `coralGrowth` / `lightningGrowth` presets and `countLSystemCommands` / `lSystemTotalCommands` helpers. Pure math — the full string is derived once; growth only gates which segments draw.

### Patch Changes

- @brandlyframes/noise@1.2.0
  - @brandlyframes/shapes@1.2.0
  - brandlyframes@1.2.0
