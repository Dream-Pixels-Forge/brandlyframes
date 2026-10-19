import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/guides/brand-guide')({
  component: BrandGuidePage,
});

function BrandGuidePage() {
  return (
    <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-text-primary">Guides</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Brand Guide</span>
        </nav>
        <h1 className="text-display-md mb-4">Brand Guide — Cinema Black</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          BrandlyFrames ships with a single, opinionated design system: <strong>Cinema Black</strong> — black, white, and orange accents, like a dark theater with a projector beam. Orange is the only color, used sparingly.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Color Tokens</h2>
        <p className="text-body text-text-muted mb-6">
          All colors are exposed as CSS custom properties, TypeScript constants, and JSON tokens (see the <Link to="/api">API reference</Link>). Consume them in Studio, Player, templates, and CLI output.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { name: '--bf-black', value: '#0A0A0A', use: 'App background ("theater dark")' },
            { name: '--bf-surface-1', value: '#111111', use: 'Panels, sidebar' },
            { name: '--bf-surface-2', value: '#1A1A1A', use: 'Cards, inputs, timeline tracks' },
            { name: '--bf-border', value: '#2A2A2A', use: 'Dividers, outlines' },
            { name: '--bf-text-muted', value: '#8A8A8A', use: 'Secondary text, labels' },
            { name: '--bf-white', value: '#FAFAFA', use: 'Primary text, icons' },
            { name: '--bf-orange', value: '#FF6A00', use: 'Accent: playhead, primary buttons, REC' },
            { name: '--bf-orange-hover', value: '#FF8533', use: 'Hover on accent' },
            { name: '--bf-orange-dim', value: '#FF6A0026', use: 'Selection fill, glow (15% alpha)' },
          ].map((token) => (
            <div key={token.name} className="card p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-6 h-6 rounded-sm border border-border-primary" style={{ backgroundColor: token.value }} />
                <span className="font-mono text-body-sm text-text-primary">{token.name}</span>
              </div>
              <div className="font-mono text-body-sm text-text-muted">{token.value}</div>
              <p className="text-caption text-text-muted mt-2">{token.use}</p>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <h3 className="text-heading-md mb-4">Usage Rules</h3>
          <ul className="space-y-3 text-body text-text-muted">
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span> Orange covers at most ~5% of any screen. No second accent color.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span> Semantic states: error uses white on dark-orange tint with an icon (no red); success is white with a check icon. Never rely on color alone.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span> Dark theme is the default. A light "Paper" theme exists as an inverse with the same orange accent.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span> WCAG AA contrast minimum on all text.
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Typography</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-heading-md mb-2">Display</h3>
            <p className="font-display text-text-primary">Bebas Neue / Oswald</p>
            <p className="text-caption text-text-muted mt-2">Condensed, poster-style sans. Uppercase, wide tracking. For titles and the logo lockup.</p>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-md mb-2">UI</h3>
            <p className="font-ui text-text-primary">Inter</p>
            <p className="text-caption text-text-muted mt-2">Body text, labels, buttons, form fields.</p>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-md mb-2">Mono</h3>
            <p className="font-mono text-text-primary">JetBrains Mono</p>
            <p className="text-caption text-text-muted mt-2">Timecode, code, frame numbers. Always tabular. Format: <code className="code-inline">HH:MM:SS:FF</code>.</p>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Cinema Motifs</h2>
        <p className="text-body text-text-muted mb-6">
          Use with restraint. These motifs reinforce the "dark theater, projector light" feeling without overwhelming the content.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { name: 'Playhead', desc: 'Thin orange line with small marker; scrubbing shows live timecode.' },
            { name: 'Letterbox bars', desc: 'Preview canvas sits in black with optional 2.39:1 / 16:9 / 9:16 safe-area guides.' },
            { name: 'Slate / clapperboard', desc: 'Loading and render-progress states use a clapper animation; counter reads "SCENE 01 / TAKE 03" style labels.' },
            { name: 'Film grain', desc: 'Subtle optional overlay on marketing surfaces only — never over the preview canvas.' },
            { name: 'Rec indicator', desc: 'Pulsing orange dot while rendering.' },
            { name: 'Frame counter', desc: 'Persistent mono readout "FRAME 0042 / 0300".' },
            { name: 'Anamorphic flare', desc: 'Thin horizontal orange streak. Hero/marketing visuals only.' },
          ].map((motif) => (
            <div key={motif.name} className="card p-4">
              <h4 className="text-heading-sm text-text-primary mb-1">{motif.name}</h4>
              <p className="text-caption text-text-muted">{motif.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Motion</h2>
        <p className="text-body text-text-muted mb-4">
          Ease-out, 150–250 ms. No bouncy UI animation. Cinematic fades for page transitions.
        </p>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Components to Ship</h2>
        <p className="text-body text-text-muted mb-4">
          All part of the <Link to="/api">@brandlyframes/design</Link> package:
        </p>
        <ul className="space-y-3 text-body text-text-muted">
          <li>Button — primary orange / secondary outline / ghost</li>
          <li>Timeline — tracks, playhead, markers</li>
          <li>Scrubber</li>
          <li>Panel, Tabs, Props editor fields</li>
          <li>Tooltip, Toast</li>
          <li>Progress — clapper + bar</li>
          <li>Modal, Command palette</li>
          <li>Frame counter, Timecode input</li>
          <li>Logo lockup</li>
        </ul>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Applied To</h2>
        <ul className="space-y-3 text-body text-text-muted">
          <li className="flex items-start gap-2">
            <span className="text-accent">✓</span> <strong>Studio & Player:</strong> black UI shell, orange playhead and primary actions, white text.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">✓</span> <strong>Docs site:</strong> black default with white text, orange links and code highlights, cinematic hero.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">✓</span> <strong>CLI:</strong> monochrome output with a single orange (ANSI 208 / `#FF6A00`) for the prompt, progress bar, and success lines; respects <code className="code-inline">NO_COLOR</code>.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">✓</span> <strong>Templates & `create-brandlyframes`:</strong> default compositions use the black/white/orange palette.
          </li>
        </ul>
      </section>

      <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
        <Link to="/guides/rendering" className="link">← Rendering Guide</Link>
        <Link to="/" className="link">Home →</Link>
      </footer>
    </article>
  );
}