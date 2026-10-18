import { MoreHorizontal, Search, Settings2 } from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { QUIET } from '@/daw/ui/styles';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { usePaletteStore } from '@/daw/shell/help/usePaletteStore';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { AvatarMenu } from './AvatarMenu';
import { BackToStudio } from './BackToStudio';
import { HelpItems } from './HelpMenu';
import { MusicalTypingChip } from './MusicalTypingChip';
import { ProjectMenu } from './ProjectMenu';
import { ProjectName } from './ProjectName';
import { SaveChipAnnouncer, SaveStatusChip } from './SaveStatusChip';
import { SharePill } from './SharePill';
import { UndoRedoButtons } from './UndoRedoButtons';
import { ViewTabs } from './ViewTabs';
import { folded, useToolbarOverflow } from './useToolbarOverflow';

// ── The editor's top bar (milestones 2.5, 2.7, B4a) ────────────────────────
//
// 44 px, three zones (shell-19, ia-flows-24):
// - project: Back to Studio, the Project menu, the name, the save chip,
//   Undo and Redo;
// - views: the view tabs, centred;
// - share: Share, the computer keyboard's chip while it is on, '⋯' and the
//   avatar.
// The owner found the bar too busy (2026-10-16), so it was trimmed and
// quieted (2.7: Back, Forward and Stop left it; Help, Settings and the
// keyboard's switch went into '⋯'; Share is an icon; the secondary buttons
// are dimmer), and then, after Soundtrap's, the transport and the song moved
// to the bottom rail and the Inspector's toggle to the side rail (B4a).
// When the zones don't fit, the bar folds (useToolbarOverflow). Each
// control subscribes to its own state, so playback and edits re-render
// none of the bar. The left zone leaves room for Stage D's assignment strip
// and the read-only review banner (4.1).

/** The least room either side of the tabs (the grid's spacers). */
const BAR_CHROME_PX = 4 + 4;

const TYPING_KEYS = shortcutKeys('typing.on');
const PALETTE_KEYS = shortcutKeys('help.palette');

export const TopBar = memo(function TopBar() {
  useDevCommitCount('TopBar');
  const barRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const centreRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const zones = useMemo(() => [leftRef, centreRef, rightRef], []);
  const fold = useToolbarOverflow(barRef, zones, BAR_CHROME_PX);
  // Undo and Redo are off in the practice view, as Cmd+Z is.
  const practiceView = useStore((s) => s.currentView === 'practice');

  return (
    <>
      <div
        ref={barRef}
        data-testid="top-bar"
        data-fold={fold}
        className="grid h-11 items-center overflow-hidden border-b border-daw-hairline bg-daw-bg px-2"
        style={{
          gridTemplateColumns:
            'auto minmax(4px, 1fr) auto minmax(4px, 1fr) auto',
        }}
      >
        <div
          ref={leftRef}
          role="group"
          aria-label="Project"
          data-zone="project"
          className="flex items-center gap-1"
        >
          <BackToStudio />
          <ProjectMenu />
          <ProjectName narrow={folded(fold, 'name-narrow')} />
          <SaveStatusChip announce={false} />
          {practiceView ? null : <UndoRedoButtons />}
        </div>
        <span aria-hidden />
        <div
          ref={centreRef}
          role="group"
          aria-label="Views"
          data-zone="views"
          className="flex items-center"
        >
          <ViewTabs tight={folded(fold, 'tabs-tight')} />
        </div>
        <span aria-hidden />
        <div
          ref={rightRef}
          role="group"
          aria-label="Share and account"
          data-zone="share"
          className="flex items-center gap-1"
        >
          <SharePill iconOnly />
          <MusicalTypingChip />
          <MoreMenu />
          <AvatarMenu className="ml-1" />
        </div>
      </div>
      {/* The chip's live region, apart from the chip (announce={false}):
          Saved, Couldn't save and Audio not saved yet. */}
      <SaveChipAnnouncer />
    </>
  );
});

/**
 * '⋯': the computer keyboard's switch, the command palette, Help (shortcuts,
 * lessons) and Audio & MIDI settings.
 */
function MoreMenu() {
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const typing = useMusicalTypingStore((s) => s.enabled);
  const setTyping = useMusicalTypingStore((s) => s.setEnabled);
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label="More"
          icon={<MoreHorizontal />}
          tooltipSide="bottom"
          data-testid="top-bar-overflow"
          className={QUIET}
        />
      </MenuTrigger>
      <MenuContent align="end" sideOffset={6} data-ds="v2">
        <MenuCheckboxItem
          checked={typing}
          onCheckedChange={setTyping}
          shortcut={TYPING_KEYS.label}
          data-testid="typing-menu-item"
        >
          Play notes from the computer keyboard
        </MenuCheckboxItem>
        <MenuItem
          icon={<Search />}
          shortcut={PALETTE_KEYS.label}
          data-testid="palette-menu-item"
          onSelect={() => usePaletteStore.getState().open()}
        >
          Find a command
        </MenuItem>
        <MenuSeparator />
        <HelpItems />
        <MenuItem
          icon={<Settings2 />}
          data-testid="settings-button"
          onSelect={() => setSettingsOpen(true)}
        >
          Audio & MIDI settings
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
