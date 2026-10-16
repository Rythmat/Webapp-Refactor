import { MoreHorizontal, Settings2 } from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { AvatarMenu } from './AvatarMenu';
import { BackToStudio } from './BackToStudio';
import { CountInItems } from './ClickToggle';
import { HelpItems, HelpMenu } from './HelpMenu';
import { InspectorToggle } from './InspectorToggle';
import { MusicalTypingChip } from './MusicalTypingChip';
import { ProjectMenu } from './ProjectMenu';
import { ProjectName } from './ProjectName';
import { SaveChipAnnouncer, SaveStatusChip } from './SaveStatusChip';
import { SettingsButton } from './SettingsButton';
import { SharePill } from './SharePill';
import { SongChip } from './SongChip';
import { TransportControls } from './TransportControls';
import { UndoRedoButtons } from './UndoRedoButtons';
import { ViewTabs } from './ViewTabs';
import { folded, useToolbarOverflow } from './useToolbarOverflow';

// ── The editor's top bar (milestone 2.5) ───────────────────────────────────
//
// 44 px, three zones (shell-19, ia-flows-24):
// - project: Back to Studio, the Project menu, the name, the save chip,
//   Undo and Redo;
// - transport: Back, Stop, Play, Record, the readout, Loop, Click;
// - song and views: the Song chip, the view tabs, Share, the computer
//   keyboard's switch, the Inspector toggle, Help, Settings and the avatar.
// The transport sits centred in the room the other two leave. When the
// zones don't fit, the bar folds (useToolbarOverflow) and the '⋯' menu
// holds what it folded. Each control subscribes to its own state, so
// playback and edits re-render none of the bar (the readout writes itself).
// The left zone leaves room for Stage D's assignment strip and the
// read-only review banner (4.1).

/** The least room either side of the transport (the grid's spacers). */
const BAR_CHROME_PX = 4 + 4;

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

  const helpFolded = folded(fold, 'help-settings');
  const countInFolded = folded(fold, 'count-in');
  const anyFolded = helpFolded || countInFolded;

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
          className="flex items-center"
        >
          <TransportControls
            isReady={isReady}
            onInit={onInit}
            countInFolded={countInFolded}
          />
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
          <SharePill iconOnly={folded(fold, 'share-icon')} />
          <MusicalTypingChip compact={folded(fold, 'typing-icon')} />
          <InspectorToggle />
          {helpFolded ? null : (
            <>
              <HelpMenu />
              <SettingsButton />
            </>
          )}
          {anyFolded ? (
            <OverflowMenu help={helpFolded} countIn={countInFolded} />
          ) : null}
          <AvatarMenu className="ml-1" />
        </div>
      </div>
      {/* The chip's live region, apart from the chip (announce={false}):
          Saved, Couldn't save and Audio not saved yet. */}
      <SaveChipAnnouncer />
    </>
  );
});

/** What the bar folded away: Help and Settings, the count-in. */
function OverflowMenu({ help, countIn }: { help: boolean; countIn: boolean }) {
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label="More"
          icon={<MoreHorizontal />}
          tooltipSide="bottom"
          data-testid="top-bar-overflow"
        />
      </MenuTrigger>
      <MenuContent align="end" sideOffset={6}>
        {countIn ? <CountInItems /> : null}
        {countIn && help ? <MenuSeparator /> : null}
        {help ? (
          <>
            <HelpItems />
            <MenuItem
              icon={<Settings2 />}
              onSelect={() => setSettingsOpen(true)}
            >
              Audio & MIDI settings
            </MenuItem>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}
