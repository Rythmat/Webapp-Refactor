import { ChevronDown, ChevronUp, Minimize2, Sparkles } from 'lucide-react';
import { useTrackColor } from '@/daw/harmony/trackColor';
import { memo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/components/utilities';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { auditionNote } from '@/daw/audio/auditionNote';
import { DOCK_MAX_SCOPE, DOCK_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { TrackControlsPanel } from '@/daw/components/Controls/TrackControlsPanel';
import { AutomationLaneEditor } from '@/daw/components/Timeline/AutomationLaneEditor';
import { resolveEditorClip } from '@/daw/model/editorClip';
import { useSessionGeneration } from '@/daw/session/useSessionGeneration';
import {
  ClipPianoRollPart,
  DrumMachineViewPart,
  EffectsPanelPart,
  PrismPanelPart,
} from '@/daw/shell/lazyParts';
import { hintText } from '@/daw/shell/help/hintSource';
import { DOCK_TAB_BAR_PX } from '@/daw/shell/layout/layoutModel';
import { useStore, type Track } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import { barStartTick, timeSignatureOf } from '@/daw/time/timeModel';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useIsPremium } from '@/hooks/useIsPremium';
import {
  dockKindOf,
  isChannelStripTabId,
  tabFor,
  type DockKind,
} from './dockTabs';
import { toggleDock } from './dockOpen';

// ── The editor dock (milestones 2.4, 2.9) ──────────────────────────────────
//
// Between the canvas and the bottom rail, stopping at the Inspector. It
// shows the selected track's editors, by what the track is (dockTabs.ts).
// The bottom rail's Instrument, FX and Edit open them (dockViews.ts, the
// floating frame's bottom bar, 2026-10-21). Open on a track it has no title
// row: its Close floats in its top-right corner, so the sound menu
// and the instrument get the height (owner, 2026-10-21); Master and a shut
// dock keep the 32 px row with the name. No tabs. A track with no input
// shows its chain whatever the tab; an Audio track shows its one dock (its
// Tuner, amp, pitch correction and effects). Selection drives it: it
// follows the selected track, keeping the tab that applies, and a click on
// a clip opens that clip's editor here (dockSelection.ts). Notes is the one
// note editor: the piano roll, or the drum grid on drums. There is no
// Maximize button (owner, 2026-10-22: what needs room has its own Expand);
// the effect cards' Show all still grows the dock over the canvas, and
// Restore or Escape gives the canvas back. The bottom rail's Master
// opens Master in the same slot.
//
// Its height is a share of the body per tab, never a fixed px height
// (shellGeometry: --daw-dock-h); a shut dock is its 32 px header. The
// frame is built on the design system; the tabs' contents are the legacy
// components until Stage C restyles them.

/** The dock's height before the shell has measured itself (220 px, 2.4). */
const DOCK_FALLBACK_PX = 220;

const MAX_KEYS = shortcutKeys('dockMax.restore');

const INSTRUMENT_LABEL: Partial<Record<Track['instrument'], string>> = {
  'oracle-synth': 'Synth',
  soundfont: 'GM',
  'drum-machine': 'Drums',
  'audio-input': 'Audio',
};

/**
 * How far from the dock's right edge its own controls sit: past the
 * Inspector while it is open, since the Inspector lies over the dock's right
 * end (StudioShell), so its buttons stay in reach.
 */
function insetRight(px: number): string {
  return useStore.getState().libraryOpen
    ? `calc(var(--daw-insp-w, 300px) + ${px}px)`
    : `${px}px`;
}

/** The tab that opens a shut dock for a track of `kind`. */
const openingTab = (kind: DockKind): ChannelStripTabId =>
  kind === 'audio' ? 'fx' : 'controls';

export const Dock = memo(function Dock() {
  const rootRef = useRef<HTMLDivElement>(null);
  // The open tab lives in the store (uiSlice) so lessons can open one.
  const activeTab = useStore((s) => s.channelStripTab);
  const setActiveTab = useStore((s) => s.setChannelStripTab);
  const master = useStore((s) => s.dockMaster);
  const setMaster = useStore((s) => s.setDockMaster);
  const maximized = useStore((s) => s.dockMaximized);
  const setMaximized = useStore((s) => s.setDockMaximized);

  // The selected track only, not the whole tracks array: an edit to another
  // track re-renders nothing here.
  const track = useStore((s) =>
    s.tracks.find((t) => t.id === s.selectedTrackId),
  );
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const trackCount = useStore((s) => s.tracks.length);
  const kind = dockKindOf(track);
  // An open automation lane (the bottom rail's Automation, a track's ⋯) is
  // a dock view too: it shows in the dock, over the tab, until another view
  // is picked or the dock shuts (owner, 2026-10-21).
  const automation = useStore((s) => s.automationOpenTrackId !== null);
  // Re-renders as the Inspector opens and shuts: it covers the dock's right
  // end, and the dock's controls move clear of it (insetRight).
  useStore((s) => s.libraryOpen);
  const open = activeTab !== null || master || automation;
  // An open dock has no title row, a track's or Master's (owner,
  // 2026-10-22: Master's dock is like the others); a shut one keeps it.
  const headerless = open && (master || track !== undefined);

  // The session generation moves on with every load and reset of the
  // project (sessionGeneration.ts). A project opened in place of another goes
  // from some tracks straight to others, and only the generation tells that
  // apart from an edit.
  const generation = useSessionGeneration();
  const seenGeneration = useRef(generation);
  const prevTrackCount = useRef(0);

  // Open on Instrument when a project's tracks arrive with the dock shut:
  // the student added the first track, a project opened in place of
  // another, or the dock mounted over one (it mounts empty before the boot
  // restores the draft, and again on every return to Create). A load resets
  // the tab (initialProjectState), so a new project opens on Instrument.
  // The tab a restored draft was left on stays, and so does an open tab when
  // the dock mounts again over the same project.
  useEffect(() => {
    const firstTrack = prevTrackCount.current === 0;
    const opened = generation !== seenGeneration.current;
    if (
      trackCount > 0 &&
      (firstTrack || opened) &&
      !isChannelStripTabId(activeTab)
    ) {
      setActiveTab('controls');
    }
    seenGeneration.current = generation;
    prevTrackCount.current = trackCount;
  }, [trackCount, generation, activeTab, setActiveTab]);

  // Follow the selected track: keep the tab when it applies, else take the
  // one in its place (Prism and Grooves; tabFor).
  useEffect(() => {
    if (activeTab === null) return;
    const next = tabFor(kind, activeTab);
    if (next !== activeTab) setActiveTab(next);
  }, [kind, activeTab, setActiveTab]);

  // A track chosen while Master shows takes the slot back, on its tab.
  const lastSelected = useRef(selectedTrackId);
  useEffect(() => {
    if (lastSelected.current === selectedTrackId) return;
    lastSelected.current = selectedTrackId;
    const s = useStore.getState();
    if (!s.dockMaster) return;
    setMaster(false);
    if (s.channelStripTab === null) setActiveTab(openingTab(kind));
  }, [selectedTrackId, kind, setMaster, setActiveTab]);

  const close = useCallback(() => {
    setActiveTab(null);
    useStore.getState().setAutomationOpenTrackId(null);
  }, [setActiveTab]);
  const toggleMaximized = useCallback(
    () => setMaximized(!useStore.getState().dockMaximized),
    [setMaximized],
  );

  // Escape gives the canvas back from a maximized dock, wherever focus is;
  // in the dock, Escape shuts it (and the timeline's clip keys stay out).
  useKeymap(
    DOCK_MAX_SCOPE.id,
    { 'dockMax.restore': () => setMaximized(false) },
    { active: maximized && open },
  );
  useKeymap(DOCK_SCOPE.id, { 'dock.close': close }, { element: rootRef });

  return (
    <div
      ref={rootRef}
      data-testid="dock"
      data-kind={master ? 'master' : kind}
      data-tab={
        automation ? 'automation' : master ? 'master' : (activeTab ?? undefined)
      }
      data-maximized={(maximized && open) || undefined}
      className="relative flex h-full shrink-0 flex-col border-t border-daw-hairline bg-daw-surface-1"
    >
      {headerless ? (
        // Open on a track: no title row (owner, 2026-10-21), so the sound
        // menu and the instrument get its height; its controls float in the
        // top-right corner.
        <div
          data-testid="dock-header"
          data-floating
          className="absolute top-1.5 z-[var(--daw-z-sticky)] flex items-center gap-1 rounded-[var(--daw-radius-md)] bg-daw-surface-1"
          style={{ right: insetRight(6) }}
        >
          <DockControls
            kind={kind}
            activeTab={activeTab}
            master={master}
            open={open}
            maximized={maximized && open}
            onToggleMaximized={toggleMaximized}
            onClose={close}
          />
        </div>
      ) : (
        <DockHeader
          track={track}
          kind={kind}
          activeTab={activeTab}
          master={master}
          open={open}
          maximized={maximized && open}
          onToggleMaximized={toggleMaximized}
          onClose={close}
        />
      )}
      {/* The body takes its height in one step, the shell's --daw-dock-h
          (the student's for this tab) less the tab bar, and only its
          content fades in: a height spring re-laid out the timeline above
          it every frame (milestone 2.4's motion rules). */}
      {open ? (
        <div
          key={
            automation
              ? 'automation'
              : master
                ? 'master'
                : `${kind}:${activeTab}`
          }
          // Where Enter on a track row puts focus (the track list's keys).
          data-dock-content
          // The drums' kit and the effect cards (Effects, an audio track's
          // chain, Master) are built on the design system; the other bodies
          // are the legacy components until Stage C.
          data-ds={
            // The automation editor is a legacy component until it's
            // restyled.
            !automation &&
            (master ||
              kind === 'audio' ||
              activeTab === 'fx' ||
              (kind === 'drums' && activeTab === 'controls'))
              ? 'v2'
              : 'legacy'
          }
          tabIndex={-1}
          className={cn(
            'min-h-0 overflow-hidden outline-none duration-daw-fast animate-in fade-in-0 motion-reduce:animate-none',
            !headerless && 'border-t border-daw-hairline',
          )}
          style={{
            // Without the title row the body takes the dock's whole height,
            // less the dock's own top edge.
            height: headerless
              ? `calc(var(--daw-dock-h, ${DOCK_FALLBACK_PX}px) - 1px)`
              : `calc(var(--daw-dock-h, ${DOCK_FALLBACK_PX}px) - ${DOCK_TAB_BAR_PX + 1}px)`,
          }}
        >
          {automation ? (
            <AutomationLaneEditor />
          ) : (
            <DockBody
              track={track}
              kind={kind}
              master={master}
              tab={activeTab}
            />
          )}
        </div>
      ) : null}
    </div>
  );
});

// ── The header ──────────────────────────────────────────────────────────────

interface DockHeaderProps {
  track: Track | undefined;
  kind: DockKind;
  activeTab: ChannelStripTabId | null;
  master: boolean;
  open: boolean;
  maximized: boolean;
  onToggleMaximized(): void;
  onClose(): void;
}

/** The track (or Master) at the left; its controls at the right. */
function DockHeader({
  track,
  kind,
  activeTab,
  master,
  open,
  maximized,
  onToggleMaximized,
  onClose,
}: DockHeaderProps) {
  return (
    <div
      data-testid="dock-header"
      className="flex shrink-0 items-center justify-between gap-2 pl-2"
      style={{ height: DOCK_TAB_BAR_PX, paddingRight: insetRight(8) }}
      // A double-click on the title row opens or shuts the dock (owner,
      // 2026-10-22), as the resizer's does; its buttons keep their own
      // clicks.
      // A double-click selects a word, which lands on the dock's contents
      // once it opens: the second press selects nothing.
      onMouseDown={(e) => {
        if (e.detail > 1) e.preventDefault();
      }}
      onDoubleClick={(e) => {
        if ((e.target as Element).closest('button')) return;
        window.getSelection()?.removeAllRanges();
        toggleDock();
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {master ? (
          <h2 className={cn(TYPE_CLASS.title, 'text-daw-text')}>Master</h2>
        ) : track ? (
          <TrackIdentity track={track} />
        ) : (
          <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
            No track selected
          </span>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1">
        <DockControls
          kind={kind}
          activeTab={activeTab}
          master={master}
          open={open}
          maximized={maximized}
          onToggleMaximized={onToggleMaximized}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

/**
 * Analyze (notes picked in the piano roll), Restore (while maximized) and
 * Close: the header's right end, or the corner of a dock with no title row.
 * Master's dock has no Bypass (owner, 2026-10-22); Mix's Master column
 * keeps its own.
 */
function DockControls({
  kind,
  activeTab,
  master,
  open,
  maximized,
  onToggleMaximized,
  onClose,
}: Omit<DockHeaderProps, 'track'>) {
  const setActiveTab = useStore((s) => s.setChannelStripTab);
  return (
    <>
      {open && !master && kind === 'melodic' && activeTab === 'piano-roll' ? (
        <AnalyzeNotes />
      ) : null}
      {/* No Maximize (owner, 2026-10-22): what needs room has its own
          Expand. Restore shows while something else maximized the dock
          (the effect cards' Show all), as Escape does. */}
      {open && maximized ? (
        <IconButton
          label="Restore the dock"
          icon={<Minimize2 />}
          shortcut={MAX_KEYS.label}
          size="sm"
          tooltipSide="top"
          data-hint={hintText(
            'Restore the dock',
            'Give the timeline its room back',
            MAX_KEYS.label,
          )}
          data-testid="dock-restore"
          onClick={onToggleMaximized}
        />
      ) : null}
      <IconButton
        label={open ? 'Close the dock' : 'Open the dock'}
        icon={open ? <ChevronDown /> : <ChevronUp />}
        size="sm"
        tooltipSide="top"
        data-hint={hintText(
          open ? 'Close the dock' : 'Open the dock',
          open
            ? 'Hide the panel under the timeline'
            : 'Show the selected track’s panel under the timeline',
        )}
        data-testid="dock-toggle"
        onClick={() => (open ? onClose() : setActiveTab(openingTab(kind)))}
      />
    </>
  );
}

function TrackIdentity({ track }: { track: Track }) {
  // Harmony Color: the key centre's colour in its own's place.
  const trackColor = useTrackColor(track.color);
  return (
    <>
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        // The track's colour is meaning: it marks the track on the canvas.
        style={{ backgroundColor: trackColor }}
      />
      <span
        className={cn(
          TYPE_CLASS.body,
          'min-w-0 truncate font-bold text-daw-text',
        )}
        data-testid="dock-track-name"
      >
        {track.name}
      </span>
      <span className={cn(TYPE_CLASS.micro, 'shrink-0 text-daw-text-3')}>
        {INSTRUMENT_LABEL[track.instrument] ?? 'Audio'}
      </span>
    </>
  );
}

/**
 * Notes picked in the piano roll go to Insight: they become the editor's
 * note selection and are analyzed, and Insight comes forward (it was the
 * modal piano roll's button).
 */
function AnalyzeNotes() {
  const count = useStore((s) => s.dockNoteSelection?.noteIndices.length ?? 0);
  if (count === 0) return null;
  const analyze = () => {
    const s = useStore.getState();
    const picked = s.dockNoteSelection;
    if (!picked) return;
    s.setSelectedNotes([picked]);
    s.analyzeNoteSelection([picked]);
    if (!s.libraryOpen || s.inspectorPanel !== 'insight') {
      s.toggleInspectorPanel('insight');
    }
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={analyze}
      data-testid="dock-analyze-notes"
    >
      <Sparkles aria-hidden />
      Analyze {count} note{count === 1 ? '' : 's'}
    </Button>
  );
}

// ── The body ────────────────────────────────────────────────────────────────

function DockBody({
  track,
  kind,
  master,
  tab,
}: {
  track: Track | undefined;
  kind: DockKind;
  master: boolean;
  tab: ChannelStripTabId | null;
}) {
  const { isPremium } = useIsPremium();
  const maximized = useStore((s) => s.dockMaximized);
  // Master's dock is its Effects (the master chain's cards), as a track's
  // FX is; its automation lane is the rail's Automation (owner, 2026-10-22).
  if (master) return <EffectsPanelPart />;
  if (!track) {
    return (
      <Empty>Select a track to see its instrument, notes and effects.</Empty>
    );
  }
  switch (kind) {
    case 'audio':
      return <EffectsPanelPart />;
    case 'audio-in':
      // A plain Audio track: its Tuner, amp and pitch correction, and its
      // effects, in one dock whatever the tab (GuitarBassView).
      return <TrackControlsPanel roomy={maximized} />;
    default:
      break;
  }
  switch (tab) {
    case 'prism':
      return (
        <LockedFeatureOverlay locked={!isPremium}>
          <PrismPanelPart />
        </LockedFeatureOverlay>
      );
    case 'piano-roll':
      return <NotesBody track={track} />;
    case 'fx':
      return <EffectsPanelPart />;
    default:
      return <TrackControlsPanel roomy={maximized} />;
  }
}

/** Notes: the drum grid on drums, else the piano roll on the clip edited. */
function NotesBody({ track }: { track: Track }) {
  // The selected track's clip (editorClip.ts): the selected clip when it is
  // on the track, else the clip under the playhead, or the first one. Only
  // a track with no clips opens a blank roll, at the playhead's bar. A click
  // on a clip selects its track (2.9), so Notes always edits the track the
  // dock shows; it no longer follows a clip selected on another track.
  const rollTrackId = track.id;
  const rollClipId = useStore(
    (s) => resolveEditorClip(s, rollTrackId)?.id ?? null,
  );
  const blankStartTick = useStore((s) =>
    barStartTick(s.position, timeSignatureOf(s)),
  );
  const setNoteSelection = useStore((s) => s.setDockNoteSelection);
  const handleAudition = useCallback(
    (note: number, velocity: number) => {
      auditionNote(rollTrackId, note, velocity);
    },
    [rollTrackId],
  );
  const handleSelection = useCallback(
    (noteIndices: number[]) =>
      setNoteSelection(
        rollClipId && noteIndices.length > 0
          ? { trackId: rollTrackId, clipId: rollClipId, noteIndices }
          : null,
      ),
    [rollTrackId, rollClipId, setNoteSelection],
  );
  // A selection belongs to its clip: another clip starts with none.
  useEffect(() => () => setNoteSelection(null), [rollClipId, setNoteSelection]);

  if (track.instrument === 'drum-machine') {
    return <DrumMachineViewPart trackId={track.id} />;
  }
  if (track.type !== 'midi') {
    return <Empty>This track has no notes: it plays audio.</Empty>;
  }
  return (
    <ClipPianoRollPart
      trackId={rollTrackId}
      clipId={rollClipId}
      blankStartTick={blankStartTick}
      onAuditionNote={handleAudition}
      onSelectionChange={handleSelection}
    />
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="dock-empty"
      className={cn(
        TYPE_CLASS.body,
        'flex h-full items-center justify-center px-4 text-center text-daw-text-3',
      )}
    >
      {children}
    </div>
  );
}
