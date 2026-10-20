import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';

export const Route = createFileRoute('/docs/getting-started')({
  component: GettingStartedPage,
});

function GettingStartedPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/docs/getting-started" className="hover:text-text-primary">Docs</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Getting Started</span>
        </nav>
        <h1 className="text-display-md mb-4">Getting Started</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          Install BrandlyFrames and render your first programmatic video in under 5 minutes.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Prerequisites</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-heading-sm mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              Node.js ≥ 24
            </h3>
            <p className="text-body text-text-muted">BrandlyFrames requires Node.js 24 or later. We recommend using nvm or fnm to manage versions.</p>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-sm mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              pnpm 11.5.1+
            </h3>
            <p className="text-body text-text-muted">pnpm is the required package manager. It provides fast, disk-efficient installs with strict dependency isolation.</p>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-sm mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              React 19
            </h3>
            <p className="text-body text-text-muted">BrandlyFrames is built for React 19. Peer dependency on react and react-dom.</p>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-sm mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              TypeScript 5.9+
            </h3>
            <p className="text-body text-text-muted">Full TypeScript support with strict mode. All APIs are fully typed.</p>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Installation</h2>
        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Terminal</span>
          </div>
          <pre className="code-block p-6"><code>{`# Create a new project (recommended)
pnpm create brandlyframes@latest my-video-app
cd my-video-app

# Or add to existing project
pnpm add brandlyframes @brandlyframes/player @brandlyframes/renderer

# Start the development studio
pnpm brandlyframes studio`}</code></pre>
        </div>

        <div className="card p-6 bg-accent-dim/30 border-accent/30">
          <h3 className="text-heading-sm mb-3 flex items-center gap-2 text-accent">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            Quick Start Template
          </h3>
          <p className="text-body text-text-muted mb-4">
            The <code className="code-inline">create-brandlyframes</code> scaffolding tool sets up a complete project with:
          </p>
          <ul className="space-y-2 text-body text-text-muted">
            <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> TypeScript config with strict mode</li>
            <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Vite + TanStack Router setup</li>
            <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Example compositions (hello-world, captions, frame-video)</li>
            <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Studio configuration</li>
            <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Render scripts for local and cloud</li>
          </ul>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Your First Composition</h2>
        <p className="text-body-lg text-text-muted mb-8">
          Create a video component. Every frame is a pure render — no side effects, no external state.
        </p>

        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">src/compositions/HelloVideo.tsx</span>
          </div>
          <pre className="code-block p-6"><code>{`import { registerRoot, Composition, useCurrentFrame, useVideoConfig, spring, interpolate } from 'brandlyframes';

const HelloVideo = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Spring animation: scale from 0.5 to 1.2 over 60 frames
  const scale = spring(frame, {
    fps,
    durationInFrames: 60,
    from: 0.5,
    to: 1.2,
    stiffness: 100,
    damping: 15,
  });

  // Fade in/out over the composition duration
  const opacity = interpolate(frame, [0, 30, 90, 120], [0, 1, 1, 0]);

  return (
    <div style={{ 
      width, 
      height, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0A0A0A',
    }}>
      <div style={{
        transform: \`scale(\${scale})\`,
        opacity,
        color: '#FF6A00',
        fontSize: 'clamp(3rem, 8vw, 6rem)',
        fontWeight: 700,
        fontFamily: 'Bebas Neue, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
      }}>
        HELLO BRANDLYFRAMES
      </div>
    </div>
  );
};

// Register the composition
registerRoot(
  <Composition
    id="hello-video"
    component={HelloVideo}
    durationInFrames={120}
    fps={30}
    width={1920}
    height={1080}
  />
);`}</code></pre>
        </div>

        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">src/App.tsx</span>
          </div>
          <pre className="code-block p-6"><code>{`import { Player } from '@brandlyframes/player';
import './compositions/HelloVideo'; // Registers the composition

export default function App() {
  return (
    <Player 
      compositionId="hello-video"
      autoPlay
      loop
      controls
      width={1280}
      height={720}
    />
  );
}`}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Run the Studio</h2>
        <p className="text-body-lg text-text-muted mb-6">
          The Studio is your live development environment — hot reload, scrubber, props editor, and frame inspector.
        </p>
        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Terminal</span>
          </div>
          <pre className="code-block p-6"><code>{`# Start the studio (hot reload enabled)
pnpm brandlyframes studio

# Or with custom port
pnpm brandlyframes studio --port 3000`}</code></pre>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="card p-6">
            <h3 className="text-heading-sm mb-3">Studio Features</h3>
            <ul className="space-y-2 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Composition sidebar with search</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Frame-accurate scrubber with timecode</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Props editor (auto-generated from Zod schema)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Error overlay with component stack & suggested fix</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Frame inspector (click any element)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Render dialog with presets</li>
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-sm mb-3">Keyboard Shortcuts</h3>
            <dl className="space-y-2 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Space</dt>
                <dd className="font-mono text-accent">Play / Pause</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">← / →</dt>
                <dd className="font-mono text-accent">Step frame</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Shift + ← / →</dt>
                <dd className="font-mono text-accent">Step 10 frames</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Home / End</dt>
                <dd className="font-mono text-accent">First / Last frame</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">0</dt>
                <dd className="font-mono text-accent">Jump to frame 0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Cmd/Ctrl + R</dt>
                <dd className="font-mono text-accent">Render dialog</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Render to MP4</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Render your composition to a video file. Supports MP4, WebM, GIF, PNG sequence, and ProRes.
        </p>
        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Terminal</span>
          </div>
          <pre className="code-block p-6"><code>{`# Render to MP4 (default)
pnpm brandlyframes render hello-video

# Render with options
pnpm brandlyframes render hello-video \\
  --output ./output.mp4 \\
  --codec h264 \\
  --crf 23 \\
  --concurrency 8

# Render a still frame
pnpm brandlyframes still hello-video --frame 60

# List all compositions
pnpm brandlyframes compositions`}</code></pre>
        </div>

        <div className="card p-6 mt-6 bg-accent-dim/30 border-accent/30">
          <h3 className="text-heading-sm mb-3 flex items-center gap-2 text-accent">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            Cloud Rendering
          </h3>
          <p className="text-body text-text-muted mb-4">
            For longer videos or CI/CD, use cloud rendering with automatic chunking and concatenation:
          </p>
          <pre className="code-block p-4 text-body-sm"><code>{`# Deploy cloud infrastructure (one-time)
pnpm brandlyframes cloud deploy --provider aws

# Render in the cloud
pnpm brandlyframes cloud render hello-video \\
  --output s3://my-bucket/videos/hello.mp4`}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Next Steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Link to="/docs/core-concepts" className="card-hover p-6 group">
            <h3 className="text-heading-md mb-2 group-hover:text-accent transition-colors">Core Concepts</h3>
            <p className="text-body text-text-muted">Learn the mental model: compositions, sequences, frame context, and timing.</p>
          </Link>
          <Link to="/docs/frame-video" className="card-hover p-6 group">
            <h3 className="text-heading-md mb-2 group-hover:text-accent transition-colors">Frame Video</h3>
            <p className="text-body text-text-muted">Deep dive into frame-exact video: FrameStore, WebCodecs, VFR, alpha, and effects.</p>
          </Link>
          <Link to="/guides/rendering" className="card-hover p-6 group">
            <h3 className="text-heading-md mb-2 group-hover:text-accent transition-colors">Rendering Guide</h3>
            <p className="text-body text-text-muted">Advanced rendering: presets, concurrency, cloud, audio, and troubleshooting.</p>
          </Link>
        </div>
      </section>

      {/* Edit on GitHub */}
      <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
        <p className="text-body-sm text-text-muted">Found an issue?</p>
        <a 
          href="https://github.com/brandlyframes/brandlyframes/edit/main/docs-site/src/routes/docs/getting-started.tsx" 
          target="_blank" 
          rel="noopener noreferrer"
          className="link"
        >
          Edit this page on GitHub
        </a>
      </footer>
      </article>
    </RootLayout>
  );
}