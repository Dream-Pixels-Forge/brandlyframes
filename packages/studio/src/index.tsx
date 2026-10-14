import { ReactNode } from 'react';

// Studio Shell - Main container for the Studio interface
// Includes: composition sidebar, canvas, scrubber, hot reload (BF-011)
export const StudioShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">Sidebar</aside>
      <main className="studio-main">
        <div className="studio-canvas">Canvas</div>
        <div className="studio-scrubber">Scrubber</div>
      </main>
      {children}
    </div>
  );
};

// TODO: Implement props editor (BF-012), error overlay (BF-411), and frame inspector (BF-412)