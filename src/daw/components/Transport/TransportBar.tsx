import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Hash,
} from 'lucide-react';

import { useStore, type ViewType } from '@/daw/store';
import { seekTo } from '@/daw/hooks/useTransport';
import { NOTES } from '@prism/engine';
import { ALL_GRID_VALUES } from '@/daw/utils/quantize';
import { FileMenu } from './FileMenu';
import { CircleOfFifths } from '../Prism/CircleOfFifths';
import { RainbowBorderButton } from '@/components/ui/rainbow-borders-button';
import { THEME_ORDER, THEME_LABELS } from '@/daw/constants/themes';
import { CollabToolbar } from '@/daw/collab/ui/CollabToolbar';
import { InviteNotificationBell } from '@/daw/collab/ui/InviteNotificationBell';
import { TransportLinkToggle } from '@/daw/collab/ui/TransportLinkToggle';

// ── View Switcher ───────────────────────────────────────────────────────

const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'arrange', label: 'Create' },
  { id: 'studio', label: 'Master' },
  { id: 'leadsheet', label: 'Score' },
];

function ViewSwitcher() {
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);

  return (
    <div
      className="flex items-center overflow-hidden rounded-md"
      style={{ backgroundColor: 'var(--color-surface-2)' }}
    >
      {VIEWS.map((v) => {
        const active = currentView === v.id;
        return (
          <button
            key={v.id}
            onClick={() => setCurrentView(v.id)}
            className="h-5 cursor-pointer px-2 text-[10px] font-semibold uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: active
                ? 'var(--color-surface-3)'
                : 'transparent',
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

function formatPosition(ticks: number, numerator = 4, denominator = 4): string {
  const beatTicks = (480 * 4) / denominator;
  const barTicks = numerator * beatTicks;
  const sixteenthTicks = 120;

  const bar = Math.floor(ticks / barTicks) + 1;
  const beat = (Math.floor((ticks % barTicks) / beatTicks) % numerator) + 1;
  const sixteenth = Math.floor((ticks % beatTicks) / sixteenthTicks) + 1;

  return `${bar}:${beat}:${sixteenth}`;
}

// ── Position Display (isolated 60fps subscriber) ─────────────────────────

function PositionDisplay() {
  const position = useStore((s) => s.position);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  return (
    <div
      className="min-w-14 text-center font-mono text-xs tracking-wider"
      style={{ color: 'var(--color-text)' }}
      title="Bar : Beat : Sixteenth"
    >
      {formatPosition(position, tsNum, tsDen)}
    </div>
  );
}

// ── Zoom indicator ───────────────────────────────────────────────────────

function ZoomIndicator() {
  const zoom = useStore((s) => s.timelineZoom);
  return (
    <div
      className="flex h-5 items-center rounded px-1.5"
      style={{ backgroundColor: 'var(--color-surface-2)' }}
      title={`Timeline Zoom: ${Math.round(zoom * 100)}%  (Cmd+Scroll to zoom)`}
    >
      <span
        className="font-mono text-[9px] font-medium"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

export const TransportBar = memo(function TransportBar({
  onInit,
  isReady,
}: TransportBarProps) {
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
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const setTimeSignature = useStore((s) => s.setTimeSignature);

  const play = useStore((s) => s.play);
  const pause = useStore((s) => s.pause);
  const stop = useStore((s) => s.stop);
  const record = useStore((s) => s.record);
  const setCountInBars = useStore((s) => s.setCountInBars);
  const setBpm = useStore((s) => s.setBpm);
  const toggleMetronome = useStore((s) => s.toggleMetronome);
  const toggleLoop = useStore((s) => s.toggleLoop);
  const toggleSnap = useStore((s) => s.toggleTimelineSnap);
  const chordRulerShowNotes = useStore((s) => s.chordRulerShowNotes);
  const toggleChordRulerLabels = useStore((s) => s.toggleChordRulerLabels);
  const libraryOpen = useStore((s) => s.libraryOpen);
  const toggleLibrary = useStore((s) => s.toggleLibrary);
  const userListOpen = useStore((s) => s.userListOpen);
  const toggleUserList = useStore((s) => s.toggleUserList);
  const chatPanelOpen = useStore((s) => s.chatPanelOpen);
  const toggleChatPanel = useStore((s) => s.toggleChatPanel);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);

  const withInit = useCallback(
    (action: () => void) => {
      if (!isReady) onInit();
      action();
    },
    [isReady, onInit],
  );

  const tracks = useStore((s) => s.tracks);

  const handleStop = useCallback(() => withInit(stop), [withInit, stop]);
  const handleStopToZero = useCallback(
    () =>
      withInit(() => {
        stop();
        seekTo(0);
      }),
    [withInit, stop],
  );

  const handleSkipBack = useCallback(
    () =>
      withInit(() => {
        const pos = useStore.getState().position;
        const sorted = [...useStore.getState().markers].sort(
          (a, b) => a.tick - b.tick,
        );
        // Find the last marker strictly before current position
        let target: number | null = null;
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (sorted[i].tick < pos) {
            target = sorted[i].tick;
            break;
          }
        }
        seekTo(target ?? 0);
      }),
    [withInit],
  );

  const handleSkipForward = useCallback(
    () =>
      withInit(() => {
        const pos = useStore.getState().position;
        const sorted = [...useStore.getState().markers].sort(
          (a, b) => a.tick - b.tick,
        );
        // Find the first marker strictly after current position
        for (const m of sorted) {
          if (m.tick > pos) {
            seekTo(m.tick);
            return;
          }
        }
        // Fallback: seek to end of content
        let lastTick = 0;
        for (const t of tracks) {
          for (const clip of t.midiClips) {
            for (const ev of clip.events) {
              const end = clip.startTick + ev.startTick + ev.durationTicks;
              if (end > lastTick) lastTick = end;
            }
          }
        }
        if (lastTick > pos) seekTo(lastTick);
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
  const [projectNameInput, setProjectNameInput] = useState(projectName);
  useEffect(() => setProjectNameInput(projectName), [projectName]);
  const commitProjectName = useCallback(() => {
    const trimmed = projectNameInput.trim();
    if (trimmed) {
      setProjectName(trimmed);
    }
    setProjectNameInput(useStore.getState().projectName);
  }, [projectNameInput, setProjectName]);
  const [keyOpen, setKeyOpen] = useState(false);
  const keyPopoverRef = useRef<HTMLDivElement>(null);
  const [tsOpen, setTsOpen] = useState(false);
  const tsButtonRef = useRef<HTMLButtonElement>(null);
  const tsPopoverRef = useRef<HTMLDivElement>(null);
  const [customNum, setCustomNum] = useState('');
  const [customDen, setCustomDen] = useState('4');
  const keyButtonRef = useRef<HTMLDivElement>(null);

  // Close Key popover on outside click
  useEffect(() => {
    if (!keyOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        keyPopoverRef.current?.contains(target) ||
        keyButtonRef.current?.contains(target)
      )
        return;
      setKeyOpen(false);
      // Auto-lock root note when dismissing the popover
      const {
        rootNote: rn,
        rootLocked: rl,
        toggleRootLock: trl,
      } = useStore.getState();
      if (rn !== null && !rl) {
        trl();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [keyOpen]);

  // Close time signature popover on outside click
  useEffect(() => {
    if (!tsOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        tsPopoverRef.current?.contains(target) ||
        tsButtonRef.current?.contains(target)
      )
        return;
      setTsOpen(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [tsOpen]);

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
      className="glass-panel relative flex h-12 shrink-0 select-none items-center border-b px-3"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* ── Left Half ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {/* File menu */}
        <FileMenu />

        {/* Project name */}
        <input
          type="text"
          value={projectNameInput}
          onChange={(e) => setProjectNameInput(e.target.value)}
          onBlur={commitProjectName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitProjectName();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-5 max-w-[140px] rounded border border-transparent bg-transparent px-1.5 text-[11px] font-medium outline-none transition-colors hover:border-white/10 focus:border-white/20 focus:ring-1"
          style={{ color: 'var(--color-text)' }}
          title="Project name (click to edit)"
        />

        {/* Root Note selector */}
        <RainbowBorderButton
          ref={keyButtonRef}
          active={rootNote === null}
          onClick={() => {
            if (!keyOpen) {
              // Opening: unlock so user can freely change keys
              const s = useStore.getState();
              if (s.rootLocked) s.toggleRootLock();
            } else {
              // Closing via button: auto-lock
              const s = useStore.getState();
              if (s.rootNote !== null && !s.rootLocked) s.toggleRootLock();
            }
            setKeyOpen((v) => !v);
          }}
          className="flex h-5 items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor:
              rootNote !== null && rootTrackColor
                ? rootTrackColor
                : 'var(--color-surface-2)',
            color: '#fff',
          }}
          title="Key"
        >
          {rootNote !== null ? `Key: ${NOTES[rootNote]}` : 'Key'}
        </RainbowBorderButton>
        {keyOpen &&
          createPortal(
            <div
              ref={keyPopoverRef}
              className="fixed z-50 rounded-xl p-4 shadow-lg"
              style={{
                top:
                  (keyButtonRef.current?.getBoundingClientRect().bottom ?? 0) +
                  8,
                left: keyButtonRef.current?.getBoundingClientRect().left ?? 0,
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              <CircleOfFifths />
            </div>,
            document.body,
          )}
        {rootNote !== null && (
          <button
            onClick={toggleRootLock}
            className="flex size-5 cursor-pointer items-center justify-center rounded transition-colors hover:bg-white/5"
            style={{
              color: rootLocked
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
              border: 'none',
              background: 'none',
            }}
            title={rootLocked ? 'Unlock root note' : 'Lock root note'}
          >
            {rootLocked ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        )}

        {/* Musical Controls — centered in remaining space */}
        <div className="flex flex-1 items-center justify-center gap-2">
          {/* Time Signature */}
          <div className="relative">
            <button
              ref={tsButtonRef}
              onClick={() => setTsOpen((v) => !v)}
              className="flex h-5 cursor-pointer items-center rounded px-1.5 font-mono text-[10px] font-medium transition-colors hover:bg-white/5"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text-dim)',
                border: 'none',
              }}
              title="Time Signature"
            >
              {tsNum}/{tsDen}
            </button>
            {tsOpen &&
              createPortal(
                <div
                  ref={tsPopoverRef}
                  className="fixed z-50 rounded-lg p-2 shadow-lg"
                  style={{
                    top:
                      (tsButtonRef.current?.getBoundingClientRect().bottom ??
                        0) + 6,
                    left:
                      tsButtonRef.current?.getBoundingClientRect().left ?? 0,
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                  }}
                >
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        [2, 4],
                        [3, 4],
                        [4, 4],
                        [5, 4],
                        [6, 4],
                        [7, 4],
                        [3, 8],
                        [5, 8],
                        [6, 8],
                        [7, 8],
                        [9, 8],
                        [12, 8],
                      ] as [number, number][]
                    ).map(([n, d]) => {
                      const isActive = n === tsNum && d === tsDen;
                      return (
                        <button
                          key={`${n}/${d}`}
                          onClick={() => {
                            setTimeSignature(n, d);
                            setTsOpen(false);
                          }}
                          className="flex h-6 w-10 cursor-pointer items-center justify-center rounded font-mono text-[10px] font-medium transition-colors hover:bg-white/10"
                          style={{
                            backgroundColor: isActive
                              ? 'var(--color-accent)'
                              : 'transparent',
                            color: isActive ? '#000' : 'var(--color-text)',
                            border: 'none',
                          }}
                        >
                          {n}/{d}
                        </button>
                      );
                    })}
                  </div>
                  {/* Custom time signature input */}
                  <div
                    className="mt-1.5 flex items-center gap-1 border-t pt-1.5"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                  >
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={customNum}
                      onChange={(e) => setCustomNum(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const n = parseInt(customNum, 10);
                          const d = parseInt(customDen, 10);
                          if (n > 0) {
                            setTimeSignature(n, d);
                            setTsOpen(false);
                          }
                        }
                      }}
                      placeholder={String(tsNum)}
                      className="h-5 w-8 rounded border bg-transparent text-center font-mono text-[10px] outline-none focus:ring-1"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      /
                    </span>
                    <select
                      value={customDen}
                      onChange={(e) => setCustomDen(e.target.value)}
                      className="h-5 cursor-pointer rounded border bg-transparent font-mono text-[10px] outline-none focus:ring-1"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    >
                      <option value="2">2</option>
                      <option value="4">4</option>
                      <option value="8">8</option>
                      <option value="16">16</option>
                    </select>
                    <button
                      onClick={() => {
                        const n = parseInt(customNum, 10);
                        const d = parseInt(customDen, 10);
                        if (n > 0) {
                          setTimeSignature(n, d);
                          setTsOpen(false);
                        }
                      }}
                      className="ml-auto flex h-5 cursor-pointer items-center rounded px-1.5 text-[9px] font-medium uppercase transition-colors hover:bg-white/10"
                      style={{
                        backgroundColor: 'var(--color-accent)',
                        color: '#000',
                        border: 'none',
                      }}
                    >
                      Set
                    </button>
                  </div>
                </div>,
                document.body,
              )}
          </div>

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
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitBpm();
              }}
              className="h-5 w-12 rounded border bg-transparent text-center font-mono text-[11px] outline-none focus:ring-1"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div
            className="h-4 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />

          {/* Metronome */}
          <motion.button
            onClick={toggleMetronome}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
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
            onClick={() =>
              setCountInBars(countInBars >= 2 ? 0 : countInBars + 1)
            }
            whileTap={{ scale: 0.85 }}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color:
                countInBars > 0
                  ? 'var(--color-accent)'
                  : 'var(--color-text-dim)',
            }}
            title={`Count In: ${countInBars === 0 ? 'Off' : `${countInBars} Bar${countInBars > 1 ? 's' : ''}`}`}
          >
            <CountInIcon bars={countInBars} />
          </motion.button>

          {/* Loop */}
          <motion.button
            onClick={toggleLoop}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
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
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: snapEnabled
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
            }}
            title="Snap to Grid"
          >
            <Magnet size={14} strokeWidth={2} />
          </motion.button>

          {/* Chord Ruler: Numbers ↔ Notes */}
          <motion.button
            onClick={toggleChordRulerLabels}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: chordRulerShowNotes
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
            }}
            title={
              chordRulerShowNotes
                ? 'Chord Ruler: Degree Numbers'
                : 'Chord Ruler: Note Names'
            }
          >
            <Hash size={14} strokeWidth={2} />
          </motion.button>
        </div>
      </div>

      {/* ── Center: Transport Controls (true center) ──────────── */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Stop */}
        <motion.button
          onClick={handleStop}
          onDoubleClick={handleStopToZero}
          whileTap={{ scale: 0.85 }}
          className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-dim)' }}
          title="Stop (double-click for start)"
        >
          <Square size={12} fill="currentColor" strokeWidth={0} />
        </motion.button>

        {/* Play / Pause */}
        <motion.button
          onClick={handlePlayPause}
          whileTap={{ scale: 0.85 }}
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{
            color: isPlaying ? 'var(--color-play)' : 'var(--color-text)',
            backgroundColor: isPlaying
              ? 'rgba(34, 197, 94, 0.1)'
              : 'transparent',
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
          className={`flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5 ${
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
          className="mx-1 h-4 w-px"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        <PositionDisplay />
      </div>

      {/* ── Right Half ────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {/* ViewSwitcher — its own div, centered between center and right controls */}
        <div className="flex flex-1 items-center justify-center">
          <ViewSwitcher />
        </div>

        {/* Right controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Skip Back */}
          <motion.button
            onClick={handleSkipBack}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{ color: 'var(--color-text-dim)' }}
            title="Skip Back"
          >
            <SkipBack size={12} fill="currentColor" strokeWidth={0} />
          </motion.button>

          {/* Skip Forward */}
          <motion.button
            onClick={handleSkipForward}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{ color: 'var(--color-text-dim)' }}
            title="Skip Forward"
          >
            <SkipForward size={12} fill="currentColor" strokeWidth={0} />
          </motion.button>

          {/* MIDI Status Indicator */}
          <div
            className="flex h-5 items-center gap-1 rounded px-1.5"
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
              className="size-1.5 rounded-full"
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
            className="h-4 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />

          {/* Theme cycle */}
          <motion.button
            onClick={() => {
              const idx = THEME_ORDER.indexOf(theme);
              setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
            }}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{ color: 'var(--color-accent)' }}
            title={`Theme: ${THEME_LABELS[theme]}`}
          >
            <Palette size={13} strokeWidth={2} />
          </motion.button>

          {/* Collab invite notifications */}
          <InviteNotificationBell />

          {/* Transport link (collab only) */}
          <TransportLinkToggle />

          {/* Collaboration */}
          <CollabToolbar
            onToggleUserList={toggleUserList}
            userListOpen={userListOpen}
            onToggleChatPanel={toggleChatPanel}
            chatPanelOpen={chatPanelOpen}
          />

          {/* Library toggle */}
          <motion.button
            onClick={toggleLibrary}
            whileTap={{ scale: 0.85 }}
            className="flex h-7 items-center gap-1 rounded-md px-1 transition-colors hover:bg-white/5"
            style={{
              color: libraryOpen
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
            }}
            title="Library"
          >
            <Library size={13} strokeWidth={2} />
          </motion.button>

          <div
            className="h-4 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          {/* Settings */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setSettingsOpen(true)}
            className="flex h-7 items-center gap-1 rounded-md px-1 transition-colors hover:bg-white/5"
            style={{
              color: settingsOpen
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
            }}
            title="Settings"
          >
            <Settings size={13} strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </div>
  );
});

// ── Inline SVG Components ────────────────────────────────────────────────

function MetronomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle
        cx="4"
        cy="7"
        r="2.5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="10"
        cy="7"
        r="2.5"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CountInIcon({ bars }: { bars: number }) {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      {/* Bar 1: 4 ticks */}
      <line
        x1="1.5"
        y1="3"
        x2="1.5"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      <line
        x1="4"
        y1="3"
        x2="4"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      <line
        x1="6.5"
        y1="3"
        x2="6.5"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      <line
        x1="9"
        y1="3"
        x2="9"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      {/* Bar 2: 3 ticks */}
      <line
        x1="12"
        y1="3"
        x2="12"
        y2="11"
        strokeWidth={bars >= 2 ? 2 : 1.2}
        opacity={bars >= 2 ? 1 : 0.3}
      />
      <line
        x1="14.5"
        y1="3"
        x2="14.5"
        y2="11"
        strokeWidth={bars >= 2 ? 2 : 1.2}
        opacity={bars >= 2 ? 1 : 0.3}
      />
      <line
        x1="17"
        y1="3"
        x2="17"
        y2="11"
        strokeWidth={bars >= 2 ? 2 : 1.2}
        opacity={bars >= 2 ? 1 : 0.3}
      />
    </svg>
  );
}
