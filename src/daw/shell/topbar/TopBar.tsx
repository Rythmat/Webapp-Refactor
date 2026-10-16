import { MoreHorizontal, Settings2 } from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { QUIET } from '@/daw/ui/styles';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { shortcutKeys } from '@/daw/commands/shortcuts';
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
import { CountInItems } from './ClickToggle';
import { HelpItems } from './HelpMenu';
import { InspectorToggle } from './InspectorToggle';
import { MusicalTypingChip } from './MusicalTypingChip';
import { ProjectMenu } from './ProjectMenu';
import { ProjectName } from './ProjectName';
import { SaveChipAnnouncer, SaveStatusChip } from './SaveStatusChip';
import { SharePill } from './SharePill';
import { SongChip } from './SongChip';
import { TransportControls } from './TransportControls';
import { UndoRedoButtons } from './UndoRedoButtons';
import { ViewTabs } from './ViewTabs';
import { folded, useToolbarOverflow } from './useToolbarOverflow';

// ── The editor's top bar (milestones 2.5, 2.7) ─────────────────────────────
//
// 44 px, three zones (shell-19, ia-flows-24):
// - project: Back to Studio, the Project menu, the name, the save chip,
//   Undo and Redo;
// - transport: Play, Record, the readout, Loop, Click;
// - song and views: the Song chip, the view tabs, Share, the computer
//   keyboard's chip while it is on, the Inspector toggle, '⋯' and the
//   avatar.
// The owner found the bar too busy (2026-10-16), so it was trimmed and
// quieted: Back, Forward and Stop left it (Esc, Home and End, the ruler),
// Help, Settings and the keyboard's switch went into '⋯', Share is an
// icon, the zones are divided by hairlines and the secondary buttons are
// dimmer. The transport sits centred in the room the other two leave.
// When the zones don't fit, the bar folds (useToolbarOverflow). Each
// control subscribes to its own state, so playback and edits re-render
// none of the bar (the readout writes itself). The left zone leaves room
// for Stage D's assignment strip and the read-only review banner (4.1).

/** The least room either side of the transport (the grid's spacers). */
const BAR_CHROME_PX = 4 + 4;

const TYPING_KEYS = shortcutKeys('typing.on');

export const TopBar = memo(function TopBar({
  isReady,
  onInit,
}: {
  isReady: boolean;
  onInit(): void;
}) {
  useDevCommitCount('TopBar');
  const barRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const centreRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const zones = useMemo(() => [leftRef, centreRef, rightRef], []);
  const fold = useToolbarOverflow(barRef, zones, BAR_CHROME_PX);
  // Undo and Redo are off in the practice view, as Cmd+Z is.
  const practiceView = useStore((s) => s.currentView === 'practice');

  const countInFolded = folded(fold, 'count-in');

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
          aria-label="Transport"
          data-zone="transport"
          className="flex items-center gap-2"
        >
          <Divider />
          <TransportControls
            isReady={isReady}
            onInit={onInit}
            countInFolded={countInFolded}
          />
          <Divider />
        </div>
        <span aria-hidden />
        <div
          ref={rightRef}
          role="group"
          aria-label="Song and views"
          data-zone="views"
          className="flex items-center gap-1"
        >
          <SongChip short={folded(fold, 'song-short')} />
          <ViewTabs tight={folded(fold, 'tabs-tight')} />
          <SharePill iconOnly />
          <MusicalTypingChip />
          <InspectorToggle />
          <MoreMenu countIn={countInFolded} />
          <AvatarMenu className="ml-1" />
        </div>
      </div>
      {/* The chip's live region, apart from the chip (announce={false}):
          Saved, Couldn't save and Audio not saved yet. */}
      <SaveChipAnnouncer />
    </>
  );
});

/** A hairline between the bar's zones. */
function Divider() {
  return <span aria-hidden className="h-5 w-px shrink-0 bg-daw-hairline" />;
}

/**
 * '⋯': the computer keyboard's switch, the count-in when the bar folds it,
 * Help (shortcuts, lessons) and Audio & MIDI settings.
 */
function MoreMenu({ countIn }: { countIn: boolean }) {
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
        {countIn ? (
          <>
            <MenuSeparator />
            <CountInItems />
          </>
        ) : null}
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
