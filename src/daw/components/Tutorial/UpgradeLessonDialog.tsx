import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';
import { trackPaywallViewed } from '@/telemetry/hooks/useTelemetryProduct';
import { getTutorialEntry } from './tutorialCatalog';

interface UpgradeLessonDialogProps {
  /** The Premium lesson a free student tried to open; null when closed. */
  lessonId: string | null;
  onClose: () => void;
}

/**
 * Says why a Premium lesson didn't open for a free student, and where to go
 * next (owner decision 8: the four Prism lessons are Premium, and Prism is
 * not unlocked during a lesson). The Studio dashboard opens it from a
 * Premium lesson tile, and the editor from a `?tutorial=` link it turned
 * away before clearing anything, so the student's work is still open
 * behind it. Each opening counts as a paywall view.
 *
 * It lives with the lessons rather than the dashboard so the editor doesn't
 * import from the dashboard's tree, and imports only the catalog, so the
 * dashboard chunk stays free of the steps (practice-tutorial-25).
 */
export function UpgradeLessonDialog({
  lessonId,
  onClose,
}: UpgradeLessonDialogProps) {
  const navigate = useNavigate();

  // The lesson named in the copy outlives `lessonId` by the close animation,
  // so the text doesn't change while the dialog fades out.
  const [shownId, setShownId] = useState(lessonId);
  if (lessonId !== null && lessonId !== shownId) setShownId(lessonId);
  const title = getTutorialEntry(shownId)?.title;

  // Once per opening; the ref keeps a re-run effect (StrictMode) from
  // counting the same view twice.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (lessonId === null) {
      reported.current = null;
      return;
    }
    if (reported.current === lessonId) return;
    reported.current = lessonId;
    trackPaywallViewed(window.location.pathname);
  }, [lessonId]);

  const seePlans = () => {
    onClose();
    navigate(ProfileRoutes.plan.definition);
  };

  return (
    <DawDialog
      open={lessonId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="sm"
      title="This lesson uses Prism, part of Premium"
      description={`${title ? `“${title}” has` : 'This lesson has'} steps in Prism, the Studio’s chord and harmony workshop. Lessons without the Premium tag are free.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Not now
          </Button>
          <Button size="lg" variant="primary" onClick={seePlans}>
            See plans
          </Button>
        </>
      }
    />
  );
}
