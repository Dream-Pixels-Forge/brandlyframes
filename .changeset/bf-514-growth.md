---
"@brandlyframes/procedural": minor
---

Add frame-by-frame L-system growth (BF-514): `lSystemGrowthPath` renders a growing subset of a derived string each frame so plants, coral, and lightning extend over time like a time-lapse. Includes `plantGrowth` / `coralGrowth` / `lightningGrowth` presets and `countLSystemCommands` / `lSystemTotalCommands` helpers. Pure math — the full string is derived once; growth only gates which segments draw.
