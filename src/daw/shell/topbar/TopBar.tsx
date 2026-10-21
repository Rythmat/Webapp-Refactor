import { MoreHorizontal, Search, Settings2 } from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { PillGroup } from '@/daw/ui/Pill';
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
import { ExportPill } from './ExportPill';
import { HelpItems } from './HelpMenu';
import { MusicalTypingChip } from './MusicalTypingChip';
import { ProjectMenu } from './ProjectMenu';
import { ProjectName } from './ProjectName';
import { SaveChipAnnouncer, SaveStatusChip } from './SaveStatusChip';
import { SharePill } from './SharePill';
import { SongControls } from '../bottombar/SongControls';
import { TransportControls } from '../bottombar/TransportControls';
import { UndoRedoButtons } from './UndoRedoButtons';
import { folded, useToolbarOverflow } from './useToolbarOverflow';

// ── The editor's top bar (milestones 2.5, 2.7, B4a; the floating frame, S0) ─
//
// 44 px, its controls in pills on the page, laid out as the floating frame
// is (owner, 2026-10-21):
// - project, at the left: Back, the Project menu, the name and the save
//   chip in one pill; Undo and Redo in the next;
// - transport, centred in the bar: Click, Go to start, Rewind, Record,
//   Play, Fast-forward and Loop in one pill, the position in the next;
// - song and share, at the right: Key, Tempo and Metre in one pill; Share,
//   the computer keyboard's chip and '⋯' in the next; the white Export pill
//   and the avatar.
// The view tabs (Create, Mix, Score) moved to the bottom rail's centre.
// When the zones don't fit, the bar folds (useToolbarOverflow). Each
// control subscribes to its own state, so playback and edits re-render
// none of the bar. The left zone leaves room for Stage D's assignment strip
// and the read-only review banner (4.1).

/** The least room either side of the transport (the grid's spacers). */
const BAR_CHROME_PX = 4 + 4;

const TYPING_KEYS = shortcutKeys('typing.on');
const PALETTE_KEYS = shortcutKeys('help.palette');

export interface TopBarProps {
  /** Whether the audio engine is up; the transport starts it if not. */
  isReady?: boolean;
  onInit?(): void;
}

const noop = () => {};

export const TopBar = memo(function TopBar({
  isReady = true,
  onInit = noop,
}: TopBarProps) {
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
        className="grid h-11 items-center overflow-hidden px-2"
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
          className="flex items-center gap-2"
        >
          <PillGroup label="Project name and menu" className="pr-2">
            <BackToStudio />
            <ProjectMenu />
            <ProjectName narrow={folded(fold, 'name-narrow')} />
            <SaveStatusChip announce={false} />
          </PillGroup>
          {practiceView ? null : (
            <PillGroup label="Undo and redo">
              <UndoRedoButtons />
            </PillGroup>
          )}
        </div>
        <span aria-hidden />
        <div
          ref={centreRef}
          role="group"
          aria-label="Transport"
          data-zone="transport"
          className="flex items-center gap-2"
        >
          <TransportControls isReady={isReady} onInit={onInit} />
        </div>
        <span aria-hidden />
        <div
          ref={rightRef}
          role="group"
          aria-label="Song, share and account"
          data-zone="share"
          className="flex items-center gap-2"
        >
          <PillGroup label="Song" data-zone="song" className="px-1">
            <SongControls short={folded(fold, 'key-short')} />
          </PillGroup>
          <PillGroup label="Share and more">
            <SharePill iconOnly />
            <MusicalTypingChip />
            <MoreMenu />
          </PillGroup>
          <ExportPill iconOnly={folded(fold, 'export-icon')} />
          <AvatarMenu className="ml-1" />
        </div>
      </div>
      {/* The chip's live region, apart from the chip (announce={false}):
          Saved, Couldn't save and Audio not saved yet. */}
      <SaveChipAnnouncer />
    </>
  );
});

/** The '⋯' menu's switches, each with its one line (2.11). */
export const MORE_COPY = {
  typing: 'Letter keys play notes on the selected track',
  hoverHints: 'Say what each control does at the bottom',
} as const;

/**
 * '⋯': the computer keyboard's switch, the hover hints' switch, the command
 * palette, Help (shortcuts, lessons) and Audio & MIDI settings.
 */
function MoreMenu() {
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const hoverHints = useStore((s) => s.hoverHints);
  const setHoverHints = useStore((s) => s.setHoverHints);
  const typing = useMusicalTypingStore((s) => s.enabled);
  const setTyping = useMusicalTypingStore((s) => s.setEnabled);
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label="More"
          icon={<MoreHorizontal />}
          variant="bare"
          size="lg"
          tooltipSide="bottom"
          data-testid="top-bar-overflow"
        />
      </MenuTrigger>
      <MenuContent align="end" sideOffset={6} data-ds="v2">
        <MenuCheckboxItem
          checked={typing}
          onCheckedChange={setTyping}
          shortcut={TYPING_KEYS.label}
          description={MORE_COPY.typing}
          data-testid="typing-menu-item"
        >
          Play notes from the computer keyboard
        </MenuCheckboxItem>
        <MenuCheckboxItem
          checked={hoverHints}
          onCheckedChange={setHoverHints}
          description={MORE_COPY.hoverHints}
          data-testid="hover-hints-menu-item"
        >
          Hover hints
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
