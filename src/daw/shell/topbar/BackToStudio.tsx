import { ArrowLeft } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { IconButton } from '@/daw/ui/IconButton';

/**
 * Back to the Studio dashboard: focus mode's way out of the editor, where
 * the app's sidebar would be. Nothing is asked: the draft autosave and the
 * page-hide flush keep the work (milestone 1.4), and the dashboard's
 * Continue tile reopens it.
 */
export const BackToStudio = memo(function BackToStudio() {
  const navigate = useNavigate();
  return (
    <IconButton
      label="Back to Studio"
      icon={<ArrowLeft />}
      tooltipSide="bottom"
      data-testid="back-to-studio"
      onClick={() => navigate(StudioRoutes.root())}
    />
  );
});
