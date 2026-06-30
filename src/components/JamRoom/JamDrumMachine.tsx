// ── Jam Drum Machine ──────────────────────────────────────────────────────
// Step sequencer for the Jam Room, adapted from GrooveLab.
// 4 instruments × 16 steps. Playback is driven by a single room-wide transport
// (see jamRoomStore.drumTransport) anchored to server time, so every device
// plays the same step at the same instant. Each client renders the beat from
// that shared timeline locally; per-step notes are NOT broadcast.

import { Lock, Play, Square, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DrumEngine } from '@/components/Games/GrooveLab/DrumEngine';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useJamRoom } from './JamRoomProvider';
import { jamRecorder } from './jamRecorder';
import { useJamRoomStore, type ActiveNote } from './jamRoomStore';
import {
  DRUM_INSTRUMENTS,
  DRUM_MIDI_MAP,
  DRUM_STEPS,
  MIDI_TO_DRUM,
  emptyDrumGrid,
  type DrumSound,
  type DrumTransport,
} from './types';

// ── Constants ────────────────────────────────────────────────────────────

const INSTRUMENTS = DRUM_INSTRUMENTS;
const STEPS = DRUM_STEPS;
/** Polling cadence (ms) for the shared-timeline scheduler. */
const SCHEDULER_MS = 16;

/** Duration of one 16th-note step in ms at the given tempo. */
function stepDurationMs(bpm: number): number {
  return (60 / bpm / 4) * 1000;
}

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

