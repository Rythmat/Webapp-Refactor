import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileRoutes } from '@/constants/routes';
import { IconButton } from '@/daw/ui/IconButton';
import { BackGlyph } from '@/daw/ui/icons/frameIcons';

/**
 * Back to Home: focus mode's way out of the editor, where the app's sidebar
 * would be. The Studio Dashboard it used to lead to went (owner,
 * 2026-10-24); `/studio` is the editor itself. Nothing is asked: the draft
 * autosave and the page-hide flush keep the work (milestone 1.4), and Home's
 * Projects reopen it.
 */
export const BackToStudio = memo(function BackToStudio() {
  const navigate = useNavigate();
  return (
    <IconButton
      label="Back to Home"
      icon={<BackGlyph />}
      variant="bare"
      size="lg"
      tooltipSide="bottom"
      data-testid="back-to-studio"
      onClick={() => navigate(ProfileRoutes.root())}
    />
  );
});
