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

// Props Editor - Generated from Zod schema (BF-012)
export const PropsEditor = <T extends Record<string, any>>({ 
  schema, 
  initialData, 
  onChange 
}: { 
  schema: any; 
  initialData?: T; 
  onChange: (data: T) => void 
}) => {
  // TODO: Implement actual form generation from Zod schema
  // This would use zod-to-json-schema or similar to generate UI components
  return (
    <div className="props-editor">
      <div className="props-editor-header">Props Editor</div>
      <div className="props-editor-content">
        {/* Form fields would be generated here based on schema */}
        <div className="props-editor-placeholder">
          Props editor for: {JSON.stringify(schema)}
        </div>
      </div>
    </div>
  );
};

// TODO: Implement error overlay (BF-411) and frame inspector (BF-412)