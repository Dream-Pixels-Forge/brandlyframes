import { Link } from '@tanstack/react-router';
import { useState, useEffect, type ReactNode } from 'react';

export function RootLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { href: '/', label: 'Home' },
    { href: '/docs/getting-started', label: 'Docs' },
    { href: '/api', label: 'API Reference' },
    { href: '/guides', label: 'Guides' },
    { href: '/examples', label: 'Examples' },
    { href: '/blog', label: 'Blog' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-ui">
      {/* Skip to main content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 btn-primary">
        Skip to main content
      </a>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'} lg:translate-x-0`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-border-primary">
            <Link to="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setSidebarOpen(false)}>
              <span className="w-6 h-6 rounded bg-accent grid place-items-center flex-shrink-0" aria-hidden="true">
                <span className="w-2.5 h-2.5 border-2 border-bg-primary rounded-[2px]" />
              </span>
              <span className="font-display text-xl text-accent tracking-wide truncate">BRANDLYFRAMES</span>
              <span className="badge-accent hidden sm:inline-flex flex-shrink-0">v1.0.0</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-surface-elevated transition-colors flex-shrink-0"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5" aria-label="Documentation sections">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="nav-link block px-3 py-2.5 rounded-lg"
                activeProps={{ className: 'nav-link-active' }}
                activeOptions={{ exact: item.href === '/' }}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border-primary">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-text-primary truncate">MIT Licensed</p>
                <p className="text-caption text-text-muted">Free for commercial use</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        id="main-content"
        className="lg:ml-72 min-h-screen transition-all duration-normal"
        role="main"
      >
        {/* Top Bar */}
        <header className={`sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 lg:px-8 transition-all duration-normal ${scrolled ? 'bg-surface/90 backdrop-blur-xl border-b border-border-primary' : 'bg-transparent'}`}>
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-surface-elevated transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Logo only on mobile — the sidebar shows it on desktop */}
            <Link to="/" className="lg:hidden flex items-center gap-3">
              <span className="font-display text-display-sm text-accent">BRANDLYFRAMES</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4">
              <Link to="/docs/getting-started" className="nav-link hidden sm:inline-flex">Docs</Link>
              <Link to="/api" className="nav-link hidden sm:inline-flex">API</Link>
              <Link to="/guides/rendering" className="nav-link hidden sm:inline-flex">Guides</Link>
            </div>
            
            <div className="flex items-center gap-2">
              <a href="https://github.com/brandlyframes/brandlyframes" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-elevated transition-colors" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="https://npmjs.com/package/brandlyframes" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-elevated transition-colors" aria-label="npm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.401.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C5.575 21.414 12 21.414 12 21.414c0 0 0-1.434 0-2.751 0-2.193-1.27-4.149-3.579-4.149-2.303 0-3.779 2.339-3.779 4.777 0 2.727 2.099 4.648 3.597 4.648 1.697 0 3.26-1.093 3.26-2.642 0-1.145-.72-2.076-1.492-2.076-.674 0-1.272.375-1.396.965h-.027c-.125-.59-.542-1.177-1.167-1.177-.939 0-1.702.747-1.702 1.772 0 1.085.755 1.876 1.843 1.876 1.054 0 1.818-.85 1.818-2.092 0-1.315-.947-2.199-2.379-2.199-1.454 0-2.868 1.093-3.255 2.384-.237.792-.357 1.771-.357 2.408 0 1.142.104 2.247.266 2.581.15.33.445.513.81.513.386 0 .713-.225.845-.55.132-.326.139-.762.04-1.168-.208-.869-.722-1.812-1.589-1.812-1.385 0-2.509 1.119-2.509 2.852 0 1.758 1.12 2.721 2.51 2.721 1.375 0 2.458-.929 2.458-2.264 0-1.113-.665-1.968-1.356-2.134-.048-.012-.097-.024-.144-.024h-.372c-.305 0-.558.217-.558.547 0 .392.324.644.763.644.366 0 .64-.192.762-.43.023-.046.03-.1.03-.158v-1.5c0-.708.052-1.384-.364-2.364-.418-.977-1.13-1.499-2.226-1.499-.747 0-1.459.37-1.904.979-.083.112-.175.21-.275.288-.095.074-.197.138-.306.19-.083.043-.173.073-.269.09l-.413.07c-.22.03-.397.135-.53.306-.13.17-.197.38-.197.63v1.798c0 2.557 1.652 4.587 3.928 4.587 1.155 0 2.186-.515 2.72-1.245.133-.181.228-.397.292-.643.03-.115.04-.23.04-.35 0-.63-.315-1.098-.794-1.098-.354 0-.673.195-.866.516-.182.299-.257.648-.257 1.042 0 .528.142 1.025.405 1.393.247.348.633.55 1.082.55.56 0 .993-.326 1.178-.82.062-.17.107-.35.135-.542.028-.192.038-.384.038-.58 0-.277-.04-.51-.098-.696-.06-.187-.14-.34-.24-.46-.18-.206-.436-.31-.76-.31-.53 0-.94.305-1.208.778-.21.36-.37.75-.473 1.162-.125.507-.188 1.043-.188 1.604 0 1.304.882 2.355 2.153 2.355 1.118 0 2.164-.827 2.164-2.073 0-.954-.524-1.813-1.38-2.185-.148-.064-.303-.112-.464-.137-.31-.046-.63-.068-.953-.068-.52 0-.99.147-1.394.425-.161.111-.327.212-.499.303-.17.09-.336.162-.5.21-.326.095-.71.147-1.15.147-.658 0-1.156-.185-1.478-.495C7.532 21.356 5.087 19.565 5.087 16.563c0-3.007 2.455-5.443 5.456-5.443 1.705 0 3.242.764 4.336 1.964.083.093.162.19.245.284.047.055.097.108.146.158.235.238.51.427.82.555.382.153.79.192 1.22.137.35-.043.68-.16 1.002-.354.477-.28.862-.73 1.107-1.27.172-.38.274-.796.274-1.233 0-.638-.205-1.235-.58-1.722-.377-.49-.894-.798-1.525-.798-.554 0-1.053.25-1.485.694-.426.436-.707.997-.707 1.648 0 .844.337 1.608.91 2.15.574.543 1.327.818 2.226.818.946 0 1.719-.4 2.22-1.046.216-.28.383-.575.505-.877.05-.13.097-.26.14-.385.054-.147.08-.294.08-.445 0-.306-.123-.58-.337-.804-.215-.223-.515-.337-.86-.337-.34 0-.643.114-.88.305-.237.192-.365.46-.365.784 0 .274.077.508.21.694.132.186.327.335.57.44.24.106.507.156.79.156.365 0 .675-.078.915-.215.354-.2.566-.524.655-.93.087-.392.12-.817.12-1.25 0-.764-.166-1.48-.46-2.137-.29-.65-.72-1.18-1.28-1.565-.57-.39-1.25-.58-1.99-.58-1.37 0-2.52 1.043-2.52 2.673 0 1.41.715 2.52 1.87 2.94.12.043.247.077.37.1.394.077.852.122 1.33.122.833 0 1.545-.372 1.957-.987.372-.552.548-1.272.548-2.08 0-.86-.273-1.585-.717-2.138-.443-.55-.998-.875-1.68-.875-.682 0-1.26.327-1.71.866-.448.54-.742 1.23-.742 2.02 0 .79.27 1.45.724 1.93.453.48 1.07.725 1.83.725.983 0 1.755-.47 2.245-1.205.293-.44.525-.92.675-1.4.142-.45.24-.93.24-1.438 0-.837-.352-1.55-.897-1.92-.57-.38-1.26-.568-2.02-.568-.605 0-1.17.18-1.64.502-.47.33-.84.758-1.08 1.248-.238.487-.365 1.016-.365 1.577 0 .88.28 1.63.788 2.1.518.48 1.2.72 2.03.72.84 0 1.55-.27 2.06-.72.57-.5.95-1.15 1.14-1.9.25-.93.29-1.95.29-2.95 0-2.53-1.57-4.58-3.93-4.58-.757 0-1.46.285-2.05.76-.55.435-.957 1.01-1.22 1.67-.26.65-.39 1.34-.39 2.05 0 1.04.26 1.95.702 2.61.44.66 1.015 1.16 1.71 1.49.7.33 1.53.505 2.45.505.937 0 1.77-.177 2.48-.473.7-.3 1.24-.75 1.6-1.32.35-.58.557-1.24.557-1.96 0-1.28-.51-2.33-1.32-3.16-.9-.865-2.1-1.39-3.6-1.39-1.547 0-2.84.475-3.87 1.31-.558.455-.92 1.05-1.08 1.76l-.09.39c-.038.16-.105.305-.198.43-.093.125-.208.227-.34.302-.13.075-.267.134-.414.176-.282.078-.602.112-.95.112-.61 0-1.12-.107-1.53-.302-.41-.195-.71-.47-.887-.823-.18-.353-.27-.75-.27-1.17 0-.788.287-1.48.78-2.07.49-.59 1.13-1.04 1.91-1.34.79-.29 1.65-.436 2.55-.436.91 0 1.74.163 2.49.446.76.28 1.38.72 1.86 1.3.5.58.75 1.31.75 2.18 0 .83-.25 1.57-.7 2.23-.45.66-1.13 1.12-2.03 1.12-.59 0-1.12-.2-1.56-.54-.36-.28-.67-.64-.92-1.1l-.09-.16-.27-.47c-.18-.32-.31-.64-.41-.97-.1-.33-.18-.67-.24-1.02-.05-.35-.07-.7-.07-1.05 0-.55.11-1.01.31-1.38.2-.37.5-.7.92-1.01.42-.31.94-.47 1.55-.47.61 0 1.14.16 1.6.46.46.3.78.73.95 1.27.17.54.25 1.13.25 1.76 0 .93-.22 1.72-.62 2.37-.4.65-.96 1.13-1.68 1.44-.72.31-1.51.47-2.36.47-.86 0-1.61-.16-2.26-.43-.65-.27-1.19-.64-1.58-1.1-.39-.46-.66-1.03-.78-1.68-.12-.65-.18-1.35-.18-2.1 0-1.45.37-2.67 1.06-3.68.69-1.01 1.66-1.84 2.89-2.51.85-.46 1.81-.7 2.9-.7.97 0 1.85.21 2.62.58.77.37 1.37.9 1.81 1.56.43.66.65 1.43.65 2.28 0 .82-.2 1.54-.56 2.17-.36.63-.89 1.12-1.58 1.46-.69.34-1.46.51-2.31.51-.8 0-1.49-.14-2.06-.39z"/>
                </svg>
              </a>
              <button className="btn-primary" onClick={() => setSidebarOpen(true)}>
                Get Started
              </button>
            </div>
          </div>
        </header>

        {children}
      </main>

      {/* Footer */}
      <footer className="lg:ml-72 border-t border-border-primary py-12 px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-content-wide">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link to="/" className="font-display text-display-sm text-accent">BRANDLYFRAMES</Link>
              <p className="mt-4 text-body text-text-muted max-w-xs">Programmatic video SDK for React. Frame → Pixels.</p>
            </div>
            <nav>
              <h4 className="font-medium text-text-primary mb-3">Documentation</h4>
              <ul className="space-y-2">
                <li><Link to="/docs/getting-started" className="nav-link">Getting Started</Link></li>
                <li><Link to="/docs/core-concepts" className="nav-link">Core Concepts</Link></li>
                <li><Link to="/docs/frame-video" className="nav-link">Frame Video</Link></li>
                <li><Link to="/guides/rendering" className="nav-link">Rendering</Link></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-medium text-text-primary mb-3">API Reference</h4>
              <ul className="space-y-2">
                <li><Link to="/api" className="nav-link">Core</Link></li>
                <li><Link to="/api" className="nav-link">Renderer</Link></li>
                <li><Link to="/api" className="nav-link">Player</Link></li>
                <li><Link to="/api" className="nav-link">Frames</Link></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-medium text-text-primary mb-3">Community</h4>
              <ul className="space-y-2">
                <li><a href="https://github.com/brandlyframes/brandlyframes" target="_blank" rel="noopener noreferrer" className="link">GitHub</a></li>
                <li><a href="https://npmjs.com/package/brandlyframes" target="_blank" rel="noopener noreferrer" className="link">npm</a></li>
                <li><a href="https://discord.gg/brandlyframes" target="_blank" rel="noopener noreferrer" className="link">Discord</a></li>
                <li><a href="https://twitter.com/brandlyframes" target="_blank" rel="noopener noreferrer" className="link">Twitter</a></li>
              </ul>
            </nav>
          </div>
          <div className="pt-8 border-t border-border-primary flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-body-sm text-text-muted">MIT Licensed — Free for commercial use</p>
            <p className="text-body-sm text-text-muted">Built with ❤️ by the BrandlyFrames team</p>
          </div>
        </div>
      </footer>
    </div>
  );
}