# DESIGN — "Cinema Black" Design System

> Source of truth: GOAL_00 §5b. Ships as `@brandlyframes/design`
> (tokens + React components) and is used by Studio, Player, docs site,
> templates, and CLI output.
> Tracked as BF-013 (v0.2 "Projector"); the P2 DoD gate requires UI matches
> Cinema Black tokens and WCAG AA contrast passes.

## 1. Identity

Black, white, and orange accents, like a cinema: dark theater, projector
light, slate and timecode. **Orange is the only color**; it is used
sparingly, like a projector beam or a "REC" light.

## 2. Color tokens (exact values)

| Token | Value | Use |
|---|---|---|
| `--bf-black` | `#0A0A0A` | App background, canvas surround ("theater dark") |
| `--bf-surface-1` | `#111111` | Panels, sidebar |
| `--bf-surface-2` | `#1A1A1A` | Cards, inputs, timeline tracks |
| `--bf-border` | `#2A2A2A` | Dividers, outlines |
| `--bf-text-muted` | `#8A8A8A` | Secondary text, labels |
| `--bf-white` | `#FAFAFA` | Primary text, icons |
| `--bf-orange` | `#FF6A00` | Accent: playhead, primary buttons, active state, focus ring, REC |
| `--bf-orange-hover` | `#FF8533` | Hover on accent |
| `--bf-orange-dim` | `#FF6A0026` | Selection fill, glow (15% alpha) |

## 3. Token rules

- **Accent orange covers at most ~5% of any screen.** No second accent color.
- Semantic states: **error** uses white text on a dark-orange tint with an
  icon (no red); **success** is white with a check icon. **Never rely on
  color alone.**
- Light theme exists as an inverse ("Paper"): white background, black text,
  same orange accent. **Dark is the default.**
- **WCAG AA contrast minimum** on all text.

## 4. Typography

| Role | Face | Rules |
|---|---|---|
| Display | **Bebas Neue or Oswald** (condensed, poster-style sans) | Uppercase, wide tracking; titles and the logo |
| UI | **Inter** | All interface text |
| Timecode / code / frame numbers | **JetBrains Mono** | Always **tabular**; timecode formatted `HH:MM:SS:FF` |

## 5. Cinema motifs (use with restraint)

- **Playhead** — a thin orange line with a small orange marker; scrubbing
  shows a live timecode.
- **Letterbox bars** — the preview canvas sits in black with optional
  2.39:1 / 16:9 / 9:16 safe-area guides.
- **Slate / clapperboard** — loading and render-progress states use a clapper
  animation; the render counter reads "SCENE 01 / TAKE 03" style labels.
- **Film grain** — a subtle optional grain overlay on **marketing surfaces
  only, never over the preview canvas**.
- **REC indicator** — a pulsing orange dot while rendering.
- **Frame counter** — persistent mono readout `FRAME 0042 / 0300`.
- **Anamorphic flare** — a thin horizontal orange streak, used only on
  hero/marketing visuals.
- Motion: ease-out, 150–250 ms, no bouncy UI animation; cinematic fades for
  page transitions.

## 6. Component list (`@brandlyframes/design`)

Button (primary orange / secondary outline / ghost), Timeline (tracks,
playhead, markers), Scrubber, Panel, Tabs, Props editor fields, Tooltip,
Toast, Progress (clapper + bar), Modal, Command palette, Frame counter,
Timecode input, Logo lockup.

## 7. Applied to

- **Studio & Player** — black UI shell, orange playhead and primary actions,
  white text.
- **Docs site** — black default with white text, orange links and code
  highlights, cinematic hero.
- **CLI** — monochrome output with a single orange (ANSI 208 / truecolor
  `#FF6A00`) for the prompt, progress bar, and success lines; respects
  `NO_COLOR`.
- **Templates & `create-brandlyframes`** — default compositions use the
  black/white/orange palette.
- **Logo** — wordmark "BRANDLYFRAMES" in display type, with a frame-bracket
  or clapper mark in orange on black; provide SVG in black, white, and
  orange versions.

## 8. Deliverables

- Design tokens as **CSS variables + TypeScript + JSON** via **Style
  Dictionary**.
- A **Storybook** of all components.
- A brand guide page in the docs.
- Figma/Paper-ready token export.

Every new UI surface — including post-1.0 phases P9–P19 — follows Cinema
Black (GOAL_00 §7b).
