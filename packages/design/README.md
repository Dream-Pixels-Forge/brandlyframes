# @brandlyframes/design

Cinema Black design system for BrandlyFrames — tokens + deterministic React
UI components (**BF-013**, v0.2 "Projector"). Source of truth:
[`dev-notes/DESIGN.md`](../../dev-notes/DESIGN.md).

## Tokens (three synced forms)

| Form | File | Use |
|---|---|---|
| CSS variables | `src/tokens.css` (`@brandlyframes/design/tokens.css`) | Dark default on `:root`, light inverse via `[data-theme='paper']` |
| TypeScript | `src/tokens.ts` | `designTokens` const map, `cssVar('bf-orange')` helper |
| JSON | `tokens.json` (`@brandlyframes/design/tokens.json`) | Flat machine-readable map (tooling/Figma export) |

All three carry the exact palette from DESIGN.md §2 (`--bf-black #0A0A0A`,
`--bf-surface-1 #111111`, `--bf-surface-2 #1A1A1A`, `--bf-border #2A2A2A`,
`--bf-text-muted #8A8A8A`, `--bf-white #FAFAFA`, `--bf-orange #FF6A00`,
`--bf-orange-hover #FF8533`, `--bf-orange-dim #FF6A0026`); consistency is
enforced by `test/tokens.test.ts`. Orange is the only accent (≤ ~5% of any
screen). Every shipped text pair passes WCAG AA (≥ 4.5:1), gated in
`test/contrast.test.ts` with the pure math from `src/contrast.ts`.

## Components

`Button` (primary/secondary/ghost) · `Panel` · `Tabs` · `Tooltip` · `Toast` ·
`Progress` (bar + clapper) · `FrameCounter` (`FRAME 0042 / 0300`) ·
`TimecodeInput` (`HH:MM:SS:FF`) · `LogoLockup`. All deterministic under
`react-dom/server` (no `Math.random`, no `Date.now`, no generated ids) and
styled through the tokens.

```tsx
import { Button, FrameCounter } from '@brandlyframes/design';
import '@brandlyframes/design/tokens.css';

<Button variant="primary">Render</Button>
<FrameCounter frame={42} total={300} />
```

## Dev

```bash
pnpm test          # vitest run
pnpm type-check    # tsc --noEmit
```
