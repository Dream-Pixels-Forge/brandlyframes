import { ReactNode, useCallback, useState, MouseEvent } from 'react';
import { suggestFix } from './errorCapture';
import { FrameHistory } from './frameHistory';
import { InspectorRegistry, inspectElement, InspectedElement } from './inspector';

export { ErrorCapture, suggestFix, extractComponentName } from './errorCapture';
export type { CapturedRenderError, RecordErrorInput } from './errorCapture';
export { FrameHistory } from './frameHistory';
export { InspectorRegistry, inspectElement, resolveElementProps, getElementStyles } from './inspector';
export type { InspectedElement } from './inspector';

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

// Error Overlay - shows failing component, frame number, props snapshot, and suggested fix (BF-411)
export const ErrorOverlay = ({ 
  error, 
  frameNumber, 
  componentStack, 
  suggestedFix,
  componentName,
  propsSnapshot
}: { 
  error?: Error; 
  frameNumber: number; 
  componentStack?: string; 
  suggestedFix?: string;
  componentName?: string;
  propsSnapshot?: Record<string, unknown>;
}) => {
  if (!error) {
    return null;
  }
  
  return (
    <div className="error-overlay" data-testid="error-overlay" role="alert">
      <div className="error-overlay-header">Render Error</div>
      <div className="error-overlay-content">
        <div className="error-message" data-testid="error-message">{error.message}</div>
        <div className="error-frame" data-testid="error-frame">Frame: {frameNumber}</div>
        {componentName && (
          <div className="error-component-name" data-testid="error-component-name">Component: {componentName}</div>
        )}
        {propsSnapshot && (
          <pre className="error-props-snapshot" data-testid="error-props-snapshot">
            {JSON.stringify(propsSnapshot, null, 2)}
          </pre>
        )}
        <div className="error-component-stack">{componentStack}</div>
        <div className="error-suggested-fix" data-testid="error-suggested-fix">
          <strong>Suggested fix:</strong> {suggestedFix ?? suggestFix(error)}
        </div>
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
// Time-Travel Debugger - scrub back/forward through already-rendered frames, jump to first error (BF-241)
export const TimeTravelDebugger = ({
  history,
  firstErrorFrame,
  onSeek,
}: {
  history: FrameHistory;
  firstErrorFrame?: number | null;
  onSeek?: (frame: number) => void;
}) => {
  const [frame, setFrame] = useState<number | null>(history.current);

  const seek = (frame: number | null) => {
    if (frame === null) return;
    setFrame(frame);
    onSeek?.(frame);
  };

  return (
    <div className="time-travel-debugger" data-testid="time-travel-debugger">
      <div className="time-travel-frame" data-testid="time-travel-frame">
        Frame: {frame ?? '—'}
      </div>
      <button
        className="time-travel-back"
        data-testid="time-travel-back"
        disabled={!history.canBack()}
        onClick={() => seek(history.back())}
      >
        ◀ Back
      </button>
      <button
        className="time-travel-forward"
        data-testid="time-travel-forward"
        disabled={!history.canForward()}
        onClick={() => seek(history.forward())}
      >
        Forward ▶
      </button>
      {firstErrorFrame != null && (
        <button
          className="time-travel-jump-to-error"
          data-testid="time-travel-jump-to-error"
          onClick={() => {
            history.jump(firstErrorFrame);
            seek(firstErrorFrame);
          }}
        >
          Jump to first error (frame {firstErrorFrame})
        </button>
      )}
    </div>
  );
};

// Frame Inspector hook - click any element in the preview to inspect it (BF-412)
// Pair with <FrameInspector element={inspected.element} ... /> and the studio canvas onPointerDown.
export function useFrameInspector(registry?: InspectorRegistry) {
  const [inspected, setInspected] = useState<(InspectedElement & { element: Element }) | null>(null);

  const handlePreviewClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const element = event.target as Element;
      setInspected({ element, ...inspectElement(element, registry) });
    },
    [registry],
  );

  return { inspected, handlePreviewClick };
}

// Cache Counters - surfaces content-addressed cache hit/miss stats (BF-112)
export const CacheCounters = ({
  stats
}: {
  stats: { hits: number; misses: number; hitRate: number }
}) => {
  return (
    <div className="cache-counters">
      <div className="cache-counters-header">Frame Cache</div>
      <div className="cache-counters-content">
        <div className="cache-hits">hits: {stats.hits}</div>
        <div className="cache-misses">misses: {stats.misses}</div>
        <div className="cache-hit-rate">hit rate: {(stats.hitRate * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
};
