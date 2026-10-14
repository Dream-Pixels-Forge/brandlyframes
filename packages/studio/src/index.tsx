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
export const PropsEditor = <T extends Record<string, unknown>>({ 
  schema, 
  _initialData, 
  _onChange 
}: { 
  schema: Record<string, unknown>; 
  _initialData?: T; 
  _onChange: (data: T) => void 
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

// Error Overlay - shows failing component, frame number, and props, plus suggested fix (BF-411)
export const ErrorOverlay = ({ 
  error, 
  frameNumber, 
  componentStack, 
  suggestedFix 
}: { 
  error?: Error; 
  frameNumber: number; 
  componentStack: string; 
  suggestedFix?: string 
}) => {
  if (!error) {
    return null;
  }
  
  return (
    <div className="error-overlay">
      <div className="error-overlay-header">Render Error</div>
      <div className="error-overlay-content">
        <div className="error-message">{error.message}</div>
        <div className="error-frame">Frame: {frameNumber}</div>
        <div className="error-component-stack">{componentStack}</div>
        {suggestedFix && (
          <div className="error-suggested-fix">
            <strong>Suggested fix:</strong> {suggestedFix}
          </div>
        )}
      </div>
    </div>
  );
};

// Frame Inspector - click any element to see its computed props/styles at the current frame (BF-412)
export const FrameInspector = ({ 
  element, 
  frameNumber, 
  computedProps, 
  computedStyles 
}: { 
  element: Element | null; 
  frameNumber: number; 
  computedProps: Record<string, unknown>; 
  computedStyles: Record<string, string> 
}) => {
  if (!element) {
    return null;
  }
  
  return (
    <div className="frame-inspector">
      <div className="frame-inspector-header">Frame Inspector</div>
      <div className="frame-inspector-content">
        <div className="frame-info">Frame: {frameNumber}</div>
        <div className="element-info">Element: {element.tagName}</div>
        <div className="props-section">
          <strong>Computed Props:</strong>
          <pre>{JSON.stringify(computedProps, null, 2)}</pre>
        </div>
        <div className="styles-section">
          <strong>Computed Styles:</strong>
          <pre>{JSON.stringify(computedStyles, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};