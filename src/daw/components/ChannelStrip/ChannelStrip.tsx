/* eslint-disable tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { useCallback, useEffect, useRef } from 'react';
import {
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Piano,
  Disc3,
  Library,
} from 'lucide-react';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import { useSessionGeneration } from '@/daw/session/useSessionGeneration';
import { useIsPremium } from '@/hooks/useIsPremium';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { TrackControlsPanel } from '@/daw/components/Controls/TrackControlsPanel';
import { auditionNote } from '@/daw/audio/auditionNote';
import { editorTrackId, resolveEditorClip } from '@/daw/model/editorClip';
import { barStartTick, timeSignatureOf } from '@/daw/time/timeModel';
import {
  ClipPianoRollPart,
  EffectsPanelPart,
  GroovesBrowserPart,
  PartsBrowserPart,
  PrismPanelPart,
  preloadDockTab,
  preloadInstrumentViews,
} from '@/daw/shell/lazyParts';
import { DOCK_TAB_BAR_PX } from '@/daw/shell/layout/layoutModel';
import { isChannelStripTabId } from './channelStripTabs';

/** The dock's height before the shell has measured itself (220 px, 2.4). */
const DOCK_FALLBACK_PX = 220;

// ── PrismLogo ────────────────────────────────────────────────────────────

