import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { KEY_OF_COLORS } from '@/constants/theme';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { rootToMidi, buildScaleMidis, MODE_STEPS } from './modeHelpers';
import { findByUrlParam, getRelativeMode } from './relativeModeContent';
import './learn.css';

export function RelativeModesOverview() {
  const { key: keyParam } = useParams<{ key: string }>();
  const entry = useMemo(
    () => (keyParam ? findByUrlParam(keyParam) : undefined),
    [keyParam],
  );

  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);

  useEffect(() => {
    setActiveModeIndex(0);
    setNoteIndex(0);
  }, [keyParam]);

  const activeMode = useMemo(
    () => (entry ? getRelativeMode(entry.scaleNotes, activeModeIndex) : null),
    [entry, activeModeIndex],
  );

  const modeStepKeys = [
    'ionian',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'aeolian',
    'locrian',
  ] as const;

  const steps = useMemo(
    () => MODE_STEPS[modeStepKeys[activeModeIndex]] ?? [0, 2, 4, 5, 7, 9, 11],
    [activeModeIndex],
  );

  const rootMidi = activeMode ? rootToMidi(activeMode.root) : 60;
  const scaleMidis = useMemo(
    () => [...buildScaleMidis(rootMidi, steps), rootMidi + 12],
    [rootMidi, steps],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setNoteIndex((prev) => {
        const next = prev + 1;
        if (next >= scaleMidis.length) {
          setActiveModeIndex((prevMode) => (prevMode + 1) % 7);
          return 0;
        }
        return next;
      });
    }, 600);
    return () => window.clearInterval(id);
  }, [scaleMidis.length]);

  const activeNotes = useMemo(() => {
    const now = Date.now();
    const capped = Math.min(noteIndex, scaleMidis.length - 1);
    return scaleMidis.slice(0, capped + 1).map<PlaybackEvent>((midi, i) => ({
      id: `rel-${keyParam}-${activeModeIndex}-${midi}-${i}`,
      type: 'note',
      midi,
      time: now,
      duration: 0.6,
      velocity: 1,
    }));
  }, [keyParam, activeModeIndex, noteIndex, scaleMidis]);

  if (!entry) {
    return (
      <div
        className="learn-root flex h-full flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <p style={{ color: 'var(--color-text-dim)' }}>Key not found.</p>
      </div>
    );
  }

  const keyColor =
    KEY_OF_COLORS[entry.keyRoot as keyof typeof KEY_OF_COLORS] ?? '#7ecfcf';

  return (
    <div
      className="learn-root flex flex-col gap-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <h2
        className="ml-[10%] text-left text-2xl font-semibold md:text-3xl"
        style={{ color: keyColor }}
      >
        {entry.colorName} — {entry.keyRoot} Major: Relative Modes
      </h2>

      <PianoKeyboard
        activeBlackKeyColor={keyColor}
        activeWhiteKeyColor={keyColor}
        endC={6}
        playingNotes={activeNotes}
        startC={4}
      />

      {activeMode && (
        <p
          className="ml-[10%] text-left text-base font-semibold md:text-lg"
          style={{ color: 'var(--color-text)' }}
        >
          Playing: {activeMode.fullName} — {activeMode.intervals}
        </p>
      )}

      <section className="mb-6 flex flex-col items-center">
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3">
          {Array.from({ length: 7 }, (_, modeIdx) => {
            const mode = getRelativeMode(entry.scaleNotes, modeIdx);
            const isActive = modeIdx === activeModeIndex;
            return (
              <button
                key={modeIdx}
                className="glass-panel-sm cursor-pointer rounded-lg p-3 text-left text-sm transition-colors duration-150"
                style={{
                  color: isActive ? keyColor : 'var(--color-text)',
                  background: isActive
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.03)',
                  border: isActive
                    ? `1px solid ${keyColor}44`
                    : '1px solid var(--color-border)',
                }}
                onClick={() => {
                  setActiveModeIndex(modeIdx);
                  setNoteIndex(0);
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <div className="font-bold">{mode.fullName}</div>
                <div className="mt-1 text-xs opacity-70">
                  Intervals: {mode.intervals}
                </div>
                <div className="mt-1 text-xs opacity-70">
                  Notes: {mode.notes.join(', ')}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
