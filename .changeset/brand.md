---
'@brandlyframes/brand': patch
---

feat: useBrand() loads from brand.json [BF-140]

- `useBrand(brandId)` loads and validates `brand.json` from project root
- `loadBrandKitFromFile(filePath)` loads a brand kit from any JSON file
- Falls back to default kit when no brand.json exists
- Validates against brandKitSchema (name, primaryColor, secondaryColor, fontFamily, logoUrl)
