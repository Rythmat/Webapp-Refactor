// ── Jam Drum Machine ──────────────────────────────────────────────────────
// Step sequencer for the Jam Room, adapted from GrooveLab.
// 4 instruments × 16 steps. Sequencer playback sends notes over the network
// so other players hear the beat.

import { Play, Square, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DrumEngine } from '@/components/Games/GrooveLab/DrumEngine';
import { useJamRoom } from './JamRoomProvider';
import { useJamRoomStore, type ActiveNote } from './jamRoomStore';
import { DRUM_MIDI_MAP, MIDI_TO_DRUM, type DrumSound } from './types';

// ── Constants ────────────────────────────────────────────────────────────

const INSTRUMENTS: DrumSound[] = ['rim', 'hihat', 'snare', 'kick'];
const STEPS = 16;
const DEFAULT_BPM = 100;

const INSTRUMENT_COLORS: Record<DrumSound, string> = {
  kick: '#e0e0e0',
  snare: '#b8b8b8',
  hihat: '#909090',
  rim: '#707070',
};

const INSTRUMENT_LABELS: Record<DrumSound, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-Hat',
  rim: 'Rim',
};

type Grid = Record<DrumSound, boolean[]>;

function emptyGrid(): Grid {
  const g: Record<string, boolean[]> = {};
  INSTRUMENTS.forEach((inst) => (g[inst] = new Array(STEPS).fill(false)));
  return g as Grid;
}