function PrismLogo({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M12 4L5 18h14L12 4z" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────

type TabId = ChannelStripTabId;

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  {
    id: 'controls',
    label: 'Controls',
    icon: <Zap size={14} strokeWidth={1.5} />,
  },
  { id: 'fx', label: 'FX', icon: <Sparkles size={14} strokeWidth={1.5} /> },
  {
    id: 'grooves',
    label: 'Grooves',
    icon: <Disc3 size={14} strokeWidth={1.5} />,
  },
  {
    id: 'parts',
    label: 'Parts',
    icon: <Library size={14} strokeWidth={1.5} />,
  },
  { id: 'prism', label: 'Prism', icon: <PrismLogo size={14} /> },
  {
    id: 'piano-roll',
    label: 'Piano Roll',
    icon: <Piano size={14} strokeWidth={1.5} />,
  },
];

function instrumentLabel(instrument: string): string {
  switch (instrument) {
    case 'oracle-synth':
      return 'Synth';
    case 'piano-sampler':
      return 'Keys';
    case 'electric-piano':
      return 'E.Piano';
    case 'bass-electric':
      return 'E.Bass';
    case 'cello':
      return 'Cello';
    case 'organ':
      return 'Organ';
    case 'soundfont':
      return 'SF';
    case 'drum-machine':
      return 'Drums';
    case 'sampler':
      return 'Sampler';
    case 'guitar-fx':
      return 'Guitar';
    case 'bass-fx':
      return 'Bass';
    case 'vocal-fx':
      return 'Vocal';
    default:
      return 'Audio';
  }
}

// ── ChannelStrip ─────────────────────────────────────────────────────────

export function ChannelStrip() {
  // Active tab lives in the store (uiSlice) so tutorials can open it.
  const activeTab = useStore((s) => s.channelStripTab);
  const setActiveTab = useStore((s) => s.setChannelStripTab);
  const prevTrackCount = useRef(0);
  const { isPremium } = useIsPremium();

  // The selected track and the selected clip's track only, not the whole
  // tracks array: an edit to another track re-renders nothing here.
  const track = useStore((s) =>
    s.tracks.find((t) => t.id === s.selectedTrackId),
  );
  const trackCount = useStore((s) => s.tracks.length);

  // The session generation moves on with every load and reset of the
  // project (sessionGeneration.ts). A project opened in place of another goes
  // from some tracks straight to others, and only the generation tells that
  // apart from an edit.
  const generation = useSessionGeneration();
  // The generation of the last project the strip saw.
  const seenGeneration = useRef(generation);

  // Open on Controls when a project's tracks arrive with the strip closed:
  // the student added the first track, a project opened in place of another,
  // or the strip mounted over one (it mounts empty before the boot restores
  // the draft, and again on every return to Create). A load resets the tab
  // (initialProjectState), so a new project opens on Controls. The tab a
  // restored draft was left on stays, and so does an open tab when the strip
  // mounts again over the same project.
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

  // Piano roll: the clip the dock edits (editorClip.ts). The selected
  // clip's track when a MIDI clip is selected, else the selected track; on
  // it, the selected clip, the clip under the playhead, or the first one.
  // Only a track with no clips opens a blank roll, at the playhead's bar.
  const rollTrackId = useStore(editorTrackId);
  const rollClipId = useStore(
    (s) => resolveEditorClip(s, rollTrackId)?.id ?? null,
  );
  const blankStartTick = useStore((s) =>
    barStartTick(s.position, timeSignatureOf(s)),
  );

  const isGuitarBass =
    track?.instrument === 'guitar-fx' || track?.instrument === 'bass-fx';
  const isVocal = track?.instrument === 'vocal-fx';
  const isAudioInput = isGuitarBass || isVocal;
  const isDrumMachine = track?.instrument === 'drum-machine';
  const isMidiInstrument =
    !!track && !isAudioInput && track.instrument !== 'none';

  // Piano roll notes audition on the track being edited.
  const auditionTrackId = rollTrackId;
  const handleAuditionNote = useCallback(
    (note: number, velocity: number) => {
      if (auditionTrackId) auditionNote(auditionTrackId, note, velocity);
    },
    [auditionTrackId],
  );

  const handleTabClick = useCallback(
    (id: TabId) => {
      setActiveTab(activeTab === id ? null : id);
    },
    [activeTab, setActiveTab],
  );

  // Each tab's content is its own chunk (1.12a): a pointer over or a focus
  // on the tab fetches it, so a click usually finds it there.
  const instrument = track?.instrument;
  const preloadTab = useCallback(
    (id: TabId) => {
      if (id === 'controls') {
        if (instrument) preloadInstrumentViews([instrument]);
      } else preloadDockTab(id);
    },
    [instrument],
  );

  // Grooves is a drum machine's tab, Parts and the piano roll a melodic
  // instrument's, and Prism neither a drum machine's nor a live input's.
  const tabApplies = (id: TabId) =>
    !(
      (id === 'grooves' && !isDrumMachine) ||
      (id === 'parts' && (!isMidiInstrument || isDrumMachine)) ||
      (id === 'prism' && (isAudioInput || isDrumMachine)) ||
      (id === 'piano-roll' && (!isMidiInstrument || isDrumMachine))
    );
  const visibleTabs = TABS.filter((tab) => tabApplies(tab.id));

  // Fall back to Controls when the open tab is hidden for this track, or
  // isn't one of the strip's tabs at all.
  const openTabMisfits =
    activeTab !== null &&
    !(isChannelStripTabId(activeTab) && tabApplies(activeTab));
  useEffect(() => {
    if (openTabMisfits) setActiveTab('controls');
  }, [openTabMisfits, setActiveTab]);

  const isOpen = activeTab !== null;

  return (
    <div
      className="shrink-0 flex flex-col border-t"
      style={{
        backgroundColor: 'var(--daw-surface-1)',
        borderColor: 'var(--daw-hairline)',
      }}
    >
      {/* Tab bar (always visible) */}
      <div
        className="flex items-center px-3 shrink-0"
        style={{ height: DOCK_TAB_BAR_PX }}
      >
        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {visibleTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tutorial-id={`chanstrip-tab-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                onPointerEnter={() => preloadTab(tab.id)}
                onFocus={() => preloadTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--daw-hover)' : 'transparent',
                  color: active ? 'var(--daw-text)' : 'var(--daw-text-3)',
                  border: 'none',
                }}
              >
                <span
                  style={{
                    color: active ? 'var(--daw-accent)' : 'var(--daw-text-3)',
                  }}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Track info */}
        {track && (
          <div className="flex items-center gap-1.5 ml-3">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: track.color }}
            />
            <span
              className="text-[10px]"
              style={{ color: 'var(--daw-text-3)' }}
            >
              {track.name}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--daw-surface-2)',
                color: 'var(--daw-text-3)',
              }}
            >
              {instrumentLabel(track.instrument)}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse toggle */}
        <button
          onClick={() => setActiveTab(activeTab === null ? 'controls' : null)}
          className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
          style={{
            color: 'var(--daw-text-3)',
            backgroundColor: 'transparent',
            border: 'none',
          }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Content area. It takes its height in one step, the shell's
          --daw-dock-h (the student's for this tab) less the tab bar, and
          only its content fades in: a height spring re-laid out the
          timeline above it every frame (milestone 2.4's motion rules). */}
      {isOpen && (
        <div
          key={activeTab}
          // Where Enter on a track row puts focus (the track list's keys).
          data-dock-content
          tabIndex={-1}
          className="overflow-hidden outline-none animate-in fade-in-0 duration-daw-fast motion-reduce:animate-none"
          style={{ borderTop: '1px solid var(--daw-hairline)' }}
        >
          <div
            className={
              activeTab === 'piano-roll' ? 'overflow-hidden' : 'overflow-y-auto'
            }
            style={{
              height: `calc(var(--daw-dock-h, ${DOCK_FALLBACK_PX}px) - ${DOCK_TAB_BAR_PX + 1}px)`,
            }}
          >
            {activeTab === 'controls' && <TrackControlsPanel />}
            {activeTab === 'fx' && <EffectsPanelPart />}
            {activeTab === 'grooves' && track && (
              <GroovesBrowserPart trackId={track.id} />
            )}
            {activeTab === 'parts' && track && (
              <PartsBrowserPart trackId={track.id} />
            )}
            {activeTab === 'prism' && (
              <LockedFeatureOverlay locked={!isPremium}>
                <PrismPanelPart />
              </LockedFeatureOverlay>
            )}
            {activeTab === 'piano-roll' &&
              (rollTrackId && (rollClipId || isMidiInstrument) ? (
                <ClipPianoRollPart
                  trackId={rollTrackId}
                  clipId={rollClipId}
                  blankStartTick={blankStartTick}
                  onAuditionNote={handleAuditionNote}
                />
              ) : (
                <div
                  className="flex items-center justify-center h-full text-xs"
                  style={{ color: 'var(--daw-text-3)' }}
                >
                  Select a clip on the timeline to edit
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
