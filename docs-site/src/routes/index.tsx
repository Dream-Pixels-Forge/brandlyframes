import { createFileRoute } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';
import { Link } from '@tanstack/react-router';
import {
  helloVideoCode,
} from '@/code-examples/core';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <RootLayout>
      {/* Hero Section */}
      <section className="section pt-24 lg:pt-32" aria-labelledby="hero-heading">
        <div className="container-narrow">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 badge-accent mb-6 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-orange absolute inset-0 h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative block h-full w-full rounded-full bg-accent" />
              </span>
              <span className="text-caption">v0.1.0 — Public Beta</span>
            </span>
            
            <h1 
              id="hero-heading" 
              className="text-display-xl font-display text-text-primary mb-6 animate-slide-up stagger-1"
            >
              Programmatic Video SDK<br />
              <span className="text-gradient">for React</span>
            </h1>
            
            <p className="text-body-lg text-text-muted mb-10 animate-slide-up stagger-2 max-w-2xl mx-auto">
              A video is a pure function of the frame number: <code className="code-inline">frame → pixels</code>. 
              Write components, preview them live in Studio, embed them in a web Player, and render to MP4/WebM/GIF/PNG locally or in the cloud.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-3">
              <Link to="/docs/getting-started" className="btn-primary px-8 py-3 text-body">
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link to="/api" className="btn-secondary px-8 py-3 text-body">
                API Reference
              </Link>
              <a 
                href="https://github.com/brandlyframes/brandlyframes" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-ghost px-8 py-3 text-body"
              >
                View on GitHub
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-text-muted animate-fade-in stagger-4">
              <div className="flex items-center gap-2 text-caption">
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>MIT Licensed</span>
              </div>
              <div className="flex items-center gap-2 text-caption">
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>Free for commercial use</span>
              </div>
              <div className="flex items-center gap-2 text-caption">
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>No render fees</span>
              </div>
              <div className="flex items-center gap-2 text-caption">
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>TypeScript native</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="section bg-surface/50" aria-labelledby="features-heading">
        <div className="container">
          <header className="text-center mb-16">
            <h2 id="features-heading" className="text-heading-xl mb-4">Why BrandlyFrames?</h2>
            <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
              Built from the ground up for determinism, performance, and developer experience.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <article 
                key={feature.title} 
                className="card-hover p-6 animate-on-scroll"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent-dim flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-heading-md mb-2">{feature.title}</h3>
                <p className="text-body text-text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="section" aria-labelledby="example-heading">
        <div className="container">
          <header className="text-center mb-12">
            <h2 id="example-heading" className="text-heading-xl mb-4">Your First Composition</h2>
            <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
              Write videos as React components. Every frame is a pure render.
            </p>
          </header>

          <div className="card overflow-hidden">
            <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
              <span className="text-caption text-text-muted">App.tsx</span>
              <span className="flex-1" />
              <span className="badge-muted">TypeScript</span>
            </div>
            <pre className="code-block p-6"><code>{helloVideoCode}</code></pre>
          </div>
        </div>
      </section>

      {/* Frame Video Feature */}
      <section className="section bg-surface/50" aria-labelledby="frame-video-heading">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="badge-accent mb-4">New in v0.1</span>
              <h2 id="frame-video-heading" className="text-heading-xl mb-4">First-Class Frame Video</h2>
              <p className="text-body-lg text-text-muted mb-6">
                BrandlyFrames introduces <strong>&lt;FrameVideo&gt;</strong> — the first frame-exact video component in any React video SDK. 
                Source videos are decoded to an indexed frame sequence, addressable by exact frame number, deterministic in preview and render.
              </p>
              <ul className="space-y-3 text-body">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  Frame-accurate seeking with rational timebase (no float drift)
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  VFR normalization via PTS table — handles variable frame rate sources
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  Alpha support: WebM VP9 alpha & ProRes 4444
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <code className="code-inline">useVideoFrame()</code> hook for per-pixel effects (canvas/WebGL/shaders)
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  Content-hashed disk cache + LRU memory cache — shared across workers
                </li>
              </ul>
              <Link to="/docs/frame-video" className="btn-primary mt-6 inline-flex">
                Learn about Frame Video
              </Link>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border-primary bg-bg-primary">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <svg className="w-24 h-24 mx-auto mb-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-body text-text-muted">Frame Video Demo</p>
                  <p className="text-caption text-text-muted mt-2">Interactive scrubber with frame counter</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="section" aria-labelledby="ecosystem-heading">
        <div className="container">
          <header className="text-center mb-16">
            <h2 id="ecosystem-heading" className="text-heading-xl mb-4">Modular Ecosystem</h2>
            <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
              Pick only what you need. Each package has a single responsibility.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
              <article 
                key={pkg.name} 
                className="card-hover p-6 animate-on-scroll"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-heading-sm mb-1 font-mono text-sm">{pkg.name}</h3>
                    <p className="text-body-sm text-text-muted">{pkg.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-gradient-to-b from-surface/50 to-transparent" aria-labelledby="cta-heading">
        <div className="container-narrow text-center">
          <h2 id="cta-heading" className="text-heading-xl mb-4">Ready to start creating?</h2>
          <p className="text-body-lg text-text-muted mb-8 max-w-xl mx-auto">
            Install BrandlyFrames and render your first video in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="font-mono text-body bg-surface-elevated px-4 py-3 rounded-lg border border-border-primary inline-flex items-center gap-2">
              <kbd className="px-2 py-1 bg-bg-primary rounded text-text-primary">pnpm</kbd>
              <span>add brandlyframes @brandlyframes/player @brandlyframes/renderer</span>
            </div>
            <Link to="/docs/getting-started" className="btn-primary px-8 py-3">
              Read the Guide
            </Link>
          </div>
        </div>
      </section>
    </RootLayout>
  );
}

