# Goal: Docs site UX — section sidebar with sub-nav, code copy buttons, premium landing

## Goal: Docs site UX refactor — variant-based sidebar with sub-navigation, code copy buttons, premium landing page

### Objective
Restructure the docs site chrome so the sidebar appears only on section pages (Get Started/docs, API, Guides, Examples, Blog — never on the landing page) with per-section sub-navigation, add a copy button to every code block, and refactor the landing page into a premium composition using the project's Cinema Black design language.

### Context
The docs site currently renders the same sidebar on every page including the landing page, the sidebar nav is a flat list with no sub-content, code blocks have no copy affordance, and the landing hero is text-only with no visual anchor. The user requested this refactor citing the `design-language` and `composition-language` skills plus `dpf-cinematic-scrolly` and `dpf-movematics`. **The latter two do not exist** in `/home/dimona/.agents/skills/` — verified. Substitutes: `design-language` (Apply mode against GOAL_00 §5b Cinema Black spec, which is this project's written design language) and `composition-language` (focal hierarchy, negative space, CRAP repetition for the landing refactor). Motion numbers come from the design-language motion layer via GOAL_00 §5b: ease-out, 150–250 ms, no bouncy UI animation.

### Deliverables
- [ ] `RootLayout` accepts `variant?: 'landing' | 'docs'` (default `'docs'`); `variant='landing'` renders no `<aside>`, no burger button, and a full-width `main`/footer without `lg:ml-72`
- [ ] Landing page (`routes/index.tsx`) passes `variant="landing"`
- [ ] Docs-variant sidebar shows section groups with sub-content: **Get Started** (Getting Started, Core Concepts, Frame Video, Player, Test Clips), **Guides** (Rendering Videos, Brand Guide, Remotion Migration), plus single links for API Reference, Examples, Blog; active page highlighted
- [ ] Real routes exist for `/examples` and `/blog` (currently dead links) — premium placeholder pages wrapped in RootLayout
- [ ] Every `pre.code-block` on every page gains a copy button (clipboard write + "Copied" feedback), implemented once in RootLayout via MutationObserver — no per-page edits
- [ ] Scroll-reveal re-enabled safely: `.js .animate-on-scroll:not(.visible)` hidden via IntersectionObserver; without JS (no `.js` class on `<html>`) content stays visible
- [ ] Landing hero refactored per composition-language: one focal hierarchy (badge → headline → CTA), anamorphic-flare motif + subtle film grain (both sanctioned by GOAL_00 §5b for marketing surfaces), code-window card moved into the hero as the visual anchor, standalone "Your First Composition" section removed, section eyebrows added
- [ ] Design decisions documented in `dev-notes/docs-redesign-notes.md` mapping each change to a Cinema Black token or composition principle
- [ ] Changesets ignored — docs-site is private; work committed on `feature/bf-020-headless-capture`

### Definition of Done
- [ ] On `/`: `document.querySelector('aside')` is `null`; on `/docs/getting-started`, `/guides/rendering`, `/guides/brand-guide`, `/guides/migration`, `/api/`, `/examples`, `/blog`: an `<aside>` exists and `main` has `margin-left: 288px` at 1440×900
- [ ] On `/docs/getting-started` the sidebar contains links to "Frame Video" and "Test Clips"; on `/guides/brand-guide` it contains "Rendering Videos" and "Remotion Migration"
- [ ] On `/docs/getting-started`: count of `pre.code-block` equals count of `.copy-btn`; clicking the first button writes the code text to the clipboard (Playwright clipboard permission) and the button label changes to "Copied"
- [ ] On `/`: no `<aside>`, `.hero-flare` element exists, hero section has grain class, a code window is present in the hero, no pageerror in console
- [ ] `.animate-on-scroll` elements on `/` gain `.visible` after being scrolled into view
- [ ] `pnpm lint` and `pnpm --filter @brandlyframes/docs-site type-check` pass with zero errors
- [ ] All pages render with zero Playwright `pageerror`s: `/`, `/docs/getting-started`, `/guides/rendering`, `/guides/brand-guide`, `/guides/migration`, `/api/`, `/examples`, `/blog`

### Verification Steps
1. Start dev server: `cd docs-site && pnpm dev --port 4321`
2. Run the Playwright verification script (aside presence per route, sub-nav links, copy-button count + clipboard round-trip, hero flare/grain/code-window, reveal visibility, pageerror collection)
3. `pnpm lint` — zero errors
4. `pnpm --filter @brandlyframes/docs-site type-check` — zero errors
5. `git status` — only intended files changed

### Anti-Drift Rules
- Do not touch `packages/*` SDK code — this goal is docs-site chrome + landing page only
- Do not build real Examples/Blog content systems — placeholder pages only
- Do not invent colors, fonts, or motion curves outside GOAL_00 §5b (Cinema Black) tokens
- The missing skills (`dpf-cinematic-scrolly`, `dpf-movematics`) are reported, not silently skipped
- If clipboard API is unavailable in the test context, verify button existence + label feedback and report the clipboard limitation instead of faking success

### Estimated Effort
~1.5–2 hours: layout variant + sub-nav (45m), copy button + reveal effects (30m), landing refactor (30m), placeholder pages (15m), verification + audit (20m)

---

## Appendix: design decisions (skills applied)

### design-language — Apply mode (Cinema Black, GOAL_00 §5b)
| Change | Token / rule |
|---|---|
| Copy button: `bg-surface-elevated`, `border-border-primary`, hover `text-accent` | `--bf-surface-2`, `--bf-border`, `--bf-orange` |
| Active sidebar item: `accent-dim` tint fill | `--bf-orange-dim` (15% alpha selection fill) |
| Hero flare: single 1px orange streak, low opacity | Anamorphic flare motif — "hero/marketing visuals only" |
| Grain: ~4% opacity noise on hero only | Film grain — "marketing surfaces only, never over the preview canvas" |
| Reveal motion: 500 ms? No — transitions use existing `--ease-cinematic` 350 ms token; hover/press stay 150–250 ms | Motion: ease-out, 150–250 ms, no bounce |
| Group labels: `text-caption` uppercase, `--bf-text-muted` | Typography hierarchy, muted secondary text |
| Orange share stays ≤ ~5% of any screen (badge, active item, flare, CTA) | Accent discipline rule |

### composition-language
- **One thing leads**: hero focal = headline; CTA pair secondary; code window demoted to supporting anchor below the fold-line of the hero — removed the duplicate standalone code section so the code window appears exactly once
- **Negative space**: hero keeps generous vertical padding (pt-24/32) and max-w-3xl measure on the lede paragraph
- **CRAP repetition**: every section header gets the same eyebrow (caption, uppercase, tracked, orange) → heading → lede pattern
- **Framing/depth**: code window uses card + surface-elevated chrome (window dots) to read as a physical artifact against the black ground
- **Edges audit**: flare is centered and behind text (z-order below content), grain is pointer-events-none and full-bleed — nothing competes with the headline
