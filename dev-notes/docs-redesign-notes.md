# Docs site redesign notes — 2026-10-20

Goal: `dev-notes/Goals/GOAL_01_DOCS_SITE_UX.md`

## Skills applied

- **design-language** — Apply mode against the project's written design language: Cinema Black (GOAL_00 §5b). No new colors, fonts, or motion curves invented.
- **composition-language** — landing page composition (focal hierarchy, negative space, CRAP repetition, framing).
- **Not available**: `dpf-cinematic-scrolly`, `dpf-movematics` — these skills do not exist in `/home/dimona/.agents/skills/` (verified by directory listing). Motion polish therefore follows the design-language motion layer via GOAL_00 §5b: ease-out, 150–250 ms for UI, cinematic fades for page transitions, no bounce.

## Change → token / principle map

| Change | Token / rule | Source |
|---|---|---|
| Sidebar only on section pages (`variant="docs"`), never on landing | Information architecture — landing is a marketing surface, docs chrome is a reading surface | composition-language (intent first) |
| Sidebar sub-nav (Get Started → 5 docs pages; Guides → 3 pages) | Gestalt proximity: children grouped under an uppercase muted label | design-language (space layer) |
| Active sidebar item: `accent-dim` tint + accent text | `--bf-orange-dim` selection fill; never rely on color alone (text also changes weight/color) | GOAL_00 §5b |
| Copy button: `surface-elevated` bg, `border-primary`, hover accent | `--bf-surface-2`, `--bf-border`, `--bf-orange` | GOAL_00 §5b |
| Copy feedback "✓ Copied" text + icon swap | Semantic states without relying on color alone | GOAL_00 §5b |
| Hero anamorphic flare (1px orange streak, 55% opacity, glow) | Anamorphic flare motif — hero/marketing visuals only | GOAL_00 §5b |
| Hero film grain at 5% opacity, hero section only | Film grain — marketing surfaces only, never over preview canvas | GOAL_00 §5b |
| Code window in hero (window dots + mono filename) | Framing principle — code reads as a physical artifact against black ground | composition-language |
| Single code window on landing (removed duplicate section) | One thing leads — one supporting anchor, not two competing ones | composition-language |
| Section eyebrows (orange dash + caption, uppercase) | CRAP repetition — every section header shares one pattern | composition-language |
| Reveal transitions use `--ease-cinematic` 350 ms; hovers stay 150 ms | Motion: ease-out, 150–250 ms, no bounce | GOAL_00 §5b |
| Reveal gated on `html.js` class | Accessibility/robustness: no JS → content fully visible | design-language (accessibility layer) |
| Badge updated to "v1.0.0 — Premiere Night" | Truthful versioning (was stale v0.1.0 Public Beta) | — |

## Implementation notes

- Copy buttons are injected once from `RootLayout` via `MutationObserver` over `#main-content`, so every current and future `pre.code-block` is covered with zero per-page edits.
- Scroll reveal uses one IntersectionObserver; `unobserve` after reveal keeps it O(n) once.
- `/examples` and `/blog` were dead links before; both now have real placeholder pages (Examples lists the five `create-brandlyframes` templates; Blog lists three posts linking into real docs pages).