const features = [
  {
    title: 'Deterministic by Design',
    description: 'Same frame number always yields identical pixels. No flicker, no drift, no surprises.',
    icon: (props: { className?: string }) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  },
  {
    title: 'Frame-Accurate Video',
    description: 'First-class <FrameVideo> with rational timebase, VFR normalization, alpha support, and per-pixel access.',
    icon: (props: { className?: string }) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    title: 'Parallel Rendering',
    description: 'Chunked frame ranges across workers/Lambdas. Resumable, cancellable, with automatic retry.',
    icon: (props: { className?: string }) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>,
  },
  {
    title: 'Cinema Black Design System',
    description: 'Premium dark-first UI with orange accent. Accessible, beautiful, production-ready components.',
    icon: (props: { className?: string }) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>,
  },
  {
    title: 'Clean-room Implementation',
    description: 'Zero Remotion code. MIT licensed. No render fees. No vendor lock-in. Deploy anywhere.',
    icon: (props: { className?: string }) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  },
  {
    title: 'Agent-Native (Coming Soon)',
    description: 'MCP server for AI agents: list compositions, edit props, render stills/videos, inspect timeline.',
    icon: (props: { className?: string }) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  },
];

const packages = [
  { name: '@brandlyframes/core', description: 'Timeline engine, hooks, primitives, animation utils' },
  { name: '@brandlyframes/renderer', description: 'Headless Chrome capture, FFmpeg stitch, audio mixing' },
  { name: '@brandlyframes/player', description: 'Embeddable web player with controls & ref API' },
  { name: '@brandlyframes/frames', description: 'Frame-exact video: FrameStore, WebCodecs, FFmpeg backends' },
  { name: '@brandlyframes/bundler', description: 'esbuild/Vite bundling with asset manifest' },
  { name: '@brandlyframes/studio', description: 'Live editor: sidebar, scrubber, props editor, error overlay' },
  { name: '@brandlyframes/cloud', description: 'AWS Lambda & GCP Cloud Run parallel rendering' },
  { name: '@brandlyframes/transitions', description: 'Slide, wipe, crossfade, custom transitions' },
  { name: '@brandlyframes/captions', description: 'SRT/VTT parsing, karaoke, safe-area positioning' },
  { name: '@brandlyframes/three', description: 'Three.js integration for 3D scenes' },
  { name: '@brandlyfonts', description: 'Font loading, subsetting, glyph layout' },
  { name: '@brandlyframes/media-utils', description: 'Audio/video helpers, waveform, loudness' },
];