export function JamDrumMachine({
  isLocalInstrument,
  onLocalDrumHit,
  onBpmChange,
}: JamDrumMachineProps) {
  const {
    sendNote,
    localColor,
    roomId,
    sendDrumGrid,
    sendDrumTransport,
    serverNow,
  } = useJamRoom();
  const { userId } = useAuthContext();
  const activeRemoteNotes = useJamRoomStore((s) => s.activeRemoteNotes);

  // Shared drum pattern + edit permission (synced across the room).
  const grid = useJamRoomStore((s) => s.drumGrid);
  const drumMode = useJamRoomStore((s) => s.drumMode);
  const drummerId = useJamRoomStore((s) => s.drummerId);

  // Room-wide transport — the single timeline that drives playback on every
  // device. Play state and tempo come from here, not from local state.
  const transport = useJamRoomStore((s) => s.drumTransport);
  const setDrumTransport = useJamRoomStore((s) => s.setDrumTransport);
  const isPlaying = transport.playing;
  const bpm = transport.bpm;

  // Who may edit the pattern / drive the transport: everyone in a local/open
  // session, or only the designated drummer when the host has locked it.
  const canEdit =
    roomId === null || drumMode === 'open' || drummerId === userId;

  const drumRef = useRef<DrumEngine | null>(null);
  // Last step we fired, so the scheduler triggers each step exactly once.
  const lastStepRef = useRef(-1);

  const [currentStep, setCurrentStep] = useState(-1);
  const [flashRows, setFlashRows] = useState<Record<string, string | null>>({});

  // Refs for playback closure
  const gridRef = useRef(grid);
  gridRef.current = grid;
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

  // ── Shared-timeline playback ─────────────────────────────────────────
  // Playback is driven by the room-wide transport rather than a private
  // clock. Each client derives the active step from the shared `startedAt`
  // epoch (in server time), plays its own audio, and stays phase-locked with
  // every other device. The sequencer does NOT broadcast per-step notes —
  // peers play the same step from the same timeline, so a broadcast would
  // double-trigger their audio.

  // Apply a transport change locally (instant feedback) and broadcast it.
  const applyTransport = useCallback(
    (next: DrumTransport) => {
      setDrumTransport(next);
      sendDrumTransport(next);
    },
    [setDrumTransport, sendDrumTransport],
  );

  // Fire one step on this device: play active sounds, flash, and record for
  // the studio export. No network send (see note above).
  const fireStep = useCallback(
    (step: number) => {
      const g = gridRef.current;
      const d = drumRef.current;
      if (!d) return;
      const time = d.currentTime;
      const flashed: Record<string, string | null> = {};
      INSTRUMENTS.forEach((inst) => {
        if (g[inst][step]) {
          d.playSound(inst, time);
          onLocalDrumHitRef.current?.(inst);
          flashed[inst] = INSTRUMENT_COLORS[inst];
          jamRecorder.record({
            action: 'on',
            userId: userId ?? '',
            color: localColor,
            instrument: 'drums',
            midi: DRUM_MIDI_MAP[inst],
            velocity: 100,
          });
        }
      });
      if (Object.keys(flashed).length > 0) {
        setFlashRows((prev) => ({ ...prev, ...flashed }));
        window.setTimeout(() => {
          setFlashRows((prev) => {
            const next = { ...prev };
            for (const k of Object.keys(flashed)) next[k] = null;
            return next;
          });
        }, 120);
      }
    },
    [userId, localColor],
  );

  // Run the scheduler while the shared transport is playing.
  const startedAt = transport.startedAt;
  useEffect(() => {
    if (!isPlaying || startedAt === null) {
      setCurrentStep(-1);
      lastStepRef.current = -1;
      return;
    }
    drumRef.current?.resume();
    const stepMs = stepDurationMs(bpm);
    const tick = () => {
      const elapsed = serverNow() - startedAt;
      if (elapsed < 0) return; // scheduled to start in the (clock-skew) future
      const step = Math.floor(elapsed / stepMs) % STEPS;
      if (step !== lastStepRef.current) {
        lastStepRef.current = step;
        fireStep(step);
        setCurrentStep(step);
      }
    };
    tick();
    const id = window.setInterval(tick, SCHEDULER_MS);
    return () => clearInterval(id);
  }, [isPlaying, startedAt, bpm, serverNow, fireStep]);

  // ── Transport controls ───────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    if (!canEdit) return;
    drumRef.current?.resume();
    if (transport.playing) {
      applyTransport({ ...transport, playing: false, startedAt: null });
    } else {
      applyTransport({
        playing: true,
        startedAt: serverNow(),
        bpm: transport.bpm,
      });
    }
  }, [canEdit, transport, applyTransport, serverNow]);

  const changeBpm = useCallback(
    (delta: number) => {
      if (!canEdit) return;
      const newBpm = Math.min(200, Math.max(60, transport.bpm + delta));
      if (newBpm === transport.bpm) return;
      if (transport.playing && transport.startedAt !== null) {
        // Rebase the timeline so the loop keeps its current phase at the new
        // tempo instead of jumping.
        const now = serverNow();
        const loopOld = stepDurationMs(transport.bpm) * STEPS;
        const loopNew = stepDurationMs(newBpm) * STEPS;
        const elapsedInLoop =
          (((now - transport.startedAt) % loopOld) + loopOld) % loopOld;
        const posFrac = elapsedInLoop / loopOld;
        applyTransport({
          playing: true,
          startedAt: now - posFrac * loopNew,
          bpm: newBpm,
        });
      } else {
        applyTransport({ ...transport, bpm: newBpm });
      }
    },
    [canEdit, transport, applyTransport, serverNow],
  );

  // ── Grid toggle ──────────────────────────────────────────────────────

  // Apply a grid edit locally (instant feedback) and broadcast it to the room.
  const applyGrid = useCallback(
    (next: typeof grid) => {
      useJamRoomStore.getState().setDrumGrid(next);
      sendDrumGrid(next);
    },
    [sendDrumGrid],
  );

  const toggleCell = useCallback(
    (instrument: DrumSound, step: number) => {
      if (!canEdit) return;
      const prev = useJamRoomStore.getState().drumGrid;
      const next = {
        ...prev,
        [instrument]: prev[instrument].map((on, i) => (i === step ? !on : on)),
      };
      applyGrid(next);
    },
    [canEdit, applyGrid],
  );

  const clearGrid = useCallback(() => {
    if (!canEdit) return;
    applyGrid(emptyDrumGrid());
  }, [canEdit, applyGrid]);

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
          onClick={togglePlay}
          disabled={!canEdit}
          className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={
            !canEdit
              ? 'Only the designated drummer can control playback'
              : isPlaying
                ? 'Stop'
                : 'Play'
          }
        >
          {isPlaying ? <Square size={12} /> : <Play size={12} />}
        </button>

        <div className="flex flex-col items-center">
          <button
            onClick={() => changeBpm(5)}
            disabled={!canEdit}
            className="text-zinc-500 hover:text-white text-[10px] leading-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-500"
          >
            +
          </button>
          <span className="text-[10px] text-zinc-300 font-mono leading-tight">
            {bpm}
          </span>
          <button
            onClick={() => changeBpm(-5)}
            disabled={!canEdit}
            className="text-zinc-500 hover:text-white text-[10px] leading-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-500"
          >
            -
          </button>
        </div>

        {canEdit ? (
          <button
            onClick={clearGrid}
            className="text-zinc-600 hover:text-white transition-colors"
            title="Clear"
          >
            <Trash2 size={12} />
          </button>
        ) : (
          <span
            className="text-zinc-600"
            title="Only the designated drummer can edit the pattern"
          >
            <Lock size={12} />
          </span>
        )}
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
              <div
                key={inst}
                className="flex items-center gap-1.5 flex-1 min-h-0"
              >
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
                        disabled={!canEdit}
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
                          boxShadow: isActive ? `0 0 6px ${color}40` : 'none',
                          cursor: canEdit ? 'pointer' : 'default',
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
