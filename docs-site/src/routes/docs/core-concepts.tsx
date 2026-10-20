import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';
import { 
  frameContextCode,
  compositionCode,
  sequenceCode,
  seriesCode,
  loopCode,
  freezeCode,
  absoluteFillCode,
  interpolateCode,
  springCode,
  easingCode,
  timeHelpersCode,
  inputPropsCode,
  asyncReadinessCode,
} from '@/code-examples/core';

export const Route = createFileRoute('/docs/core-concepts')({
  component: CoreConceptsPage,
});

function CoreConceptsPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/docs/getting-started" className="hover:text-text-primary">Docs</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Core Concepts</span>
        </nav>
        <h1 className="text-display-md mb-4">Core Concepts</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          Understand the mental model behind BrandlyFrames: how compositions work, how time flows, and how to think in frames.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">The Frame Model</h2>
        <p className="text-body-lg text-text-muted mb-8">
          BrandlyFrames treats a video as a pure function: <code className="code-inline">frame → pixels</code>. 
          There is no timeline, no keyframes, no animation state — just a frame number that determines everything.
        </p>

        <div className="card p-6 mb-6">
          <h3 className="text-heading-md mb-4">The Mental Model</h3>
          <div className="space-y-4 text-body">
            <div className="flex items-start gap-3 p-4 bg-surface-elevated rounded-lg">
              <span className="font-mono text-accent text-lg flex-shrink-0">1</span>
              <div>
                <strong className="text-text-primary">Frame is the clock</strong>
                <p className="text-text-muted mt-1">No <code className="code-inline">Date.now()</code>, no <code className="code-inline">requestAnimationFrame</code>, no CSS animations. Everything derives from <code className="code-inline">useCurrentFrame()</code>.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-surface-elevated rounded-lg">
              <span className="font-mono text-accent text-lg flex-shrink-0">2</span>
              <div>
                <strong className="text-text-primary">Deterministic rendering</strong>
                <p className="text-text-muted mt-1">Frame 42 always produces the same pixels. Render twice → byte-identical output. Essential for parallel rendering and caching.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-surface-elevated rounded-lg">
              <span className="font-mono text-accent text-lg flex-shrink-0">3</span>
              <div>
                <strong className="text-text-primary">React-native DX</strong>
                <p className="text-text-muted mt-1">Components, hooks, props. Zod-typed input props. Familiar patterns, video superpowers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-surface-elevated rounded-lg">
              <span className="font-mono text-accent text-lg flex-shrink-0">4</span>
              <div>
                <strong className="text-text-primary">Parallel by default</strong>
                <p className="text-text-muted mt-1">Frame ranges split across workers. Each worker renders its chunk independently. Concatenation is deterministic.</p>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-heading-md mb-4">Frame Context</h3>
        <p className="text-body text-text-muted mb-6">
          The frame context provides the current frame number to all descendants. It’s established by the <code className="code-inline">Player</code>, <code className="code-inline">Studio</code>, or <code className="code-inline">Renderer</code>.
        </p>

        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Conceptual model</span>
          </div>
          <pre className="code-block p-6"><code>{frameContextCode}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Compositions</h2>
        <p className="text-body-lg text-text-muted mb-6">
          A composition is a declared video: it has an ID, a component, dimensions, duration, and frame rate. 
          Compositions are registered at module load time via <code className="code-inline">registerRoot</code>.
        </p>

        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Composition Declaration</span>
          </div>
          <pre className="code-block p-6"><code>{compositionCode}</code></pre>
        </div>

        <h3 className="text-heading-md mb-4">Composition Metadata</h3>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="card p-6">
            <h4 className="text-heading-sm mb-3">Static Props</h4>
            <dl className="space-y-2 text-body-sm">
              <div className="flex justify-between"><dt className="text-text-muted">id</dt><dd className="font-mono">string (unique)</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">component</dt><dd className="font-mono">React.FC</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">durationInFrames</dt><dd className="font-mono">{"number (>0)"}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">fps</dt><dd className="font-mono">{"number (>0)"}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">width</dt><dd className="font-mono">{"number (>0)"}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">height</dt><dd className="font-mono">{"number (>0)"}</dd></div>
            </dl>
          </div>
          <div className="card p-6">
            <h4 className="text-heading-sm mb-3">Dynamic Props (BF-008)</h4>
            <dl className="space-y-2 text-body-sm">
              <div className="flex justify-between"><dt className="text-text-muted">defaultProps</dt><dd className="font-mono">{"Partial<Props>"}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">schema</dt><dd className="font-mono">{"ZodType<Props>"}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">calculateMetadata</dt><dd className="font-mono">{"(props) => Metadata"}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Sequencing & Timing</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Compose complex timelines from simple primitives. All timing derives from the frame number.
        </p>

        <div className="space-y-8">
          {/* Sequence */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 flex items-center gap-2">
              <code className="code-inline">&lt;Sequence&gt;</code> — Time shifting
            </h3>
            <p className="text-body text-text-muted mb-4">
              Shifts the frame context for children. Like a sub-timeline with its own origin.
            </p>
            <pre className="code-block p-4"><code>{sequenceCode}</code></pre>
          </div>

          {/* Series */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 flex items-center gap-2">
              <code className="code-inline">&lt;Series&gt;</code> — Sequential layout
            </h3>
            <p className="text-body text-text-muted mb-4">
              Lays out children sequentially, one after another. Each child gets its own frame range.
            </p>
            <pre className="code-block p-4"><code>{seriesCode}</code></pre>
          </div>

          {/* Loop & Freeze */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 flex items-center gap-2">
              <code className="code-inline">&lt;Loop&gt;</code> & <code className="code-inline">&lt;Freeze&gt;</code> — Repetition & holding
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-heading-sm mb-2"><code className="code-inline">&lt;Loop&gt;</code></h4>
                <pre className="code-block p-4"><code>{loopCode}</code></pre>
              </div>
              <div>
                <h4 className="text-heading-sm mb-2"><code className="code-inline">&lt;Freeze&gt;</code></h4>
                <pre className="code-block p-4"><code>{freezeCode}</code></pre>
              </div>
            </div>
          </div>

          {/* AbsoluteFill */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 flex items-center gap-2">
              <code className="code-inline">&lt;AbsoluteFill&gt;</code> — Full-bleed layers
            </h3>
            <pre className="code-block p-4"><code>{absoluteFillCode}</code></pre>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Animation Utilities</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Pure functions for mapping frame numbers to values. No state, no side effects.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-heading-md mb-4"><code className="code-inline">interpolate()</code></h3>
            <p className="text-body text-text-muted mb-4">Map frame → value with configurable easing.</p>
            <pre className="code-block p-4"><code>{interpolateCode}</code></pre>
          </div>

          <div className="card p-6">
            <h3 className="text-heading-md mb-4"><code className="code-inline">spring()</code></h3>
            <p className="text-body text-text-muted mb-4">Physics-based spring animation.</p>
            <pre className="code-block p-4"><code>{springCode}</code></pre>
          </div>

          <div className="card p-6">
            <h3 className="text-heading-md mb-4"><code className="code-inline">Easing</code></h3>
            <p className="text-body text-text-muted mb-4">Built-in easing functions.</p>
            <pre className="code-block p-4"><code>{easingCode}</code></pre>
          </div>

          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Time Helpers</h3>
            <p className="text-body text-text-muted mb-4">No more manual frame math.</p>
            <pre className="code-block p-4"><code>{timeHelpersCode}</code></pre>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Input Props & Validation</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Compositions accept typed input props validated at registration and runtime via Zod.
        </p>

        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Typed Input Props</span>
          </div>
          <pre className="code-block p-6"><code>{inputPropsCode}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Async Readiness</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Handle async operations (font loading, image fetching, video decoding) without blocking the render.
        </p>

        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">holdFrame / releaseFrame</span>
          </div>
          <pre className="code-block p-6"><code>{asyncReadinessCode}</code></pre>
        </div>
      </section>

      <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
        <Link to="/docs/getting-started" className="link">← Getting Started</Link>
        <Link to="/docs/frame-video" className="link">Frame Video →</Link>
      </footer>
      </article>
    </RootLayout>
  );
}
