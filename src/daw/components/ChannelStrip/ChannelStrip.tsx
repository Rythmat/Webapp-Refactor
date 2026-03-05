/* eslint-disable tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Piano,
  Disc3,
} from 'lucide-react';
import { useStore } from '@/daw/store';
import { TrackControlsPanel } from '@/daw/components/Controls/TrackControlsPanel';
import { EffectsPanel } from '@/daw/components/Effects/EffectsPanel';
import { PrismPanel } from '@/daw/components/Prism/PrismPanel';
import { PianoRoll } from '@/daw/components/PianoRoll/PianoRoll';
import { GroovesBrowser } from '@/daw/components/Controls/GroovesBrowser';
import type { MidiNoteEvent } from '@prism/engine';

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

type TabId = 'controls' | 'fx' | 'prism' | 'piano-roll' | 'grooves';

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
  { id: 'prism', label: 'Prism', icon: <PrismLogo size={14} /> },
  {
    id: 'piano-roll',
    label: 'Piano Roll',
    icon: <Piano size={14} strokeWidth={1.5} />,
  },
];

const SPRING = { type: 'spring' as const, stiffness: 350, damping: 30 };

function instrumentLabel(instrument: string): string {
  switch (instrument) {
    case 'oracle-synth':
      return 'Synth';
    case 'piano-sampler':
      return 'Keys';
    case 'electric-piano':
      return 'E.Piano';
    case 'cello':
      return 'Cello';
    case 'organ':
      return 'Organ';
    case 'soundfont':
      return 'SF';
    case 'drum-machine':
      return 'Drums';
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
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const prevTrackCount = useRef(0);

  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const tracks = useStore((s) => s.tracks);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const selectedClipTrackId = useStore((s) => s.selectedClipTrackId);
  const updateMidiClipEvents = useStore((s) => s.updateMidiClipEvents);
  const addMidiClip = useStore((s) => s.addMidiClip);
  const setSelectedClip = useStore((s) => s.setSelectedClip);

  // Auto-open when a track is added
  useEffect(() => {
    if (
      tracks.length > prevTrackCount.current &&
      prevTrackCount.current === 0
    ) {
      setActiveTab('controls');
    }
    prevTrackCount.current = tracks.length;
  }, [tracks.length]);
  const track = tracks.find((t) => t.id === selectedTrackId);

  // Piano roll: find selected clip
  const selectedClipTrack = tracks.find((t) => t.id === selectedClipTrackId);
  const selectedClip = selectedClipTrack?.midiClips.find(
    (c) => c.id === selectedClipId,
  );

  const isGuitarBass =
    track?.instrument === 'guitar-fx' || track?.instrument === 'bass-fx';
  const isVocal = track?.instrument === 'vocal-fx';
  const isAudioInput = isGuitarBass || isVocal;
  const isDrumMachine = track?.instrument === 'drum-machine';
  const isMidiInstrument =
    !!track && !isAudioInput && track.instrument !== 'none';

  const handlePianoRollChange = useCallback(
    (newEvents: MidiNoteEvent[]) => {
      if (selectedClipTrackId && selectedClipId) {
        updateMidiClipEvents(selectedClipTrackId, selectedClipId, newEvents);
      } else if (track && isMidiInstrument && newEvents.length > 0) {
        // Blank mode: create a new clip on the first note draw
        const clipId = `clip-${crypto.randomUUID().slice(0, 8)}`;
        addMidiClip(track.id, {
          id: clipId,
          name: 'Untitled',
          startTick: 0,
          events: newEvents,
        });
        setSelectedClip(clipId, track.id);
      }
    },
    [
      selectedClipTrackId,
      selectedClipId,
      track,
      isMidiInstrument,
      updateMidiClipEvents,
      addMidiClip,
      setSelectedClip,
    ],
  );

  const handleTabClick = useCallback((id: TabId) => {
    setActiveTab((prev) => (prev === id ? null : id));
  }, []);

  const visibleTabs = TABS.filter((tab) => {
    return !(
      (tab.id === 'grooves' && !isDrumMachine) ||
      (tab.id === 'prism' && (isAudioInput || isDrumMachine)) ||
      (tab.id === 'piano-roll' && (!isMidiInstrument || isDrumMachine))
    );
  });

  // Reset to controls if active tab is hidden for this track type
  if (!isDrumMachine && activeTab === 'grooves') {
    setActiveTab('controls');
  }
  if ((isAudioInput || isDrumMachine) && activeTab === 'prism') {
    setActiveTab('controls');
  }
  if ((!isMidiInstrument || isDrumMachine) && activeTab === 'piano-roll') {
    setActiveTab('controls');
  }

  const isOpen = activeTab !== null;

  return (
    <div
      className="shrink-0 flex flex-col border-t"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Tab bar (always visible) */}
      <div className="flex items-center px-3 shrink-0" style={{ height: 32 }}>
        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {visibleTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                style={{
                  backgroundColor: active
                    ? 'var(--color-surface-3)'
                    : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
                  border: 'none',
                }}
              >
                <span
                  style={{
                    color: active
                      ? 'var(--color-accent)'
                      : 'var(--color-text-dim)',
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
              style={{ color: 'var(--color-text-dim)' }}
            >
              {track.name}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text-dim)',
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
          onClick={() =>
            setActiveTab((prev) => (prev === null ? 'controls' : null))
          }
          className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
          style={{
            color: 'var(--color-text-dim)',
            backgroundColor: 'transparent',
            border: 'none',
          }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Content area (animated) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="channel-strip-content"
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div
              className={
                activeTab === 'piano-roll'
                  ? 'overflow-hidden'
                  : 'overflow-y-auto'
              }
              style={{ height: '33vh' }}
            >
              {activeTab === 'controls' && <TrackControlsPanel />}
              {activeTab === 'fx' && <EffectsPanel />}
              {activeTab === 'grooves' && track && (
                <GroovesBrowser trackId={track.id} />
              )}
              {activeTab === 'prism' && <PrismPanel />}
              {activeTab === 'piano-roll' &&
                ((selectedClip && selectedClipTrack) || isMidiInstrument ? (
                  <PianoRoll
                    events={selectedClip?.events ?? []}
                    clipStartTick={selectedClip?.startTick ?? 0}
                    clipColor={
                      selectedClipTrack?.color ?? track?.color ?? '#888'
                    }
                    onChange={handlePianoRollChange}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center h-full text-xs"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    Select a clip on the timeline to edit
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
