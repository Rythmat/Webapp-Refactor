import { CircleHelp, GraduationCap, Keyboard } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useShortcutSheetStore } from '@/daw/shell/help/useShortcutSheetStore';
import { IconButton } from '@/daw/ui/IconButton';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/daw/ui/Menu';

const HELP_KEYS = shortcutKeys('help.shortcuts');

/**
 * The help items, for the '?' menu or, folded, the top bar's '⋯' menu. The
 * shortcut sheet holds the single-key switch, so it stays reachable here
 * with single-key shortcuts (and so ?) turned off.
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
    </>
  );
}

export const HelpMenu = memo(function HelpMenu() {
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label="Help"
          icon={<CircleHelp />}
          tooltipSide="bottom"
          data-testid="help-menu"
        />
      </MenuTrigger>
      <MenuContent align="end" sideOffset={6}>
        <HelpItems />
      </MenuContent>
    </Menu>
  );
});
