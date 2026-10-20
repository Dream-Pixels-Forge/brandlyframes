import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';

export const Route = createFileRoute('/examples/')({
  component: ExamplesPage,
});

const templates = [
  { name: 'blank', description: 'Minimal frame counter — the smallest possible composition.' },
  { name: 'hello-world', description: 'Animated gradient circle with a progress indicator.' },
  { name: 'captions', description: 'Frame-driven captions using useCurrentFrame / useVideoConfig.' },
  { name: 'product-promo', description: 'Multi-scene animated promo with per-scene styling and transitions.' },
  { name: 'frame-video-demo', description: 'Frame-exact seek accuracy demo with time-anchor markers.' },
];

function ExamplesPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
        <header className="mb-12 pb-8 border-b border-border-primary">
          <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-text-primary">Home</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            <span className="text-text-primary">Examples</span>
          </nav>
          <h1 className="text-display-md mb-4">Examples</h1>
          <p className="text-body-lg text-text-muted max-w-2xl">
            Runnable projects covering the full surface of the SDK. Every template below ships inside <code className="code-inline">create-brandlyframes</code> — scaffold one locally to run it.
          </p>
        </header>

        <section className="mb-16">
          <p className="eyebrow">Scaffold any of these</p>
          <h2 className="text-heading-lg mb-6">Starter Templates</h2>
          <div className="card overflow-hidden mb-6">
            <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
              <span className="text-caption text-text-muted">Terminal</span>
            </div>
            <pre className="code-block rounded-none border-0"><code>{`npm create brandlyframes@latest my-video -- --template hello-world
cd my-video
npx brandlyframes dev`}</code></pre>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t) => (
              <article key={t.name} className="card-hover p-6">
                <h3 className="font-mono text-sm text-accent mb-2">{t.name}</h3>
                <p className="text-body-sm text-text-muted">{t.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="card p-6 bg-accent-dim/30 border-accent/30">
            <h2 className="text-heading-md mb-2">More coming soon</h2>
            <p className="text-body text-text-muted">
              Full example gallery (cloud rendering, captions toolkit, audio-reactive) lands with the v1.1 "Director's Cut" release. Track progress in the roadmap.
            </p>
          </div>
        </section>

        <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
          <Link to="/docs/getting-started" className="link">← Getting Started</Link>
          <Link to="/api" className="link">API Reference →</Link>
        </footer>
      </article>
    </RootLayout>
  );
}
