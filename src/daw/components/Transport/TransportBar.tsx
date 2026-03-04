import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  SkipBack,
  Square,
  Play,
  Pause,
  Circle,
  SkipForward,
  Settings,
  Repeat,
  Library,
  Magnet,
  Palette,
  Lock,
  Unlock,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useStore } from '@/daw/store';
import type { ViewType } from '@/daw/store';
import { seekTo } from '@/daw/hooks/useTransport';
import { NOTES } from '@prism/engine';
import { ALL_GRID_VALUES } from '@/daw/utils/quantize';
import { FileMenu } from './FileMenu';
import { CircleOfFifths } from '../Prism/CircleOfFifths';
import { THEME_ORDER, THEME_LABELS } from '@/daw/constants/themes';

// ── View Switcher ───────────────────────────────────────────────────────

const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'arrange', label: 'Arrange' },
  { id: 'studio', label: 'Studio' },
];

function ViewSwitcher() {
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);

  return (
    <div
      className="flex items-center rounded-md overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-2)' }}
    >
      {VIEWS.map((v) => {
        const active = currentView === v.id;
        return (
          <button
            key={v.id}
            onClick={() => setCurrentView(v.id)}
            className="px-2 h-5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors"
            style={{
              backgroundColor: active ? 'var(--color-surface-3)' : 'transparent',
              color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
              border: 'none',
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────
interface TransportBarProps {
  onInit: () => void;
  isReady: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatPosition(ticks: number): string {
  const TICKS_PER_QUARTER = 480;
  const TICKS_PER_BAR = TICKS_PER_QUARTER * 4;
  const TICKS_PER_SIXTEENTH = 120;

  const bar = Math.floor(ticks / TICKS_PER_BAR) + 1;
  const beat = Math.floor((ticks % TICKS_PER_BAR) / TICKS_PER_QUARTER) + 1;
  const sixteenth = Math.floor((ticks % TICKS_PER_QUARTER) / TICKS_PER_SIXTEENTH) + 1;

  return `${bar}:${beat}:${sixteenth}`;
}

// ── Position Display (isolated 60fps subscriber) ─────────────────────────

function PositionDisplay() {
  const position = useStore((s) => s.position);
  return (
    <div
      className="font-mono text-xs tracking-wider min-w-14 text-center"
      style={{ color: 'var(--color-text)' }}
      title="Bar : Beat : Sixteenth"
    >
      {formatPosition(position)}
    </div>
  );
}

// ── Zoom indicator ───────────────────────────────────────────────────────

function ZoomIndicator() {
  const zoom = useStore((s) => s.timelineZoom);
  return (
    <div
      className="px-1.5 h-5 flex items-center rounded"
      style={{ backgroundColor: 'var(--color-surface-2)' }}
      title={`Timeline Zoom: ${Math.round(zoom * 100)}%  (Cmd+Scroll to zoom)`}
    >
      <span
        className="text-[9px] font-mono font-medium"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

export const TransportBar = React.memo(function TransportBar({ onInit, isReady }: TransportBarProps) {
  const isPlaying = useStore((s) => s.isPlaying);
  const isRecording = useStore((s) => s.isRecording);
  const isCountingIn = useStore((s) => s.isCountingIn);
  const countInBars = useStore((s) => s.countInBars);
  const bpm = useStore((s) => s.bpm);
  const midiStatus = useStore((s) => s.midiStatus);
  const midiInputs = useStore((s) => s.inputs);
  const metronomeEnabled = useStore((s) => s.metronomeEnabled);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const snapEnabled = useStore((s) => s.timelineSnapEnabled);
  const rootNote = useStore((s) => s.rootNote);
  const rootTrackColor = useStore((s) => s.rootTrackColor);
  const rootLocked = useStore((s) => s.rootLocked);
  const toggleRootLock = useStore((s) => s.toggleRootLock);

  const play = useStore((s) => s.play);
  const pause = useStore((s) => s.pause);
  const stop = useStore((s) => s.stop);
  const record = useStore((s) => s.record);
  const setCountInBars = useStore((s) => s.setCountInBars);
  const setBpm = useStore((s) => s.setBpm);
  const toggleMetronome = useStore((s) => s.toggleMetronome);
  const toggleLoop = useStore((s) => s.toggleLoop);
  const toggleSnap = useStore((s) => s.toggleTimelineSnap);
  const libraryOpen = useStore((s) => s.libraryOpen);
  const toggleLibrary = useStore((s) => s.toggleLibrary);
  const _clipColorMode = useStore((s) => s.clipColorMode);
  const _setClipColorMode = useStore((s) => s.setClipColorMode);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  const withInit = useCallback(
    (action: () => void) => {
      if (!isReady) onInit();
      action();
    },
    [isReady, onInit],
  );

  const tracks = useStore((s) => s.tracks);

  const handleStop = useCallback(() => withInit(stop), [withInit, stop]);

  const handleSkipBack = useCallback(
    () => withInit(() => seekTo(0)),
    [withInit],
  );

  const handleSkipForward = useCallback(
    () =>
      withInit(() => {
        // Find the last tick across all MIDI clips
        let lastTick = 0;
        for (const t of tracks) {
          for (const clip of t.midiClips) {
            for (const ev of clip.events) {
              const end = clip.startTick + ev.startTick + ev.durationTicks;
              if (end > lastTick) lastTick = end;
            }
          }
        }
        if (lastTick > 0) seekTo(lastTick);
      }),
    [withInit, tracks],
  );
  const handlePlayPause = useCallback(
    () => withInit(isPlaying ? pause : play),
    [withInit, isPlaying, pause, play],
  );
  const handleRecord = useCallback(() => withInit(record), [withInit, record]);

  // Local state so the user can freely clear / type without the controlled
  // value snapping back on every keystroke.
  const [bpmInput, setBpmInput] = useState(String(bpm));

  // Sync from store when BPM changes externally (e.g. MIDI control)
  useEffect(() => setBpmInput(String(bpm)), [bpm]);

  const commitBpm = useCallback(() => {
    const value = parseInt(bpmInput, 10);
    if (!Number.isNaN(value)) {
      setBpm(value); // store clamps 40-300
    }
    // Reset display to the store value (handles NaN / out-of-range)
    setBpmInput(String(useStore.getState().bpm));
  }, [bpmInput, setBpm]);

  return (
    <div
      className="flex items-center h-12 px-3 shrink-0 border-b select-none relative glass-panel"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* ── Left Half ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
        {/* File menu */}
        <FileMenu />

        {/* View switcher */}
        <ViewSwitcher />

        {/* Root Note selector */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className="flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium transition-colors hover:bg-white/5 cursor-pointer"
              style={{
                backgroundColor: rootNote !== null && rootTrackColor ? rootTrackColor : 'var(--color-surface-2)',
                color: rootNote !== null && rootTrackColor ? '#fff' : 'var(--color-text-dim)',
                border: 'none',
              }}
              title="Root Note"
            >
              {rootNote !== null ? `Root: ${NOTES[rootNote]}` : 'Root'}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="rounded-xl p-4 z-50 shadow-lg"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
              sideOffset={8}
            >
              <CircleOfFifths />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {rootNote !== null && (
          <button
            onClick={toggleRootLock}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-white/5 cursor-pointer"
            style={{
              color: rootLocked ? 'var(--color-accent)' : 'var(--color-text-dim)',
              border: 'none',
              background: 'none',
            }}
            title={rootLocked ? 'Unlock root note' : 'Lock root note'}
          >
            {rootLocked ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        )}

        {/* Musical Controls — centered in remaining space */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {/* Time Signature */}
          <span
            className="text-[10px] font-mono font-medium px-1.5 h-5 flex items-center rounded"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-dim)',
            }}
          >
            4/4
          </span>

          {/* BPM */}
          <div className="flex items-center gap-1">
            <label
              className="text-[10px] font-medium uppercase"
              style={{ color: 'var(--color-text-dim)' }}
              htmlFor="bpm-input"
            >
              BPM
            </label>
            <input
              id="bpm-input"
              type="number"
              min={40}
              max={300}
              value={bpmInput}
              onChange={(e) => setBpmInput(e.target.value)}
              onBlur={commitBpm}
              onKeyDown={(e) => { if (e.key === 'Enter') commitBpm(); }}
              className="w-12 h-5 text-center text-[11px] font-mono rounded border bg-transparent outline-none focus:ring-1"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div
            className="w-px h-4"
            style={{ backgroundColor: 'var(--color-border)' }}
          />

          {/* Metronome */}
          <motion.button
            onClick={toggleMetronome}
            whileTap={{ scale: 0.85 }}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: metronomeEnabled
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
            }}
            title="Metronome"
          >
            <MetronomeIcon active={metronomeEnabled} />
          </motion.button>

          {/* Count-In (click to cycle: Off → 1 Bar → 2 Bars) */}
          <motion.button
            onClick={() => setCountInBars(countInBars >= 2 ? 0 : countInBars + 1)}
            whileTap={{ scale: 0.85 }}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5 cursor-pointer"
            style={{
              color: countInBars > 0 ? 'var(--color-accent)' : 'var(--color-text-dim)',
            }}
            title={`Count In: ${countInBars === 0 ? 'Off' : `${countInBars} Bar${countInBars > 1 ? 's' : ''}`}`}
          >
            <CountInIcon bars={countInBars} />
          </motion.button>

          {/* Loop */}
          <motion.button
            onClick={toggleLoop}
            whileTap={{ scale: 0.85 }}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: loopEnabled
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
            }}
            title="Loop"
          >
            <Repeat size={14} strokeWidth={2} />
          </motion.button>

          {/* Snap to Grid */}
          <motion.button
            onClick={() => {
              toggleSnap();
              // If snap is now being enabled, snap the playhead to the nearest grid line
              const s = useStore.getState();
              if (!s.timelineSnapEnabled) {
                // toggleSnap hasn't applied yet in this tick, so !enabled means it's about to be enabled
                const gridTicks = ALL_GRID_VALUES[s.timelineGridSize];
                const snapped = Math.round(s.position / gridTicks) * gridTicks;
                seekTo(snapped);
              }
            }}
            whileTap={{ scale: 0.85 }}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: snapEnabled
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
            }}
            title="Snap to Grid"
          >
            <Magnet size={14} strokeWidth={2} />
          </motion.button>
        </div>
      </div>

      {/* ── Center: Transport Controls (true center) ──────────── */}
      <div className="shrink-0 flex items-center gap-1">
        {/* Stop */}
        <motion.button
          onClick={handleStop}
          whileTap={{ scale: 0.85 }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-dim)' }}
          title="Stop"
        >
          <Square size={12} fill="currentColor" strokeWidth={0} />
        </motion.button>

        {/* Play / Pause */}
        <motion.button
          onClick={handlePlayPause}
          whileTap={{ scale: 0.85 }}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{
            color: isPlaying ? 'var(--color-play)' : 'var(--color-text)',
            backgroundColor: isPlaying ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={14} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={14} fill="currentColor" strokeWidth={0} />
          )}
        </motion.button>

        {/* Record */}
        <motion.button
          onClick={handleRecord}
          whileTap={{ scale: 0.85 }}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5 ${
            isRecording ? 'animate-pulse' : isCountingIn ? 'animate-pulse' : ''
          }`}
          style={{
            color: isRecording
              ? 'var(--color-record)'
              : isCountingIn
                ? '#f59e0b'
                : 'var(--color-text-dim)',
          }}
          title="Record"
        >
          <Circle size={12} fill="currentColor" strokeWidth={0} />
        </motion.button>

        {/* Separator + Time Display */}
        <div
          className="w-px h-4 mx-1"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        <PositionDisplay />
      </div>

      {/* ── Right Half ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0 overflow-hidden">
        {/* Skip Back */}
        <motion.button
          onClick={handleSkipBack}
          whileTap={{ scale: 0.85 }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-dim)' }}
          title="Skip Back"
        >
          <SkipBack size={12} fill="currentColor" strokeWidth={0} />
        </motion.button>

        {/* Skip Forward */}
        <motion.button
          onClick={handleSkipForward}
          whileTap={{ scale: 0.85 }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-dim)' }}
          title="Skip Forward"
        >
          <SkipForward size={12} fill="currentColor" strokeWidth={0} />
        </motion.button>

        {/* MIDI Status Indicator */}
        <div
          className="flex items-center gap-1 px-1.5 h-5 rounded"
          style={{
            backgroundColor: 'var(--color-surface-2)',
          }}
          title={
            midiStatus === 'ready'
              ? `MIDI: ${midiInputs.length} input(s) — ${midiInputs.map((d) => d.name).join(', ')}`
              : midiStatus === 'unavailable'
                ? 'MIDI: Unavailable — use Chrome/Edge'
                : 'MIDI: Initializing...'
          }
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor:
                midiStatus === 'ready'
                  ? '#22c55e'
                  : midiStatus === 'unavailable'
                    ? '#ef4444'
                    : '#6b7280',
            }}
          />
          <span
            className="text-[9px] font-medium uppercase"
            style={{
              color:
                midiStatus === 'ready'
                  ? '#22c55e'
                  : midiStatus === 'unavailable'
                    ? '#ef4444'
                    : 'var(--color-text-dim)',
            }}
          >
            MIDI
          </span>
        </div>

        {/* Zoom indicator */}
        <ZoomIndicator />

        <div
          className="w-px h-4"
          style={{ backgroundColor: 'var(--color-border)' }}
        />

        {/* Theme cycle */}
        <motion.button
          onClick={() => {
            const idx = THEME_ORDER.indexOf(theme);
            setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
          }}
          whileTap={{ scale: 0.85 }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-accent)' }}
          title={`Theme: ${THEME_LABELS[theme]}`}
        >
          <Palette size={13} strokeWidth={2} />
        </motion.button>

        {/* Library toggle */}
        <motion.button
          onClick={toggleLibrary}
          whileTap={{ scale: 0.85 }}
          className="flex items-center gap-1 h-7 px-1 rounded-md transition-colors hover:bg-white/5"
          style={{
            color: libraryOpen ? 'var(--color-accent)' : 'var(--color-text-dim)',
          }}
          title="Library"
        >
          <Library size={13} strokeWidth={2} />
        </motion.button>

        <div
          className="w-px h-4"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        {/* Settings */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1 h-7 px-1 rounded-md transition-colors hover:bg-white/5"
          style={{ color: settingsOpen ? 'var(--color-accent)' : 'var(--color-text-dim)' }}
          title="Settings"
        >
          <Settings size={13} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
});

// ── Inline SVG Components ────────────────────────────────────────────────

function MetronomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="7" r="2.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="7" r="2.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CountInIcon({ bars }: { bars: number }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Bar 1: 4 ticks */}
      <line x1="1.5" y1="3" x2="1.5" y2="11" strokeWidth={bars >= 1 ? 2 : 1.2} opacity={bars >= 1 ? 1 : 0.3} />
      <line x1="4"   y1="3" x2="4"   y2="11" strokeWidth={bars >= 1 ? 2 : 1.2} opacity={bars >= 1 ? 1 : 0.3} />
      <line x1="6.5" y1="3" x2="6.5" y2="11" strokeWidth={bars >= 1 ? 2 : 1.2} opacity={bars >= 1 ? 1 : 0.3} />
      <line x1="9"   y1="3" x2="9"   y2="11" strokeWidth={bars >= 1 ? 2 : 1.2} opacity={bars >= 1 ? 1 : 0.3} />
      {/* Bar 2: 3 ticks */}
      <line x1="12"   y1="3" x2="12"   y2="11" strokeWidth={bars >= 2 ? 2 : 1.2} opacity={bars >= 2 ? 1 : 0.3} />
      <line x1="14.5" y1="3" x2="14.5" y2="11" strokeWidth={bars >= 2 ? 2 : 1.2} opacity={bars >= 2 ? 1 : 0.3} />
      <line x1="17"   y1="3" x2="17"   y2="11" strokeWidth={bars >= 2 ? 2 : 1.2} opacity={bars >= 2 ? 1 : 0.3} />
    </svg>
  );
}
