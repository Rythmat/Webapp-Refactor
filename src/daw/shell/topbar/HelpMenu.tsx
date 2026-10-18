import { GraduationCap, Keyboard, MessageSquareWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useReportProblemStore } from '@/daw/shell/help/useReportProblemStore';
import { useShortcutSheetStore } from '@/daw/shell/help/useShortcutSheetStore';
import { MenuItem } from '@/daw/ui/Menu';

const HELP_KEYS = shortcutKeys('help.shortcuts');

/**
 * The help items, in the top bar's '⋯' menu (the '?' menu until 2.7). The
 * shortcut sheet holds the single-key switch, so it stays reachable here
 * with single-key shortcuts (and so ?) turned off. Report a problem…
 * (2.11) opens a dialog that copies what happened and the session's
 * details for the student to send.
 */
export function HelpItems() {
  const navigate = useNavigate();
  return (
    <>
      <MenuItem
        icon={<Keyboard />}
        shortcut={HELP_KEYS.label}
        onSelect={() => useShortcutSheetStore.getState().open()}
      >
        Keyboard shortcuts
      </MenuItem>
      <MenuItem
        icon={<GraduationCap />}
        onSelect={() => navigate(StudioRoutes.production())}
      >
        Lessons
      </MenuItem>
      <MenuItem
        icon={<MessageSquareWarning />}
        onSelect={() => useReportProblemStore.getState().open()}
        data-testid="report-problem-menu-item"
      >
        Report a problem…
      </MenuItem>
    </>
  );
}
