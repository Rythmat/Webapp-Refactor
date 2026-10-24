import type { ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { reloadAfterSaving } from '@/lib/beforeReload';
import { chunkReloadPending } from '@/lib/chunkReload';
import { ErrorPanel } from './ErrorPanel';

// ── The editor route's boundary (milestone 1.12a, bundle-load-16) ──────────
//
// Around /studio's lazy element, in the app's entry: the editor's own
// chunk can fail to arrive (offline, or a tab from before a deploy whose
// one reload didn't help), and that must leave the app's frame standing, not
// fall to the whole-page error. Nothing of the editor has loaded at that
// point, so there is no draft in memory to save. A crash inside the editor
// is DawErrorBoundary's.

function EditorLoadFailed(_: FallbackProps) {
  if (chunkReloadPending()) {
    return (
      <ErrorPanel
        title="Updating the Studio…"
        reason="A new version is out. Reloading onto it."
        testId="editor-load-error"
      />
    );
  }
  const offline = navigator.onLine === false;
  return (
    <ErrorPanel
      title="The Studio couldn’t load"
      reason={
        offline
          ? 'You’re offline. Reconnect, then reload.'
          : 'Its code didn’t arrive. Reloading usually fixes it.'
      }
      actions={[{ label: 'Reload', onClick: () => void reloadAfterSaving() }]}
      testId="editor-load-error"
    />
  );
}

export function EditorRouteBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={EditorLoadFailed}>
      {children}
    </ErrorBoundary>
  );
}
