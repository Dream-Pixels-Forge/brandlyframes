import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';

export const Route = createFileRoute('/guides/migration')({
  component: MigrationPage,
});

function MigrationPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
      <header className="mb-12 pb-8 border-b border-border-primary">
        <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-text-primary">Guides</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="text-text-primary">Remotion → BrandlyFrames Migration</span>
        </nav>
        <h1 className="text-display-md mb-4">Migrating from Remotion</h1>
        <p className="text-body-lg text-text-muted max-w-2xl">
          BrandlyFrames replicates Remotion's architecture and concepts — never its source code. Public API names are BrandlyFrames' own. Use this table to map your existing Remotion code to BrandlyFrames.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Core API Name Mapping</h2>
        <div className="card overflow-hidden mb-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-primary text-caption text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-medium w-1/3">Concept</th>
                <th className="pb-3 font-medium w-1/3">Remotion</th>
                <th className="pb-3 font-medium w-1/3">BrandlyFrames</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {[
                ['Register entry', '`registerRoot`', '`registerRoot`'],
                ['Declare a video', '`<Composition>`', '`<Composition>`'],
                ['Current frame', '`useCurrentFrame()`', '`useCurrentFrame()`'],
                ['Video config', '`useVideoConfig()`', '`useVideoConfig()`'],
                ['Time shift / scoping', '`<Sequence>`', '`<Sequence>`'],
                ['Sequential layout', '`<Series>`', '`<Series>`'],
                ['Fill layer', '`<AbsoluteFill>`', '`<AbsoluteFill>`'],
                ['Value mapping', '`interpolate()`', '`interpolate()`'],
                ['Physics easing', '`spring()`', '`spring()`'],
                ['Colors', '`interpolateColors()`', '`interpolateColors()`'],
                ['Loop / freeze', '`<Loop>`, `<Freeze>`', '`<Loop>`, `<Freeze>`'],
                ['Video (realtime)', '`<Video>`, `<OffthreadVideo>`', '`<Video>`'],
                ['Video (frame-exact)', '(partial, via OffthreadVideo)', 'FrameVideo'],
                ['Audio / Image', '`<Audio>`, `<Img>`', '`<Audio>`, `<Img>`'],
                ['Static assets', '`staticFile()`', '`staticFile()`'],
                ['Async readiness', '`delayRender` / `continueRender`', '`holdFrame()` / `releaseFrame()`'],
                ['Input props', '`getInputProps()`', '`getInputProps()`'],
                ['Config file', '`remotion.config.ts`', '`brandlyframes.config.ts`'],
              ].map((row) => (
                <tr key={row[0]} className="py-3">
                  <td className="font-mono text-body-sm text-text-primary">{row[0]}</td>
                  <td className="font-mono text-body-sm text-text-muted">{row[1]}</td>
                  <td className="font-mono text-body-sm text-text-primary">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Package Name Mapping</h2>
        <div className="card overflow-hidden mb-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-primary text-caption text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-medium w-1/3">Layer</th>
                <th className="pb-3 font-medium w-1/3">Remotion</th>
                <th className="pb-3 font-medium w-1/3">BrandlyFrames</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {[
                ['Core (hooks, components, timing)', '`remotion`', '`brandlyframes`'],
                ['CLI', '`@remotion/cli`', '`@brandlyframes/cli`'],
                ['Bundler', '`@remotion/bundler`', '`@brandlyframes/bundler`'],
                ['Renderer', '`@remotion/renderer`', '`@brandlyframes/renderer`'],
                ['Studio', '`@remotion/studio`', '`@brandlyframes/studio`'],
                ['Player', '`@remotion/player`', '`@brandlyframes/player`'],
                ['Cloud rendering', '`@remotion/lambda` / `cloudrun`', '`@brandlyframes/cloud`'],
                ['Frame-by-frame video', '(partial)', '`@brandlyframes/frames`'],
                ['Zod types', '`@remotion/zod-types`', '`@brandlyframes/zod-types`'],
              ].map((row) => (
                <tr key={row[0]} className="py-3">
                  <td className="font-mono text-body-sm text-text-primary">{row[0]}</td>
                  <td className="font-mono text-body-sm text-text-muted">{row[1]}</td>
                  <td className="font-mono text-body-sm text-text-primary">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Code Before / After</h2>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 text-text-muted uppercase tracking-wider">Remotion</h3>
            <pre className="code-block p-4"><code>{`import { registerRoot, Composition, useCurrentFrame } from "remotion";

registerRoot();

const MyComp = () => {
  const frame = useCurrentFrame();
  return <div>Frame {frame}</div>;
};

<Composition id="my-video" width={1920} height={1080} fps={30} durationInFrames={90}>
  <MyComp />
</Composition>`}</code></pre>
          </div>
          <div className="card p-6">
            <h3 className="text-heading-md mb-4 text-text-primary uppercase tracking-wider">BrandlyFrames</h3>
            <pre className="code-block p-4"><code>{`import { registerRoot, Composition, useCurrentFrame } from "brandlyframes";

registerRoot();

const MyComp = () => {
  const frame = useCurrentFrame();
  return <div>Frame {frame}</div>;
};

<Composition id="my-video" width={1920} height={1080} fps={30} durationInFrames={90}>
  <MyComp />
</Composition>`}</code></pre>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-heading-md mb-4">CLI commands</h3>
          <table className="w-full text-left divide-y divide-border-primary">
            <thead>
              <tr className="border-b border-border-primary text-caption text-text-muted uppercase tracking-wider">
                <th className="pb-3 font-medium w-1/3">Task</th>
                <th className="pb-3 font-medium w-1/3">Remotion CLI</th>
                <th className="pb-3 font-medium w-1/3">BrandlyFrames CLI</th>
              </tr>
            </thead>
            <tbody>
              <tr className="py-3">
                <td className="font-mono text-body-sm text-text-primary">Start dev server</td>
                <td className="font-mono text-body-sm text-text-muted">`remotion studio`</td>
                <td className="font-mono text-body-sm text-text-primary">`brandlyframes dev`</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm text-text-primary">Render video</td>
                <td className="font-mono text-body-sm text-text-muted">`remotion render`</td>
                <td className="font-mono text-body-sm text-text-primary">`brandlyframes render`</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm text-text-primary">Capture still</td>
                <td className="font-mono text-body-sm text-text-muted">`remotion still`</td>
                <td className="font-mono text-body-sm text-text-primary">`brandlyframes still`</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm text-text-primary">Scaffold project</td>
                <td className="font-mono text-body-sm text-text-muted">`npm create remotion`</td>
                <td className="font-mono text-body-sm text-text-primary">`npm create brandlyframes@latest`</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm text-text-primary">System diagnostics</td>
                <td className="font-mono text-body-sm text-text-muted">—</td>
                <td className="font-mono text-body-sm text-text-primary">`brandlyframes doctor`</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm text-text-primary">Performance benchmark</td>
                <td className="font-mono text-body-sm text-text-muted">—</td>
                <td className="font-mono text-body-sm text-text-primary">`brandlyframes benchmark`</td>
              </tr>
              <tr className="py-3">
                <td className="font-mono text-body-sm text-text-primary">SDK upgrade</td>
                <td className="font-mono text-body-sm text-text-muted">—</td>
                <td className="font-mono text-body-sm text-text-primary">`brandlyframes upgrade`</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-heading-lg mb-6">Key Differences</h2>
        <ul className="space-y-4 text-body text-text-muted">
          <li className="flex items-start gap-3">
            <span className="text-accent font-medium">1.</span>
            <div>
              <p className="text-text-primary"><strong>Clean-room implementation.</strong> BrandlyFrames is written from scratch under MIT. No Remotion source code, docs text, or assets are copied.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent font-medium">2.</span>
            <div>
              <p className="text-text-primary"><strong>First-class frame-by-frame video.</strong> The &lt;FrameVideo&gt; component decodes source video into an indexed frame cache (FrameStore) — exact frame addressing, VFR-safe, with alpha and color-space support.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent font-medium">3.</span>
            <div>
              <p className="text-text-primary"><strong>No render fees, permissive license.</strong> MIT licensed, free for commercial use, no per-seat or per-render licensing.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent font-medium">4.</span>
            <div>
              <p className="text-text-primary"><strong>Cinema Black design system.</strong> Black, white, and orange tokens applied consistently across Studio, Player, docs, CLI, and templates.</p>
            </div>
          </li>
        </ul>
      </section>      </article>
    </RootLayout>
  );
}