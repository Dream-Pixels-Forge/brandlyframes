import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/api/')({
  component: ApiReferencePage,
});

function ApiReferencePage() {
  const packages = [
    {
      name: 'brandlyframes',
      displayName: 'brandlyframes (core)',
      description: 'Timeline engine, hooks, primitives, animation utilities',
      version: '0.1.0',
      exports: [
        'registerRoot', 'Composition', 'useCurrentFrame', 'useVideoConfig',
        'Sequence', 'Series', 'Loop', 'Freeze', 'AbsoluteFill',
        'interpolate', 'interpolateColors', 'spring', 'Easing',
        'holdFrame', 'releaseFrame', 'getInputProps', 'staticFile',
        'Img', 'Audio', 'Video', 'FrameVideo', 'FrameAudio',
        'useFont', 'loadFont', 'useMarker', 'sec', 'ms', 'tc',
        'z', 'CompositionSchema', 'CompositionConfig',
      ],
    },
    {
      name: '@brandlyframes/renderer',
      displayName: '@brandlyframes/renderer',
      description: 'Headless Chrome capture, FFmpeg stitching, audio mixing',
      version: '0.1.0',
      exports: [
        'render', 'renderStill', 'captureFrame', 'captureChunk',
        'splitFrameRange', 'DEFAULT_CHROME_FLAGS',
        'BrowserLauncherLike', 'BrowserTabLike', 'LauncherFn',
        'CaptureFrameOptions', 'CaptureChunkOptions', 'FrameRange',
      ],
    },
    {
      name: '@brandlyframes/player',
      displayName: '@brandlyframes/player',
      description: 'Embeddable web player with controls & imperative API',
      version: '0.1.0',
      exports: [
        'Player', 'PlayerRef', 'PlayerProps',
        'registerRoot', 'Composition',
      ],
    },
    {
      name: '@brandlyframes/frames',
      displayName: '@brandlyframes/frames',
      description: 'Frame-exact video: FrameVideo, FrameStore, WebCodecs/FFmpeg backends',
      version: '0.1.0',
      exports: [
        'FrameVideo', 'FrameAudio', 'useVideoFrame',
        'probeVideo', 'extractFrames', 'FrameStore',
        'FfmpegDecodeBackend', 'WebCodecsDecodeBackend',
        'setDecodeBackend', 'getDecodeBackend',
      ],
    },
    {
      name: '@brandlyframes/bundler',
      displayName: '@brandlyframes/bundler',
      description: 'esbuild/Vite bundling with asset manifest',
      version: '0.1.0',
      exports: [
        'bundle', 'createBundle', 'BundleOptions',
        'AssetResolver', 'CodeSplitter', 'OutputOptimizer',
      ],
    },
    {
      name: '@brandlyframes/studio',
      displayName: '@brandlyframes/studio',
      description: 'Live editor: sidebar, scrubber, props editor, error overlay',
      version: '0.1.0',
      exports: [
        'StudioShell', 'PropsEditor', 'ErrorOverlay', 'FrameInspector',
        'Timeline', 'Scrubber', 'CompositionSidebar',
      ],
    },
    {
      name: '@brandlyframes/cloud',
      displayName: '@brandlyframes/cloud',
      description: 'AWS Lambda & GCP Cloud Run parallel rendering',
      version: '0.1.0',
      exports: [
        'renderInCloud', 'createDefaultCloudJob',
        'AwsLambdaAdapter', 'GcpCloudRunAdapter',
        'estimateJobCost', 'checkCostBudget',
        'uploadToStorage', 'concatenateChunks',
        'checkDrift', 'runDriftTest',
      ],
    },
    {
      name: '@brandlyframes/design',
      displayName: '@brandlyframes/design',
      description: 'Cinema Black design system: tokens + React components',
      version: '0.1.0',
      exports: [
        'Button', 'Card', 'Input', 'Badge', 'Tooltip', 'Toast',
        'Modal', 'Tabs', 'Panel', 'Timeline', 'Scrubber',
        'Progress', 'FrameCounter', 'TimecodeInput', 'Logo',
        'tokens', 'colors', 'spacing', 'typography',
      ],
    },
  ];

  return (
    <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-text-primary">Home</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">API Reference</span>
        </nav>
        <h1 className="text-display-md mb-4">API Reference</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          Complete API documentation for all BrandlyFrames packages. 
          All packages are published under the <code className="code-inline">@brandlyframes</code> scope (except core <code className="code-inline">brandlyframes</code>).
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Installation</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Install individual packages or the entire ecosystem. All packages use lockstep versioning.
        </p>

        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">pnpm</span>
          </div>
          <pre className="code-block p-6"><code>{`# Core (required)
pnpm add brandlyframes

# Player for web embedding
pnpm add @brandlyframes/player

# Renderer for video generation
pnpm add @brandlyframes/renderer

# Frame-exact video
pnpm add @brandlyframes/frames

# Studio for development
pnpm add @brandlyframes/studio

# Cloud rendering
pnpm add @brandlyframes/cloud

# Design system
pnpm add @brandlyframes/design

# All at once
pnpm add brandlyframes @brandlyframes/player @brandlyframes/renderer @brandlyframes/frames @brandlyframes/studio @brandlyframes/cloud @brandlyframes/design`}</code></pre>
        </div>

        <div className="card p-6 bg-accent-dim/30 border-accent/30">
          <h3 className="text-heading-sm mb-3 flex items-center gap-2 text-accent">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            Version Policy
          </h3>
          <p className="text-body text-text-muted">
            All packages use <strong>lockstep versioning</strong> — they're released together with the same version number. 
            Check <code className="code-inline">pnpm list @brandlyframes/*</code> to verify consistency.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Package APIs</h2>
        <div className="space-y-8">
          {packages.map((pkg) => (
            <details key={pkg.name} className="card group" open={pkg.name === 'brandlyframes'}>
              <summary className="flex items-center justify-between cursor-pointer list-none p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-heading-md font-mono">{pkg.displayName}</h3>
                    <p className="text-body-sm text-text-muted">{pkg.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="badge-accent">{pkg.version}</span>
                  <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </summary>
              <div className="px-6 pb-6 border-t border-border-primary">
                <div className="flex flex-wrap gap-2 mt-4" role="list">
                  {pkg.exports.map((exp) => (
                    <span 
                      key={exp} 
                      className="code-inline px-3 py-1.5"
                      role="listitem"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Core Hooks Quick Reference</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreHooks.map((hook) => (
            <div key={hook.name} className="card-hover p-6">
              <h3 className="text-heading-sm mb-2 font-mono text-accent">{hook.name}</h3>
              <p className="text-body-sm text-text-muted mb-4">{hook.description}</p>
              <pre className="code-block p-4 text-body-sm"><code>{hook.example}</code></pre>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">TypeScript Configuration</h2>
        <p className="text-body-lg text-text-muted mb-6">
          Recommended TypeScript setup for BrandlyFrames projects.
        </p>
        <div className="card overflow-hidden mb-6">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">tsconfig.json</span>
          </div>
          <pre className="code-block p-6"><code>{`{
  "extends": "@brandlyframes/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "plugins": [
      { "name": "@tanstack/router-plugin", "config": { "routesDirectory": "./src/routes" } }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}`}</code></pre>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-surface-elevated border-b border-border-primary px-4 py-3 flex items-center gap-2">
            <span className="text-caption text-text-muted">tsconfig.base.json (shared)</span>
          </div>
          <pre className="code-block p-6"><code>{`// @brandlyframes/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}`}</code></pre>
        </div>
      </section>

      <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
        <Link to="/docs/frame-video" className="link">← Frame Video</Link>
        <Link to="/guides/rendering" className="link">Rendering Guide →</Link>
      </footer>
    </article>
  );
}

const coreHooks = [
  { name: 'useCurrentFrame', description: 'Current frame number (0-indexed)', example: 'const frame = useCurrentFrame();' },
  { name: 'useVideoConfig', description: 'Video config: fps, width, height, duration', example: 'const { fps, width, height, durationInFrames } = useVideoConfig();' },
  { name: 'interpolate', description: 'Map frame → value with easing', example: 'const opacity = interpolate(frame, [0, 30], [0, 1], { easing: Easing.easeOutExpo });' },
  { name: 'spring', description: 'Physics-based spring animation', example: 'const scale = spring(frame, { fps, durationInFrames: 60, from: 0, to: 1, stiffness: 100, damping: 10 });' },
  { name: 'interpolateColors', description: 'Interpolate between colors', example: 'const color = interpolateColors(frame, [0, 60], ["#000", "#FF6A00"]);' },
  { name: 'holdFrame / releaseFrame', description: 'Async readiness (fonts, images, video)', example: 'const handle = holdFrame(); await loadFont(); releaseFrame(handle);' },
  { name: 'getInputProps', description: 'Get validated composition props', example: 'const props = getInputProps<Props>();' },
  { name: 'useFont / loadFont', description: 'Font loading with auto-hold', example: 'const font = useFont({ src: "./font.woff2" });' },
  { name: 'useMarker', description: 'Named frame markers', example: 'const dropFrame = useMarker("drop");' },
];