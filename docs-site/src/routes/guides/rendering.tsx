import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { 
  basicUsageCode,
  platformPresetsCode,
  stillFramesCode,
  autoConcurrencyCode,
  manualOverrideCode,
  memoryManagementCode,
  cloudSetupCode,
  cloudRenderCode,
  costEstimationCode,
  driftTestCode,
  audioInCompositionsCode,
} from '@/code-examples/rendering';

export const Route = createFileRoute('/guides/rendering')({
  component: RenderingGuidePage,
});

function RenderingGuidePage() {
  return (
    <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-text-primary">Guides</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Rendering Videos</span>
        </nav>
        <h1 className="text-display-md mb-4">Rendering Videos</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          Complete guide to rendering BrandlyFrames compositions locally and in the cloud.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Local Rendering</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Render directly on your machine using the <code className="code-inline">brandlyframes render</code> CLI command.
        </p>

        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Basic Usage</span>
          </div>
          <pre className="code-block p-6"><code>{basicUsageCode}</code></pre>
        </div>

        <h3 className="text-heading-md mb-4">Render Options</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-primary text-caption text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-medium w-48">Option</th>
                <th className="pb-3 font-medium w-48">Type</th>
                <th className="pb-3 font-medium">Default</th>
                <th className="pb-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--output, -o</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">string</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">./out.mp4</code></td>
                <td className="text-body text-text-muted">Output file path</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--codec</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">h264 | h265 | vp8 | vp9 | prores | gif</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">h264</code></td>
                <td className="text-body text-text-muted">Video codec</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--crf</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">number (0-51)</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">23</code></td>
                <td className="text-body text-text-muted">Constant Rate Factor (lower = better quality)</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--preset</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">ultrafast ... veryslow</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">medium</code></td>
                <td className="text-body text-text-muted">FFmpeg preset (speed vs compression)</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--concurrency</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">number</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">auto</code></td>
                <td className="text-body text-text-muted">Parallel Chrome tabs/workers</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--pixel-format</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">yuv420p | yuva420p | yuv422p | yuv444p</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">yuv420p</code></td>
                <td className="text-body text-text-muted">Output pixel format</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--color-space</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">bt709 | bt2020 | srgb</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">bt709</code></td>
                <td className="text-body text-text-muted">Output color space</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--audio-codec</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">aac | opus | pcm</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">aac</code></td>
                <td className="text-body text-text-muted">Audio codec</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--hwaccel</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">none | nvenc | videotoolbox | vaapi | qsv</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">auto</code></td>
                <td className="text-body text-text-muted">Hardware acceleration</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm"><code className="code-inline">--transparent</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">boolean</code></td>
                <td className="font-mono text-body-sm"><code className="code-inline">false</code></td>
                <td className="text-body text-text-muted">Transparent background (WebM/ProRes)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-heading-md mb-4">Platform Presets</h3>
        <p className="text-body-lg text-text-muted mb-4">
          One-command exports optimized for specific platforms. Sets codec, bitrate, color space, loudness, and fast-start automatically.
        </p>
        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Platform Export</span>
          </div>
          <pre className="code-block p-6"><code>{platformPresetsCode}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Still Frames</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Export a single frame as PNG/JPEG/WebP. Useful for thumbnails, posters, or frame-accurate screenshots.
        </p>
        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Still Frames</span>
          </div>
          <pre className="code-block p-6"><code>{stillFramesCode}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Concurrency & Performance</h2>
        <p className="text-body-lg text-text-muted mb-6">
          The renderer launches multiple headless Chrome tabs in parallel, each rendering a chunk of frames.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Auto Concurrency</h3>
            <p className="text-body text-text-muted mb-4">
              By default, BrandlyFrames benchmarks your system and picks optimal concurrency.
            </p>
            <div className="card p-4 bg-surface-elevated mb-4">
              <pre className="code-block"><code>{autoConcurrencyCode}</code></pre>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Manual Override</h3>
            <p className="text-body text-text-muted mb-4">
              Override concurrency for specific renders or CI environments.
            </p>
            <pre className="code-block p-4"><code>{manualOverrideCode}</code></pre>
          </div>
        </div>

        <h3 className="text-heading-md mb-4">Memory Management</h3>
        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">Memory Safety</span>
          </div>
          <pre className="code-block p-6"><code>{memoryManagementCode}</code></pre>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Cloud Rendering</h2>
        <p className="text-body-lg text-text-muted mb-6">
          For longer videos, CI/CD, or team workflows, use cloud rendering with automatic chunking, parallel execution, and concatenation.
        </p>

        <div className="space-y-8">
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Setup (One-time)</h3>
            <pre className="code-block p-4"><code>{cloudSetupCode}</code></pre>
          </div>

          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Render in Cloud</h3>
            <pre className="code-block p-4"><code>{cloudRenderCode}</code></pre>
          </div>

          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Cost Estimation</h3>
            <pre className="code-block p-4"><code>{costEstimationCode}</code></pre>
          </div>

          <div className="card p-6 bg-accent-dim/30 border-accent/30">
            <h3 className="text-heading-md mb-4 flex items-center gap-2 text-accent">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              10-Minute Drift Test (BF-082)
            </h3>
            <p className="text-body text-text-muted mb-4">
              BrandlyFrames includes a drift test that renders a 10-minute video and verifies A/V sync across chunk boundaries.
            </p>
            <pre className="code-block p-4"><code>{driftTestCode}</code></pre>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Audio Rendering</h2>
        <p className="text-body-lg text-text-muted mb-6">
          BrandlyFrames mixes audio from <code className="code-inline">Audio</code>, <code className="code-inline">FrameAudio</code>, and volume curves into the final output.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Audio in Compositions</h3>
            <pre className="code-block p-4"><code>{audioInCompositionsCode}</code></pre>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-md mb-4">Audio Quality</h3>
            <ul className="space-y-3 text-body text-text-muted">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> LUFS normalization (-14 LUFS default for web)</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Automatic clipping detection & warning</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> A/V drift test on every render</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Per-frame volume curves via <code className="code-inline">volume</code> prop</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Ducking: <code className="code-inline">{'duck({ target, amount, attack, release })'}</code></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Troubleshooting</h2>

        <div className="space-y-6">
          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Render fails with "Out of Memory"</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Reduce concurrency: <code className="code-inline">--concurrency 2</code></p>
              <p>Enable worker recycling: <code className="code-inline">--worker-recycle-frames 50</code></p>
              <p>Lower chunk size: <code className="code-inline">--chunk-size 100</code></p>
              <p>Check <code className="code-inline">brandlyframes doctor</code> for system diagnostics.</p>
            </div>
          </details>

          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Video plays but has green/corrupted frames</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Usually a codec/pixel format mismatch. Try:</p>
              <p><code className="code-inline">--pixel-format yuv420p --codec h264</code></p>
              <p>For alpha: <code className="code-inline">--pixel-format yuva420p --codec vp9</code></p>
              <p>Ensure source video is not corrupted: <code className="code-inline">ffprobe -v error input.mp4</code></p>
            </div>
          </details>

          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Render is slow / taking forever</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Run <code className="code-inline">brandlyframes benchmark</code> to find optimal settings</p>
              <p>Enable hardware encoding: <code className="code-inline">--hwaccel nvenc</code> (NVIDIA) or <code className="code-inline">--hwaccel videotoolbox</code> (macOS)</p>
              <p>Use faster preset: <code className="code-inline">--preset fast</code> or <code className="code-inline">--preset veryfast</code></p>
              <p>Check CPU/GPU utilization during render</p>
            </div>
          </details>

          <details className="card p-6 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-heading-md">Output video won’t play in browser / Safari</h3>
              <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 text-body text-text-muted space-y-2">
              <p>Use platform preset: <code className="code-inline">--preset web-safe</code> (sets H.264, yuv420p, faststart, bt709)</p>
              <p>Ensure <code className="code-inline">--movflags +faststart</code> for streaming (auto with web-safe)</p>
              <p>Avoid ProRes/VP9 for web delivery — use H.264/MP4</p>
              <p>Check <code className="code-inline">brandlyframes doctor</code> for FFmpeg version compatibility</p>
            </div>
          </details>
        </div>
      </section>

      <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
        <Link to="/api" className="link">← API Reference</Link>
        <Link to="/" className="link">Home →</Link>
      </footer>
    </article>
  );
}