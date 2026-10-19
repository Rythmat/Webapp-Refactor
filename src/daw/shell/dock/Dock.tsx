import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/components/utilities';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { auditionNote } from '@/daw/audio/auditionNote';
import { DOCK_MAX_SCOPE, DOCK_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { TrackControlsPanel } from '@/daw/components/Controls/TrackControlsPanel';
import { resolveEditorClip } from '@/daw/model/editorClip';
import { useSessionGeneration } from '@/daw/session/useSessionGeneration';
import {
  ClipPianoRollPart,
  DockMasterPart,
  DrumMachineViewPart,
  EffectsPanelPart,
  GroovesBrowserPart,
  PrismPanelPart,
  preloadDockTab,
  preloadInstrumentViews,
} from '@/daw/shell/lazyParts';
import { hintText } from '@/daw/shell/help/hintSource';
import { DOCK_TAB_BAR_PX } from '@/daw/shell/layout/layoutModel';
import { useStore, type Track } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import { barStartTick, timeSignatureOf } from '@/daw/time/timeModel';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { Segmented } from '@/daw/ui/Segmented';
import { Tab, TabList, Tabs } from '@/daw/ui/Tabs';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useIsPremium } from '@/hooks/useIsPremium';
import { MasterBypass } from '@/daw/shell/mix/master/MasterBypass';
import {
  dockTabPurpose,
  dockKindOf,
  isChannelStripTabId,
  tabFor,
  tabsFor,
  type DockKind,
} from './dockTabs';

// ── The editor dock (milestones 2.4, 2.9) ──────────────────────────────────
//
// Between the canvas and the bottom rail, stopping at the Inspector. It
// shows the selected track's editors, with tabs by what the track is
// (dockTabs.ts; decision 16, after Soundtrap's drawer): Instrument ·
// Grooves or Prism · Notes · Effects, and no tab bar for an audio or a
// live-input track, whose body is its chain. Selection drives it: it
// follows the selected track, keeping the tab that applies, and a click on
// a clip opens that clip's editor here (dockSelection.ts). Notes is the one
// note editor: the piano roll, or the drum grid on drums. Maximize grows it
// over the canvas, in place of the old modal piano roll and the pop-out
// windows, and Escape gives the canvas back. The bottom rail's Master
// opens Master in the same slot.
//
// Its height is a share of the body per tab, never a fixed px height
// (shellGeometry: --daw-dock-h); a shut dock is its 32 px tab bar. The
// frame is built on the design system; the tabs' contents are the legacy
// components until Stage C restyles them.

/** The dock's height before the shell has measured itself (220 px, 2.4). */
const DOCK_FALLBACK_PX = 220;

const MAX_KEYS = shortcutKeys('dockMax.restore');

const INSTRUMENT_LABEL: Partial<Record<Track['instrument'], string>> = {
  'oracle-synth': 'Synth',
  'piano-sampler': 'Keys',
  'electric-piano': 'E.Piano',
  'bass-electric': 'E.Bass',
  'guitar-acoustic': 'A.Guitar',
  cello: 'Cello',
  organ: 'Organ',
  'tonewheel-organ': 'Organ',
  soundfont: 'GM',
  'drum-machine': 'Drums',
  sampler: 'Sampler',
  'guitar-fx': 'Guitar',
  'bass-fx': 'Bass',
  'vocal-fx': 'Voice',
};

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
  const open = activeTab !== null || master;

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

  const close = useCallback(() => setActiveTab(null), [setActiveTab]);
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
      data-tab={master ? 'master' : (activeTab ?? undefined)}
      data-maximized={(maximized && open) || undefined}
      className="flex h-full shrink-0 flex-col border-t border-daw-hairline bg-daw-surface-1"
    >
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
      {/* The body takes its height in one step, the shell's --daw-dock-h
          (the student's for this tab) less the tab bar, and only its
          content fades in: a height spring re-laid out the timeline above
          it every frame (milestone 2.4's motion rules). */}
      {open ? (
        <div
          key={master ? 'master' : `${kind}:${activeTab}`}
          // Where Enter on a track row puts focus (the track list's keys).
          data-dock-content
          // The drums' kit is built on the design system; the other bodies
          // are the legacy components until Stage C.
          data-ds={
            !master && kind === 'drums' && activeTab === 'controls'
              ? 'v2'
              : 'legacy'
          }
          tabIndex={-1}
          className="min-h-0 overflow-hidden border-t border-daw-hairline outline-none duration-daw-fast animate-in fade-in-0 motion-reduce:animate-none"
          style={{
            height: `calc(var(--daw-dock-h, ${DOCK_FALLBACK_PX}px) - ${DOCK_TAB_BAR_PX + 1}px)`,
          }}
        >
          <DockBody track={track} kind={kind} master={master} tab={activeTab} />
        </div>
      ) : null}
    </div>
  );
});

