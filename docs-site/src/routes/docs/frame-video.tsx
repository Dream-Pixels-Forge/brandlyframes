import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';
import { 
  basicUsageCode,
  decodeBackendsCode,
  useVideoFrameCode,
  retimingCode,
  blendingCode,
  colorSpaceCode,
  frameAudioCode,
  probeCode,
  extractCode,
  cacheCode,
} from '@/code-examples/frame-video';

export const Route = createFileRoute('/docs/frame-video')({
  component: FrameVideoPage,
});

function FrameVideoPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/docs/getting-started" className="hover:text-text-primary">Docs</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <Link to="/docs/core-concepts" className="hover:text-text-primary">Core Concepts</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Frame Video</span>
        </nav>
        <div className="flex items-center gap-3 mb-4">
          <span className="badge-accent">New in v0.1</span>
          <span className="text-caption text-text-muted">BF-050 to BF-060</span>
        </div>
        <h1 className="text-display-md mb-4">Frame Video (&lt;FrameVideo /&gt;)</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          First-class frame-exact video for React. Source videos decoded to an indexed frame sequence, 
          addressable by exact frame number, deterministic in preview and render, usable as pixel data for effects.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Why Frame Video?</h2>
        <p className="text-body-lg text-text-muted mb-8">
          Traditional video elements (<code className="code-inline">video</code>) are time-based and non-deterministic. 
          Seeking is approximate, frame rates drift, and you can’t access pixels. BrandlyFrames solves this with <code className="code-inline">&lt;FrameVideo /&gt;</code>.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6 border-red-500/30">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg>
              Traditional <code className="code-inline">video</code> Problems
            </h3>
            <ul className="space-y-3 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Seek is timestamp-based (float), not frame-exact</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Variable frame rate (VFR) causes drift</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> No pixel access for effects/shaders</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Multiple <code className="code-inline">video</code> tags = multiple decoders = stutter</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Alpha channel support is inconsistent</li>
            </ul>
          </div>
          <div className="card p-6 border-accent/30">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-accent">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <code className="code-inline">&lt;FrameVideo /&gt;</code> Solutions
            </h3>
            <ul className="space-y-3 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Frame-exact addressing via rational timebase (num/den)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> VFR normalization via PTS table</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> <code className="code-inline">useVideoFrame()</code> hook returns <code className="code-inline">ImageBitmap</code> / <code className="code-inline">ImageData</code></li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> FrameStore: single decode, shared cache across workers</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Alpha: WebM VP9 alpha & ProRes 4444</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Basic Usage</h2>
        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Component Usage</span>
          </div>
          <pre className="code-block p-6"><code>{basicUsageCode}</code></pre>
        </div>

        <h3 className="text-heading-md mb-4">Props Reference</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-primary text-caption text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-medium w-48">Prop</th>
                <th className="pb-3 font-medium w-32">Type</th>
                <th className="pb-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">src</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">string | StaticFile</code></td>
                <td className="text-body text-text-muted">Source video path or URL. Use <code className="code-inline">staticFile()</code> for local assets.</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">startFrom</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">number</code></td>
                <td className="text-body text-text-muted">Source frame index to start at (inclusive). Default: 0</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">endAt</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">number</code></td>
                <td className="text-body text-text-muted">Source frame index to end at (exclusive). Default: video frame count</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">playbackRate</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">number</code></td>
                <td className="text-body text-text-muted">Playback speed. Negative = reverse. Default: 1</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">fit</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">'cover' | 'contain' | 'fill' | 'none'</code></td>
                <td className="text-body text-text-muted">How video fits the layout box. Default: "cover"</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">frameMode</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">'exact' | 'blend' | 'nearest'</code></td>
                <td className="text-body text-text-muted">Frame interpolation when retiming. Default: "exact"</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">fpsConversion</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">'auto' | 'nearest' | 'previous' | 'blend'</code></td>
                <td className="text-body text-text-muted">Source fps → composition fps mapping. Default: "auto"</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Frame Store Architecture</h2>
        <p className="text-body-lg text-text-muted mb-6">
          The FrameStore is the heart of frame-exact video. It decodes source video once into a content-hashed disk cache, 
          indexed by source frame number, with an LRU memory cache for hot frames.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Disk Cache</h3>
            <ul className="space-y-2 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Content-hashed keys (source hash + frame index + decode params)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Stored as lossless PNG (or WebP) for pixel-perfect access</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Configurable location: <code className="code-inline">~/.brandlyframes/frame-cache/</code></li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> LRU eviction with configurable max size</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Shared across parallel workers (local & cloud)</li>
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Memory Cache</h3>
            <ul className="space-y-2 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> LRU cache of recently accessed frames</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Configurable max frames (default: 120 frames)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Prefetch N frames ahead of playhead</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Backpressure-aware (pauses prefetch under memory pressure)</li>
            </ul>
          </div>
        </div>

        <h3 className="text-heading-md mb-4">Decode Backends</h3>
        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Pluggable Backends</span>
          </div>
          <pre className="code-block p-6"><code>{decodeBackendsCode}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Pixel Access: <code className="code-inline">useVideoFrame()</code></h2>
        <p className="text-body-lg text-text-muted mb-6">
          Access decoded frames as <code className="code-inline">ImageBitmap</code> or <code className="code-inline">ImageData</code> for custom effects, shaders, computer vision, or analysis.
        </p>

        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Custom Effects</span>
          </div>
          <pre className="code-block p-6"><code>{useVideoFrameCode}</code></pre>
        </div>

        <h3 className="text-heading-md mb-4">Hook Options</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-primary text-caption text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-medium w-48">Option</th>
                <th className="pb-3 font-medium w-32">Type</th>
                <th className="pb-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">src</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">string</code></td>
                <td className="text-body text-text-muted">Source video path</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">sourceFrame</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">number</code></td>
                <td className="text-body text-text-muted">Source frame index to decode</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">asImageData</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">boolean</code></td>
                <td className="text-body text-text-muted">Return ImageData instead of ImageBitmap (default: false)</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">prefetch</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">number</code></td>
                <td className="text-body text-text-muted">Prefetch N frames ahead (default: 5)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Advanced Features</h2>

        <div className="space-y-8">
          {/* Retiming */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Retiming & Speed Control</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-heading-sm mb-2">Playback Rates</h4>
                <pre className="code-block p-4"><code>{retimingCode}</code></pre>
              </div>
              <div>
                <h4 className="text-heading-sm mb-2">Frame Blending Modes</h4>
                <pre className="code-block p-4"><code>{blendingCode}</code></pre>
              </div>
            </div>
          </div>

          {/* Alpha & Color */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Alpha Channel & Color Space</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-heading-sm mb-2">Supported Alpha Formats</h4>
                <ul className="space-y-2 text-body text-text-muted">
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> WebM VP9 with alpha (yuva420p)</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> ProRes 4444 (yuva444p10le)</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> HEVC with alpha (yuva420p10le)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-heading-sm mb-2">Color Space Handling</h4>
                <pre className="code-block p-4"><code>{colorSpaceCode}</code></pre>
              </div>
            </div>
          </div>

          {/* Frame Audio */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4"><code className="code-inline">&lt;FrameAudio /&gt;</code> — Synced Audio</h3>
            <p className="text-body text-text-muted mb-4">
              Companion component that slices source audio to match the retimed video range and rate.
            </p>
            <pre className="code-block p-4"><code>{frameAudioCode}</code></pre>
          </div>

          {/* CLI Tools */}
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">CLI Tools</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-heading-sm mb-2"><code className="code-inline">brandlyframes frames probe</code></h4>
                <pre className="code-block p-4"><code>{probeCode}</code></pre>
              </div>
              <div>
                <h4 className="text-heading-sm mb-2"><code className="code-inline">brandlyframes frames extract</code></h4>
                <pre className="code-block p-4"><code>{extractCode}</code></pre>
              </div>
              <div>
                <h4 className="text-heading-sm mb-2"><code className="code-inline">brandlyframes frames cache</code></h4>
                <pre className="code-block p-4"><code>{cacheCode}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Performance & Best Practices</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              Do’s
            </h3>
            <ul className="space-y-3 text-body">
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Use <code className="code-inline">frameMode="exact"</code> for sharp frames</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Prefer constant frame rate (CFR) sources</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Enable hardware acceleration (nvenc/videotoolbox)</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Use <code className="code-inline">prefetch</code> for smooth scrubbing</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Share cache across renders with same source</li>
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg>
              Don’ts
            </h3>
            <ul className="space-y-3 text-body">
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Don’t use multiple <code className="code-inline">&lt;FrameVideo /&gt;</code> for same source in one composition</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Avoid VFR sources when possible (transcode to CFR first)</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Don’t use <code className="code-inline">frameMode="blend"</code> for pixel-perfect effects</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Don’t exceed memory cache limits (monitor with <code className="code-inline">cache info</code>)</li>
              <li className="flex items-start gap-2"><svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-15h-2v2h2v-2zm0 18h-2v2h2v-2zM5 12H3v2h2v-2zm18 0h-2v2h2v-2zM3.88 3.88l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM18.36 18.36l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM3.88 20.12l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM20.12 20.12l1.41 1.41-2.12-2.12-1.41 1.41 2.12 2.12z"/></svg> Avoid seeking to un-cached frames in tight loops</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Troubleshooting</h2>

        <div className="space-y-6">
          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Video won’t decode / "Unsupported codec"</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Ensure FFmpeg is installed and supports the codec. Check with <code className="code-inline">ffmpeg -codecs</code>.</p>
              <p>For HEVC/H.265, ensure hardware acceleration is available or use software decoding.</p>
              <p>Try transcoding: <code className="code-inline">ffmpeg -i input.mp4 -c:v libx264 -preset medium output.mp4</code></p>
            </div>
          </details>

          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Frame seeking is slow / stuttering</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Increase memory cache size: <code className="code-inline">BRANDLYFRAMES_FRAME_CACHE_SIZE=240</code></p>
              <p>Enable prefetch: <code className="code-inline">useVideoFrame({"({ src, sourceFrame: frame, prefetch: 10 })"})</code></p>
              <p>Use WebCodecs backend in Studio for hardware-accelerated decoding.</p>
              <p>For render, ensure FFmpeg hardware acceleration is working.</p>
            </div>
          </details>

          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Audio out of sync with video</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Use <code className="code-inline">&lt;FrameAudio /&gt;</code> with matching <code className="code-inline">startFrom</code>, <code className="code-inline">endAt</code>, and <code className="code-inline">playbackRate</code>.</p>
              <p>Enable <code className="code-inline">pitchPreserve={true}</code> for retimed audio.</p>
              <p>Check source has constant frame rate: <code className="code-inline">brandlyframes frames probe</code> shows "VFR: No".</p>
            </div>
          </details>

          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Alpha channel not working</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Source must be WebM VP9 alpha or ProRes 4444. MP4/H.264 doesn’t support alpha.</p>
              <p>Check probe output: "Alpha: Yes" and pixel format shows "yuva".</p>
              <p>Ensure composition uses <code className="code-inline">pixelFormat: 'yuva420p'</code> in render settings.</p>
              <p>Output format must support alpha: WebM VP9 or ProRes.</p>
            </div>
          </details>
        </div>
      </section>      </article>
    </RootLayout>
  );
}