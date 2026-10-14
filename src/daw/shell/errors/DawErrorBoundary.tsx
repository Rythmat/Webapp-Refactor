import { useEffect, useState, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { flushLiveDraft } from '@/daw/persistence/drafts/autosave';
import { reloadAfterSaving } from '@/lib/beforeReload';
import { chunkReloadPending, isChunkLoadError } from '@/lib/chunkReload';
import { ErrorPanel } from './ErrorPanel';

// ── The editor's boundaries (milestone 1.12a, bundle-load-16) ──────────────
//
// DawErrorBoundary goes around the whole editor: a crash writes the open
// session to its draft at once (flushLiveDraft), then offers Reload editor,
// which reopens it, or Back to Studio. PartBoundary goes around each part
// that loads on its own (a view, a dock tab, an instrument, a dialog), so a
// part that fails costs only its own area: a chunk that didn't arrive offers
// Reload editor (a failed module stays failed until the page reloads), any
// other error Try again, which mounts the part afresh.

type SaveState = 'saving' | 'saved' | 'failed';

function useFlushOnCrash(): SaveState {
  const [state, setState] = useState<SaveState>('saving');
  useEffect(() => {
    let alive = true;
    flushLiveDraft().then(
      () => alive && setState('saved'),
      (err: unknown) => {
        console.error('[studio] saving the draft after a crash failed:', err);
        if (alive) setState('failed');
      },
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

function EditorCrashed(_: FallbackProps) {
  const saved = useFlushOnCrash();
  const navigate = useNavigate();
  if (chunkReloadPending()) {
    return (
      <ErrorPanel
        title="Updating the Studio…"
        reason="A new version is out. Your work is saved and reopens after the reload."
        testId="daw-error"
      />
    );
  }
  return (
    <ErrorPanel
      title="Something went wrong in the editor"
      reason={
        saved === 'saving'
          ? 'Saving your work on this device…'
          : saved === 'saved'
            ? 'Your work is kept on this device. Reload the editor to carry on.'
            : 'The last changes may not be kept. Reload the editor to carry on.'
      }
      actions={[
        { label: 'Reload editor', onClick: () => void reloadAfterSaving() },
        {
          label: 'Back to Studio',
          onClick: () => navigate(StudioRoutes.root.definition),
        },
      ]}
      testId="daw-error"
    />
  );
}

export function DawErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={EditorCrashed}
      onError={(error) => console.error('[studio] editor crashed:', error)}
    >
      {children}
    </ErrorBoundary>
  );
}

function PartFailed({
  error,
  resetErrorBoundary,
  name,
}: FallbackProps & { name: string }) {
  if (chunkReloadPending()) {
    return (
      <ErrorPanel
        compact
        title="Updating the Studio…"
        reason="A new version is out. Reloading onto it."
        testId="daw-part-error"
      />
    );
  }
  const missingCode = isChunkLoadError(error);
  return (
    <ErrorPanel
      compact
      title={`The ${name} couldn’t ${missingCode ? 'load' : 'open'}`}
      reason={
        missingCode
          ? navigator.onLine === false
            ? 'You’re offline. Your work is safe; reconnect, then reload.'
            : 'Its code didn’t arrive. Your work is safe; reloading fixes it.'
          : 'Your work is safe. Try again, or reload the editor.'
      }
      actions={
        missingCode
          ? [
              {
                label: 'Reload editor',
                onClick: () => void reloadAfterSaving(),
              },
            ]
          : [
              { label: 'Try again', onClick: resetErrorBoundary },
              {
                label: 'Reload editor',
                onClick: () => void reloadAfterSaving(),
              },
            ]
      }
      testId="daw-part-error"
    />
  );
}

/** A boundary around one lazily loaded part; `name` reads "The {name} …". */
export function PartBoundary({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallbackRender={(props) => <PartFailed {...props} name={name} />}
      onError={(error) => console.error(`[studio] the ${name} failed:`, error)}
    >
      {children}
    </ErrorBoundary>
  );
}
