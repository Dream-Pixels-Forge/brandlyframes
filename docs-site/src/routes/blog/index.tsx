import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { RootLayout } from '@/components/Layout/RootLayout';

export const Route = createFileRoute('/blog/')({
  component: BlogPage,
});

const posts = [
  {
    title: 'v1.0 "Premiere Night" is out',
    date: '2026-10-19',
    excerpt: '33 packages, first-class frame-by-frame video, and a clean-room MIT license. What shipped and why it took the shape it did.',
    href: '/guides/migration',
    tag: 'Release',
  },
  {
    title: 'Why frame → pixels beats time → pixels',
    date: '2026-10-12',
    excerpt: 'Determinism is the whole game: the same frame number must always yield the same pixels. A short essay on the mental model.',
    href: '/docs/core-concepts',
    tag: 'Engineering',
  },
  {
    title: 'FrameVideo: decoding video into an indexed frame store',
    date: '2026-10-05',
    excerpt: 'Rational timebases, VFR normalization, and content-hashed caches — the design notes behind the headline feature.',
    href: '/docs/frame-video',
    tag: 'Deep dive',
  },
];

function BlogPage() {
  return (
    <RootLayout>
      <article className="animate-on-scroll">
        <header className="mb-12 pb-8 border-b border-border-primary">
          <nav className="flex items-center gap-2 text-caption text-text-muted mb-4" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-text-primary">Home</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            <span className="text-text-primary">Blog</span>
          </nav>
          <h1 className="text-display-md mb-4">Blog</h1>
          <p className="text-body-lg text-text-muted max-w-2xl">
            Release notes, engineering deep dives, and design essays from the BrandlyFrames team.
          </p>
        </header>

        <section className="mb-16">
          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.title} className="card-hover p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge-accent">{post.tag}</span>
                  <time className="text-caption text-text-muted font-mono">{post.date}</time>
                </div>
                <h2 className="text-heading-md mb-2">{post.title}</h2>
                <p className="text-body text-text-muted mb-4">{post.excerpt}</p>
                <Link to={post.href} className="link text-body-sm">Read more →</Link>
              </article>
            ))}
          </div>
        </section>

        <footer className="pt-8 border-t border-border-primary flex items-center justify-between">
          <Link to="/" className="link">← Home</Link>
          <Link to="/examples" className="link">Examples →</Link>
        </footer>
      </article>
    </RootLayout>
  );
}
