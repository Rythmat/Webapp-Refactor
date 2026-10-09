import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { UpgradeLessonDialog } from '@/daw/components/Tutorial/UpgradeLessonDialog';
import { useDawBodyTokens } from '@/daw/hooks/useDawBodyTokens';
import { openErrorTitle } from '@/daw/session/openErrors';
import {
  backToMyWork,
  cancelOpen,
  dismissUpgradeLesson,
  retryOpen,
} from '@/daw/session/openSession';
import { useSessionStore } from '@/daw/session/sessionStore';
import type { OpenError, OpenIntent } from '@/daw/session/types';
import { OpenErrorPanel } from './OpenErrorPanel';
import { OpeningOverlay } from './OpeningOverlay';

// ── What openSession shows (milestone 1.4, spec E14) ───────────────────────
//
// The store-connected host DawApp mounts once, as a direct child of
// .daw-root: the Opening overlay while useSessionStore.overlay isn't
// 'none', the error panel when an open's error belongs on it, and the
// Premium lesson prompt. The overlay is the only element it renders in
// place (the panel and the prompt portal to <body>), so DawApp's inert
// toggle leaves [data-testid=opening-overlay] out by that test id.

/** The panel's content, held through its close animation. */
interface PanelContent {
  title: string;
  reason: string;
  retryable: boolean;
}

function panelContent(
  error: OpenError,
  intent: OpenIntent | null,
): PanelContent {
  return {
    title: openErrorTitle(intent),
    reason: error.message,
    retryable: error.retryable,
  };
}

export function OpeningHost() {
  // The panel portals to <body>, outside .daw-root's tokens.
  useDawBodyTokens();
  const {
    overlay,
    label,
    waitingFor,
    cancellable,
    error,
    retryIntent,
    intent,
    upgradeLessonId,
  } = useSessionStore(
    useShallow((s) => ({
      overlay: s.overlay,
      label: s.label,
      waitingFor: s.waitingFor,
      cancellable: s.cancellable,
      error: s.error,
      retryIntent: s.retryIntent,
      intent: s.intent,
      upgradeLessonId: s.upgradeLessonId,
    })),
  );

  const panelError = error?.surface === 'panel' ? error : null;
  // The last content shown, so the text doesn't blank while it fades out.
  const [shown, setShown] = useState<PanelContent | null>(null);
  const next = panelError
    ? panelContent(panelError, retryIntent ?? intent)
    : null;
  if (
    next &&
    (shown === null ||
      shown.title !== next.title ||
      shown.reason !== next.reason ||
      shown.retryable !== next.retryable)
  ) {
    setShown(next);
  }

  const onRetry = useCallback(() => {
    void retryOpen();
  }, []);
  const onBack = useCallback(() => {
    void backToMyWork();
  }, []);

  return (
    <>
      {overlay !== 'none' ? (
        <OpeningOverlay
          mode={overlay}
          label={label}
          waitingFor={waitingFor}
          cancellable={cancellable}
          onCancel={cancelOpen}
          onBackToMyWork={waitingFor === 'host' ? onBack : undefined}
        />
      ) : null}
      <OpenErrorPanel
        open={panelError !== null}
        title={shown?.title ?? ''}
        reason={shown?.reason ?? ''}
        retryable={panelError?.retryable ?? shown?.retryable ?? false}
        onRetry={onRetry}
        onBack={onBack}
      />
      <UpgradeLessonDialog
        lessonId={upgradeLessonId}
        onClose={dismissUpgradeLesson}
      />
    </>
  );
}
