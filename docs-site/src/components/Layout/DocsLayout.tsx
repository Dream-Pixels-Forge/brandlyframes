import { Outlet, Link } from '@tanstack/react-router';
import { useState } from 'react';

const docsNavigation = [
  {
    label: 'Introduction',
    items: [
      { href: '/docs/getting-started', label: 'Getting Started' },
      { href: '/docs/core-concepts', label: 'Core Concepts' },
      { href: '/docs/architecture', label: 'Architecture' },
      { href: '/docs/design-system', label: 'Cinema Black Design' },
    ],
  },
  {
    label: 'Core Packages',
    items: [
      { href: '/docs/core', label: '@brandlyframes/core' },
      { href: '/docs/renderer', label: '@brandlyframes/renderer' },
      { href: '/docs/player', label: '@brandlyframes/player' },
      { href: '/docs/frames', label: '@brandlyframes/frames' },
      { href: '/docs/bundler', label: '@brandlyframes/bundler' },
      { href: '/docs/studio', label: '@brandlyframes/studio' },
      { href: '/docs/cloud', label: '@brandlyframes/cloud' },
    ],
  },
  {
    label: 'Features',
    items: [
      { href: '/docs/frame-video', label: 'Frame Video' },
      { href: '/docs/transitions', label: 'Transitions' },
      { href: '/docs/captions', label: 'Captions' },
      { href: '/docs/three', label: 'Three.js Integration' },
      { href: '/docs/media', label: 'Media Utils & Parser' },
      { href: '/docs/fonts', label: 'Fonts' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { href: '/guides/rendering', label: 'Rendering Videos' },
      { href: '/guides/deployment', label: 'Deployment' },
      { href: '/guides/migration', label: 'Migration from Remotion' },
      { href: '/guides/performance', label: 'Performance Tuning' },
      { href: '/guides/testing', label: 'Testing Strategies' },
    ],
  },
];

export function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Docs Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border-primary transform transition-transform duration-normal lg:translate-x-0 ${sidebarOpen ? '' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Documentation navigation"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border-primary">
            <Link to="/docs/getting-started" className="font-display text-display-sm text-accent" onClick={() => setSidebarOpen(false)}>
              DOCS
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-surface-elevated transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6" aria-label="Documentation sections">
            {docsNavigation.map((section, sectionIndex) => (
              <div key={section.label} className="animate-on-scroll" style={{ transitionDelay: `${sectionIndex * 100}ms` }}>
                <h3 className="text-caption text-text-muted mb-3 px-3 uppercase tracking-wider">
                  {section.label}
                </h3>
                <ul className="space-y-1" role="list">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className="toc-link"
                        activeProps={{ className: 'toc-link-active' }}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Version indicator */}
          <div className="p-4 border-t border-border-primary">
            <p className="text-caption text-text-muted text-center">
              v0.1.0 — Public Beta
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen" role="main">
        {/* Mobile docs menu button */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-xl border-b border-border-primary flex items-center justify-between px-4">
          <Link to="/docs/getting-started" className="font-display text-display-sm text-accent">
            DOCS
          </Link>
          <button
            className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open documentation menu"
            aria-expanded={sidebarOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <div className="max-w-content mx-auto px-4 md:px-6 lg:px-8 py-8 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}