// ── The tab bar ─────────────────────────────────────────────────────────────

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
  const setActiveTab = useStore((s) => s.setChannelStripTab);
  return (
    <div
      data-testid="dock-header"
      className="grid shrink-0 items-center gap-2 px-2"
      style={{
        height: DOCK_TAB_BAR_PX,
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5 justify-self-start">
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

      <div className="flex items-center">
        {master ? null : (
          <DockTabs
            track={track}
            kind={kind}
            activeTab={activeTab}
            onPick={(tab) =>
              setActiveTab(tab === activeTab && !master ? null : tab)
            }
          />
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1 justify-self-end">
        {master ? <MasterBypass testId="dock-master-bypass" /> : null}
        {open && !master && kind === 'melodic' && activeTab === 'piano-roll' ? (
          <AnalyzeNotes />
        ) : null}
        {open ? (
          <IconButton
            label={maximized ? 'Restore the dock' : 'Maximize the dock'}
            icon={maximized ? <Minimize2 /> : <Maximize2 />}
            shortcut={maximized ? MAX_KEYS.label : undefined}
            size="sm"
            tooltipSide="top"
            aria-pressed={maximized}
            data-hint={hintText(
              maximized ? 'Restore the dock' : 'Maximize the dock',
              maximized
                ? 'Give the timeline its room back'
                : 'Give the dock the whole editor’s height',
              maximized ? MAX_KEYS.label : undefined,
            )}
            data-testid="dock-maximize"
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
      </div>
    </div>
  );
}

function TrackIdentity({ track }: { track: Track }) {
  return (
    <>
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        // The track's colour is meaning: it marks the track on the canvas.
        style={{ backgroundColor: track.color }}
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
 * The tabs a track of `kind` has; for a live-input track, the two parts of
 * its chain (the pedalboard or voice chain, and the effects after it); for
 * an audio track, none.
 */
function DockTabs({
  track,
  kind,
  activeTab,
  onPick,
}: {
  track: Track | undefined;
  kind: DockKind;
  activeTab: ChannelStripTabId | null;
  onPick(tab: ChannelStripTabId): void;
}) {
  const instrument = track?.instrument;
  // Each tab's content is its own chunk (1.12a): a pointer over or a focus
  // on the tab fetches it, so a click usually finds it there.
  const preload = useCallback(
    (id: ChannelStripTabId) => {
      if (id === 'controls') {
        if (instrument) preloadInstrumentViews([instrument]);
      } else preloadDockTab(id, instrument);
    },
    [instrument],
  );

  if (kind === 'live-input') {
    const chainLabel = instrument === 'vocal-fx' ? 'Voice' : 'Pedals';
    return (
      <Segmented
        label="Chain"
        value={activeTab === 'fx' ? 'fx' : 'controls'}
        onValueChange={(tab) => onPick(tab)}
        options={[
          {
            value: 'controls' as const,
            label: chainLabel,
            anchor: 'chanstrip-tab-controls',
          },
          {
            value: 'fx' as const,
            label: 'Effects',
            anchor: 'chanstrip-tab-fx',
          },
        ]}
      />
    );
  }

  const tabs = tabsFor(kind);
  if (tabs.length === 0) return null;
  return (
    <Tabs
      value={activeTab ?? ''}
      onValueChange={(tab) => onPick(tab as ChannelStripTabId)}
      activationMode="manual"
    >
      <TabList aria-label="Dock" className="gap-0.5">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            data-tutorial-id={`chanstrip-tab-${tab.id}`}
            data-testid={`dock-tab-${tab.id}`}
            data-hint={hintText(tab.label, dockTabPurpose(tab.id, kind))}
            onPointerEnter={() => preload(tab.id)}
            onFocus={() => preload(tab.id)}
            // A press on the open tab shuts the dock, as the old tabs did.
            // Ours runs before Radix's own handler, which preventDefault
            // skips (it would select the tab again).
            onMouseDown={(e) => {
              if (e.button !== 0 || tab.id !== activeTab) return;
              e.preventDefault();
              onPick(tab.id);
            }}
            onKeyDown={(e) => {
              if (tab.id !== activeTab) return;
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              onPick(tab.id);
            }}
            className="px-3"
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
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
  if (master) return <DockMasterPart />;
  if (!track) {
    return (
      <Empty>Select a track to see its instrument, notes and effects.</Empty>
    );
  }
  switch (kind) {
    case 'audio':
      return <EffectsPanelPart />;
    case 'live-input':
      return tab === 'fx' ? (
        <EffectsPanelPart />
      ) : (
        <TrackControlsPanel roomy={maximized} />
      );
    default:
      break;
  }
  switch (tab) {
    case 'grooves':
      return <GroovesBrowserPart trackId={track.id} />;
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
