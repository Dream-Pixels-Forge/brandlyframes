import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';

import {
  basicUsageCode,
  manifestCode,
  perfBenchmarkCode,
  cfrVfrAlphaCode,
  vfrPatternCode,
  customClipCode,
  perf4kCode,
} from '@/code-examples/test-clips';

export const Route = createFileRoute('/docs/test-clips')({
  component: TestClipsPage,
});

function TestClipsPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/docs/getting-started" className="hover:text-text-primary">Docs</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <Link to="/docs/core-concepts" className="hover:text-text-primary">Core Concepts</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Test Clips</span>
        </nav>
        <div className="flex items-center gap-3 mb-4">
          <span className="badge-accent">New in v0.2</span>
          <span className="text-caption text-text-muted">BF-061</span>
        </div>
        <h1 className="text-display-md mb-4">Test Clips</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          Predefined synthetic video clip specifications with burned-in frame
          counters, plus utilities to generate frames, manifests, and run
          performance benchmarks. Use these for CI, render-farm testing, and
          performance regression tracking.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Why Test Clips?</h2>
        <p className="text-body-lg text-text-muted mb-8">
          BrandlyFrames ships a fixed library of test clips covering CFR, VFR,
          alpha-channel, and 4K/60 performance scenarios. Each clip has a
          deterministic frame counter burned in, so you can assert that frame N
          renders counter N — invaluable for testing retime, fps conversion,
          trim, reverse, and ping-pong without depending on external media
          files.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6 border-accent/30">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-accent">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              Clip categories
            </h3>
            <ul className="space-y-3 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> CFR — constant frame rate (24/30/60/29.97)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> VFR — variable frame rate (alternating, progressive-slowdown)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Alpha channel clips</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> 4K/60 perf benchmark</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Basic Usage</h2>
        <p className="text-body-lg text-text-muted mb-6">Import from <code>@brandlyframes/frames</code> and iterate over <code>TEST_CLIPS</code>.</p>
        <pre className="mb-8"><code className="language-tsx">{basicUsageCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Clip Categories</h2>
        <p className="text-body-lg text-text-muted mb-6">Filter <code>TEST_CLIPS</code> by <code>FrameCounterClipSpec</code> flags.</p>
        <pre className="mb-8"><code className="language-tsx">{cfrVfrAlphaCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">VFR Patterns</h2>
        <p className="text-body-lg text-text-muted mb-6">Each VFR clip carries a <code>VFRPattern</code> describing its rate schedule.</p>
        <pre className="mb-8"><code className="language-tsx">{vfrPatternCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Frame Counter Generation</h2>
        <p className="text-body-lg text-text-muted mb-6">
          <code>createFrameCounterFrame</code> renders a synthetic RGB/RGBA frame with
          the frame counter burned in — deterministic for the same spec + frame
          index. <code>generateFrameCounterText</code> produces the on-screen text.
        </p>
        <pre className="mb-8"><code className="language-tsx">{customClipCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Test Clip Manifest</h2>
        <p className="text-body-lg text-text-muted mb-6">Export clip metadata as JSON for CI or render-farm consumption.</p>
        <pre className="mb-8"><code className="language-tsx">{manifestCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Performance Benchmark</h2>
        <p className="text-body-lg text-text-muted mb-6">
          <code>runPerfBenchmark</code> decodes every frame of a clip and reports
          achieved fps, peak memory, and timings — use the <code>TEST_CLIPS</code>
          <code>perf-4k-60fps-full</code> clip for CI regression tracking.
        </p>
        <pre className="mb-8"><code className="language-tsx">{perfBenchmarkCode}</code></pre>
        <pre className="mb-0"><code className="language-tsx">{perf4kCode}</code></pre>
      </section>

      <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
        <Link to="/docs/core-concepts" className="text-body text-text-muted hover:text-text-primary">
          ← Back to Core Concepts
        </Link>
        <Link to="/docs/player" className="text-body text-accent hover:text-text-primary">
          Player →
        </Link>
      </footer>
      </article>
    </RootLayout>
  );
}