function getActiveDrumColor(
  midi: number,
  remoteNotes: Map<string, ActiveNote[]>,
): string | null {
  for (const [, notes] of remoteNotes) {
    for (const note of notes) {
      if (note.midi === midi && note.instrument === 'drums') return note.color;
    }
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────

interface JamDrumMachineProps {
  isLocalInstrument: boolean;
  /** Called when a local drum hit fires (sequencer or manual tap) — for keyboard glow flash. */
  onLocalDrumHit?: (sound: DrumSound) => void;
  /** Called when BPM changes (for syncing waterfall gradient). */
  onBpmChange?: (bpm: number) => void;
}

export function JamDrumMachine({ isLocalInstrument, onLocalDrumHit, onBpmChange }: JamDrumMachineProps) {
  const { sendNote, localColor } = useJamRoom();
  const activeRemoteNotes = useJamRoomStore((s) => s.activeRemoteNotes);

  const drumRef = useRef<DrumEngine | null>(null);
  const playbackRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [flashRows, setFlashRows] = useState<Record<string, string | null>>({});

  // Refs for playback closure
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const sendNoteRef = useRef(sendNote);
  sendNoteRef.current = sendNote;
  const onLocalDrumHitRef = useRef(onLocalDrumHit);
  onLocalDrumHitRef.current = onLocalDrumHit;

  // Initialize drum engine
  useEffect(() => {
    drumRef.current = new DrumEngine();
    return () => {
      drumRef.current?.close();
      drumRef.current = null;
    };
  }, []);

  // Notify parent of BPM changes (including initial value)
  useEffect(() => {
    onBpmChange?.(bpm);
  }, [bpm, onBpmChange]);

  // ── Remote flash ─────────────────────────────────────────────────────

  useEffect(() => {
    const flashes: Record<string, string | null> = {};
    for (const [, notes] of activeRemoteNotes) {
      for (const note of notes) {
        if (note.instrument === 'drums') {
          const sound = MIDI_TO_DRUM[note.midi];
          if (sound) flashes[sound] = note.color;
        }
      }
    }
    setFlashRows(flashes);
    const timer = setTimeout(() => setFlashRows({}), 150);
    return () => clearTimeout(timer);
  }, [activeRemoteNotes]);

  // ── Playback ─────────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    if (playbackRef.current !== null) {
      clearInterval(playbackRef.current);
      playbackRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
    stepRef.current = 0;
  }, []);

  const makeTick = useCallback(() => {
    const step = stepRef.current;
    const g = gridRef.current;
    const d = drumRef.current;
    if (!d) return;

    const time = d.currentTime;
    INSTRUMENTS.forEach((inst) => {
      if (g[inst][step]) {
        d.playSound(inst, time);
        onLocalDrumHitRef.current?.(inst);
        sendNoteRef.current({
          type: 'jam:note',
          action: 'on',
          instrument: 'drums',
          midi: DRUM_MIDI_MAP[inst],
          velocity: 100,
        });
      }
    });

    setCurrentStep(step);
    stepRef.current = (step + 1) % STEPS;
  }, []);

  const startPlayback = useCallback(() => {
    const drum = drumRef.current;
    if (!drum) return;
    drum.resume();

    if (isPlaying) {
      stopPlayback();
      return;
    }

    stepRef.current = 0;
    setIsPlaying(true);

    const intervalMs = (60 / bpm / 4) * 1000;

    makeTick();
    playbackRef.current = window.setInterval(makeTick, intervalMs);
  }, [bpm, isPlaying, stopPlayback, makeTick]);

  // Restart interval when BPM changes during playback
  useEffect(() => {
    if (!isPlaying || playbackRef.current === null) return;

    clearInterval(playbackRef.current);
    const intervalMs = (60 / bpm / 4) * 1000;

    playbackRef.current = window.setInterval(makeTick, intervalMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current !== null) clearInterval(playbackRef.current);
    };
  }, []);

  // ── Grid toggle ──────────────────────────────────────────────────────

  const toggleCell = useCallback((instrument: DrumSound, step: number) => {
    setGrid((prev) => {
      const next = { ...prev };
      next[instrument] = [...prev[instrument]];
      next[instrument][step] = !next[instrument][step];
      return next;
    });
  }, []);

  const clearGrid = useCallback(() => setGrid(emptyGrid()), []);

  // ── Manual pad hit ───────────────────────────────────────────────────

  const hitPad = useCallback(
    (sound: DrumSound) => {
      if (!isLocalInstrument) return;
      const drum = drumRef.current;
      if (!drum) return;
      drum.resume();
      drum.playSound(sound, drum.currentTime);
      onLocalDrumHit?.(sound);

      setFlashRows((prev) => ({ ...prev, [sound]: localColor }));
      setTimeout(() => {
        setFlashRows((prev) => ({ ...prev, [sound]: null }));
      }, 150);

      sendNote({
        type: 'jam:note',
        action: 'on',
        instrument: 'drums',
        midi: DRUM_MIDI_MAP[sound],
        velocity: 100,
      });
    },
    [isLocalInstrument, sendNote, localColor, onLocalDrumHit],
  );

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-[120px]">
      {/* Left: controls column */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-1.5 px-3 border-r border-zinc-800/50">
        <button
          onClick={startPlayback}
          className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? <Square size={12} /> : <Play size={12} />}
        </button>

        <div className="flex flex-col items-center">
          <button
            onClick={() => setBpm((b) => Math.min(200, b + 5))}
            className="text-zinc-500 hover:text-white text-[10px] leading-none"
          >
            +
          </button>
          <span className="text-[10px] text-zinc-300 font-mono leading-tight">
            {bpm}
          </span>
          <button
            onClick={() => setBpm((b) => Math.max(60, b - 5))}
            className="text-zinc-500 hover:text-white text-[10px] leading-none"
          >
            -
          </button>
        </div>

        <button
          onClick={clearGrid}
          className="text-zinc-600 hover:text-white transition-colors"
          title="Clear"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Right: grid + beat numbers */}
      <div className="flex-1 flex flex-col min-w-0 py-1.5 px-2">
        {/* Step sequencer grid — 4 rows filling available height */}
        <div className="flex flex-col gap-px flex-1">
          {INSTRUMENTS.map((inst) => {
            const color = INSTRUMENT_COLORS[inst];
            const flash = flashRows[inst];
            const remoteColor = getActiveDrumColor(
              DRUM_MIDI_MAP[inst],
              activeRemoteNotes,
            );
            const rowFlash = flash ?? remoteColor;

            return (
              <div key={inst} className="flex items-center gap-1.5 flex-1 min-h-0">
                {/* Instrument label — clickable for manual hit */}
                <button
                  onClick={() => hitPad(inst)}
                  className="w-10 text-right text-[9px] font-medium shrink-0 transition-colors"
                  style={{
                    color: rowFlash ?? '#52525b',
                    cursor: isLocalInstrument ? 'pointer' : 'default',
                  }}
                  title={`Tap ${INSTRUMENT_LABELS[inst]}`}
                >
                  {INSTRUMENT_LABELS[inst]}
                </button>

                {/* 16 step cells */}
                <div className="flex gap-px flex-1 h-full">
                  {Array.from({ length: STEPS }, (_, step) => {
                    const isActive = grid[inst][step];
                    const isCurrent = step === currentStep && isPlaying;
                    const isBeatStart = step % 4 === 0;

                    return (
                      <button
                        key={step}
                        onClick={() => toggleCell(inst, step)}
                        className={`flex-1 rounded-[2px] transition-all ${
                          isBeatStart && step > 0 ? 'ml-0.5' : ''
                        }`}
                        style={{
                          background: isActive
                            ? color
                            : isCurrent
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(255,255,255,0.06)',
                          border: isCurrent
                            ? '1px solid rgba(255,255,255,0.3)'
                            : '1px solid rgba(255,255,255,0.10)',
                          opacity: isActive ? 1 : 0.7,
                          boxShadow: isActive
                            ? `0 0 6px ${color}40`
                            : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Beat numbers */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-10 shrink-0" />
          <div className="flex gap-px flex-1">
            {Array.from({ length: STEPS }, (_, step) => (
              <div
                key={step}
                className={`flex-1 text-center text-[8px] font-mono ${
                  step % 4 === 0 && step > 0 ? 'ml-0.5' : ''
                } ${step % 4 === 0 ? 'text-zinc-500' : 'text-zinc-700'}`}
              >
                {step % 4 === 0 ? step / 4 + 1 : '\u00B7'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
