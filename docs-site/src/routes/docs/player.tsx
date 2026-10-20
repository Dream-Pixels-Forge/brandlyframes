import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';
import {
  basicUsageCode,
  refApiCode,
  controlledPlaybackCode,
  seekAccuracyPlayerCode,
  errorHandlingCode,
  loopAndAutoplayCode,
  inputPropsCode,
  playbackRateCode,
  customControlsCode,
  accessibilityCode,
  keyboardShortcutsCode,
  responsiveCode,
  multiInstanceCode,
} from '@/code-examples/player';

export const Route = createFileRoute('/docs/player')({
  component: PlayerPage,
});

function PlayerPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/docs/getting-started" className="hover:text-text-primary">Docs</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <Link to="/docs/core-concepts" className="hover:text-text-primary">Core Concepts</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Player</span>
        </nav>
        <div className="flex items-center gap-3 mb-4">
          <span className="badge-accent">New in v0.1</span>
          <span className="text-caption text-text-muted">BF-030 to BF-032</span>
        </div>
        <h1 className="text-display-md mb-4">Player (&lt;Player /&gt;)</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          Embeddable web player with controls, loop, autoplay, inputProps, imperative ref API, and event callbacks.
          Frame-exact seeking and deterministic playback across browsers.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Why Player?</h2>
        <p className="text-body-lg text-text-muted mb-8">
          BrandlyFrames compositions render frame-exact video in the browser. <code>Player</code> exposes that
          output through a familiar media-player surface — play/pause/seek controls, a ref API for imperative
          control, loop/autoplay, playback-rate control, and frame-change/ended/error callbacks — so you can
          embed BrandlyFrames content anywhere without rewiring your own transport controls.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6 border-accent/30">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-accent">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg>
              Built-in controls
            </h3>
            <ul className="space-y-3 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Play / pause / seek buttons</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Time display (current / total)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Keyboard shortcuts (space, arrows, home/end)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> ARIA labels + focus trapping for accessibility</li>
            </ul>
          </div>
          <div className="card p-6 border-accent/30">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-accent">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              Imperative ref API
            </h3>
            <ul className="space-y-3 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> play(), pause(), seekTo(frame)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> getCurrentFrame(), getDurationInFrames()</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> getPlaybackRate(), setPlaybackRate(), isPlaying()</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Basic Usage</h2>
        <p className="text-body-lg text-text-muted mb-6">Register a composition with <code>registerRoot</code>, then render <code>Player</code> pointing at it.</p>
        <pre className="mb-8"><code className="language-tsx">{basicUsageCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Ref API</h2>
        <p className="text-body-lg text-text-muted mb-6">Use <code>forwardRef</code> + <code>useImperativeHandle</code> to imperatively control playback — useful for custom UIs or external triggers.</p>
        <pre className="mb-8"><code className="language-tsx">{refApiCode}</code></pre>
        <table className="mb-8 w-full text-left border-collapse border-border-primary">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="pb-3 text-caption text-text-muted">Method</th>
              <th className="pb-3 text-caption text-text-muted">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">play()</td><td className="py-3 text-body text-text-muted">Start playback from current position.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">pause()</td><td className="py-3 text-body text-text-muted">Pause playback.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">seekTo(frame)</td><td className="py-3 text-body text-text-muted">Seek to an exact (0-indexed) frame, clamped to range.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">getCurrentFrame()</td><td className="py-3 text-body text-text-muted">Current 0-indexed frame.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">getDurationInFrames()</td><td className="py-3 text-body text-text-muted">Total frame count of the composition.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">getPlaybackRate()</td><td className="py-3 text-body text-text-muted">Current playback rate (1 = normal).</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">setPlaybackRate(rate)</td><td className="py-3 text-body text-text-muted">Set playback rate (e.g. 0.5, 1, 1.5, 2).</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">isPlaying()</td><td className="py-3 text-body text-text-muted">Whether playback is currently active.</td></tr>
          </tbody>
        </table>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Event Callbacks</h2>
        <p className="text-body-lg text-text-muted mb-6">Hook into playback lifecycle events.</p>
        <table className="mb-8 w-full text-left border-collapse border-border-primary">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="pb-3 text-caption text-text-muted">Callback</th>
              <th className="pb-3 text-caption text-text-muted">Fires when</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">onPlay</td><td className="py-3 text-body text-text-muted">Playback starts.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">onPause</td><td className="py-3 text-body text-text-muted">Playback pauses.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">onFrameChange(frame)</td><td className="py-3 text-body text-text-muted">Each frame advances during playback.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">onEnded</td><td className="py-3 text-body text-text-muted">Composition reaches its end (unless looping).</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">onError(error)</td><td className="py-3 text-body text-text-muted">A playback error occurs.</td></tr>
          </tbody>
        </table>
        <pre className="mb-8"><code className="language-tsx">{controlledPlaybackCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Seek Accuracy</h2>
        <p className="text-body-lg text-text-muted mb-6">
          <code>Player</code> seeks frame-exactly — <code>seekTo</code> lands precisely on the requested 0-indexed frame
          without timestamp drift. This is BF-032: seek-accuracy across browsers.
        </p>
        <pre className="mb-8"><code className="language-tsx">{seekAccuracyPlayerCode}</code></pre>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Props Reference</h2>
        <table className="mb-8 w-full text-left border-collapse border-border-primary">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="pb-3 text-caption text-text-muted">Prop</th>
              <th className="pb-3 text-caption text-text-muted">Type</th>
              <th className="pb-3 text-caption text-text-muted">Default</th>
              <th className="pb-3 text-caption text-text-muted">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">compositionId</td><td className="py-3 text-body font-mono text-sm">string</td><td className="py-3 text-body text-text-muted">—</td><td className="py-3 text-body text-text-muted">Composition ID registered via <code>registerRoot</code>.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">inputProps</td><td className="py-3 text-body font-mono text-sm">Record&lt;string, unknown&gt;</td><td className="py-3 text-body text-text-muted">undefined</td><td className="py-3 text-body text-text-muted">Props passed to the composition.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">autoPlay</td><td className="py-3 text-body font-mono text-sm">boolean</td><td className="py-3 text-body text-text-muted">false</td><td className="py-3 text-body text-text-muted">Autoplay on mount.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">loop</td><td className="py-3 text-body font-mono text-sm">boolean</td><td className="py-3 text-body text-text-muted">false</td><td className="py-3 text-body text-text-muted">Loop playback.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">playbackRate</td><td className="py-3 text-body font-mono text-sm">number</td><td className="py-3 text-body text-text-muted">1</td><td className="py-3 text-body text-text-muted">Initial playback rate.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">controls</td><td className="py-3 text-body font-mono text-sm">boolean</td><td className="py-3 text-body text-text-muted">true</td><td className="py-3 text-body text-text-muted">Show default controls.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">width</td><td className="py-3 text-body font-mono text-sm">number</td><td className="py-3 text-body text-text-muted">composition width</td><td className="py-3 text-body text-text-muted">Width in pixels.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">height</td><td className="py-3 text-body font-mono text-sm">number</td><td className="py-3 text-body text-text-muted">composition height</td><td className="py-3 text-body text-text-muted">Height in pixels.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">onPlay / onPause / onFrameChange / onEnded / onError</td><td className="py-3 text-body font-mono text-sm">function</td><td className="py-3 text-body text-text-muted">undefined</td><td className="py-3 text-body text-text-muted">Lifecycle callbacks.</td></tr>
            <tr className="border-b border-border-primary"><td className="py-3 text-body font-mono text-sm">className / style</td><td className="py-3 text-body font-mono text-sm">string / React.CSSProperties</td><td className="py-3 text-body text-text-muted">undefined</td><td className="py-3 text-body text-text-muted">Custom styling.</td></tr>
          </tbody>
        </table>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">More Examples</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Loop + Autoplay</h3>
            <pre className="mb-0"><code className="language-tsx">{loopAndAutoplayCode}</code></pre>
          </div>
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Input Props</h3>
            <pre className="mb-0"><code className="language-tsx">{inputPropsCode}</code></pre>
          </div>
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Playback Rate</h3>
            <pre className="mb-0"><code className="language-tsx">{playbackRateCode}</code></pre>
          </div>
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Custom Controls</h3>
            <pre className="mb-0"><code className="language-tsx">{customControlsCode}</code></pre>
          </div>
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Accessibility</h3>
            <pre className="mb-0"><code className="language-tsx">{accessibilityCode}</code></pre>
          </div>
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Keyboard Shortcuts</h3>
            <pre className="mb-0"><code className="language-tsx">{keyboardShortcutsCode}</code></pre>
          </div>
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Responsive</h3>
            <pre className="mb-0"><code className="language-tsx">{responsiveCode}</code></pre>
          </div>
          <div className="card p-6 border-border-primary">
            <h3 className="text-heading-md mb-4">Multi Instance</h3>
            <pre className="mb-0"><code className="language-tsx">{multiInstanceCode}</code></pre>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Error Handling</h2>
        <p className="text-body-lg text-text-muted mb-6">Use <code>onError</code> to surface or recover from playback errors.</p>
        <pre className="mb-0"><code className="language-tsx">{errorHandlingCode}</code></pre>
      </section>

      <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
        <Link to="/docs/core-concepts" className="text-body text-text-muted hover:text-text-primary">
          ← Back to Core Concepts
        </Link>
        <Link to="/docs/frame-video" className="text-body text-accent hover:text-text-primary">
          Frame Video →
        </Link>
      </footer>
      </article>
    </RootLayout>
  );
}
