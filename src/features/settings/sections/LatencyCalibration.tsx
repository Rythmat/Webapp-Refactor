/* eslint-disable react/jsx-sort-props */
import { useCallback, useEffect, useRef, useState } from 'react';
import { audioContextOwner } from '@/audio/core/AudioContextOwner';
import {
  COUNT_IN_CLICKS,
  SCORED_CLICKS,
  beatSeconds,
  eventContextTime,
  measureOutputLatency,
  reportedOutputLatency,
  scheduleClicks,
} from '../latencyCalibration';
import { useSettingsStore } from '../useSettingsStore';

type Phase =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'tapping'; taps: number }
  | { kind: 'done'; latencyMs: number; taps: number }
  | { kind: 'failed' };

const BTN_ACCENT: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#111',
  border: 'none',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

const BTN_QUIET: React.CSSProperties = {
  ...BTN_ACCENT,
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
};

const BTN_TAP: React.CSSProperties = {
  ...BTN_ACCENT,
  padding: '0.75rem 2.5rem',
  fontSize: '0.875rem',
  touchAction: 'manipulation',
};

const HINT: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-dim)',
};

const STATUS: Record<Phase['kind'], (phase: Phase) => string> = {
  idle: () =>
    'Put on the headphones you practice with, then tap along to the clicks on your keyboard, the spacebar, or the Tap button. Listen — don’t watch.',
  listening: () => `Listen… tapping starts after ${COUNT_IN_CLICKS} clicks.`,
  tapping: (phase) =>
    `Tap along — ${phase.kind === 'tapping' ? phase.taps : 0} taps`,
  done: (phase) =>
    phase.kind === 'done'
      ? `Set to ${phase.latencyMs} ms from ${phase.taps} taps.`
      : '',
  failed: () => 'Not enough steady taps. Try again.',
};

/** Tap along to clicks to set Output Latency. */
export const LatencyCalibration = () => {
  const setOutputLatencyMs = useSettingsStore((s) => s.setOutputLatencyMs);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const cleanupRef = useRef<(() => void) | null>(null);
  const tapRef = useRef<((timeStamp: number) => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const start = useCallback(() => {
    cleanupRef.current?.();
    audioContextOwner.resume();
    const context = audioContextOwner.get();
    const beat = beatSeconds();
    const clicks = scheduleClicks(
      context,
      context.currentTime + 0.5,
      COUNT_IN_CLICKS + SCORED_CLICKS,
      beat,
    );
    const taps: number[] = [];
    let midiInputs: MIDIInput[] = [];
    let ended = false;

    tapRef.current = (timeStamp) => {
      taps.push(eventContextTime(context, timeStamp));
      setPhase((p) =>
        p.kind === 'tapping' ? { kind: 'tapping', taps: taps.length } : p,
      );
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      tapRef.current?.(event.timeStamp);
    };
    const onMidi = (event: Event) => {
      const { data, timeStamp } = event as MIDIMessageEvent;
      if (data && (data[0] & 0xf0) === 0x90 && data[2] > 0) {
        tapRef.current?.(timeStamp);
      }
    };
    window.addEventListener('keydown', onKey);
    if (navigator.requestMIDIAccess) {
      navigator
        .requestMIDIAccess()
        .then((access) => {
          if (ended) return;
          midiInputs = Array.from(access.inputs.values());
          midiInputs.forEach((input) =>
            input.addEventListener('midimessage', onMidi),
          );
        })
        .catch(() => {
          /* no MIDI: spacebar and the Tap button still work */
        });
    }

    const msUntil = (time: number) =>
      Math.max(0, (time - context.currentTime) * 1000);
    const countInTimer = setTimeout(
      () => setPhase({ kind: 'tapping', taps: taps.length }),
      msUntil(clicks.times[COUNT_IN_CLICKS] - 0.2),
    );
    const endTimer = setTimeout(
      () => {
        cleanup();
        const result = measureOutputLatency(
          clicks.times.slice(COUNT_IN_CLICKS),
          taps,
          reportedOutputLatency(context),
          beat,
        );
        if (result) {
          setOutputLatencyMs(result.latencyMs);
          setPhase({ kind: 'done', ...result });
        } else {
          setPhase({ kind: 'failed' });
        }
      },
      msUntil(clicks.times[clicks.times.length - 1] + beat),
    );

    function cleanup() {
      ended = true;
      clearTimeout(countInTimer);
      clearTimeout(endTimer);
      clicks.stop();
      window.removeEventListener('keydown', onKey);
      midiInputs.forEach((input) =>
        input.removeEventListener('midimessage', onMidi),
      );
      tapRef.current = null;
      cleanupRef.current = null;
    }
    cleanupRef.current = cleanup;
    setPhase({ kind: 'listening' });
  }, [setOutputLatencyMs]);

  const cancel = useCallback(() => {
    cleanupRef.current?.();
    setPhase({ kind: 'idle' });
  }, []);

  const running = phase.kind === 'listening' || phase.kind === 'tapping';

  return (
    <div className="flex flex-col gap-3">
      <p style={HINT}>{STATUS[phase.kind](phase)}</p>
      <div className="flex items-center gap-3">
        {running ? (
          <>
            <button
              type="button"
              style={BTN_TAP}
              onPointerDown={(event) => tapRef.current?.(event.timeStamp)}
            >
              Tap
            </button>
            <button type="button" style={BTN_QUIET} onClick={cancel}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" style={BTN_ACCENT} onClick={start}>
            {phase.kind === 'idle' ? 'Calibrate' : 'Calibrate again'}
          </button>
        )}
      </div>
    </div>
  );
};
