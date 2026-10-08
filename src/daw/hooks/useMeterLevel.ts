import { type RefObject, useEffect, useState } from 'react';
import { useStore } from '@/daw/store';

// ── Shared meter scheduler ───────────────────────────────────────────────
// Every live meter (track headers, the master header, the Mix view) reads
// its AnalyserNode from ONE requestAnimationFrame loop, and that loop only
// runs while there is something to show: while the transport plays, records
// or counts in, and until every meter has decayed after the signal stops.
// An idle editor runs no meter rAF at all; a slow timer probes the analysers
// instead, so a note played while stopped (keyboard, MIDI input, a monitored
// input, Test Sound) wakes the meters within PROBE_MS.
//
// A meter reports a level only when its whole-percent value changes, so a
// silent meter costs nothing, and a component that paints through a ref
// (useMeterFill) re-renders nothing at all.

const PEAK_DECAY = 0.9; // multiplier per frame (~60fps → falls to ~0 in ~35 frames)
const PROBE_MS = 100;
/**
 * One 8-bit step (100/128 ≈ 0.78) is the floor: a stopped bus's float
 * residue can read a step below the midpoint forever. A meter at or under
 * it counts as silent, so residue neither keeps the loop alive nor wakes it.
 */
const SILENT_BELOW = 1.5;

interface MeterEntry {
  analyser: AnalyserNode;
  buffer: Uint8Array<ArrayBuffer>;
  peak: number;
  level: number;
  emit: (level: number) => void;
}

const meters = new Set<MeterEntry>();
let rafId = 0;
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let transportActive = false;
let transportSubscribed = false;

/** The analyser's instantaneous peak, 0–100. */
function readInstant(entry: MeterEntry): number {
  entry.analyser.getByteTimeDomainData(entry.buffer);
  const buffer = entry.buffer;
  // Peak absolute deviation from 128 (the zero-signal midpoint)
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i] - 128);
    if (abs > peak) peak = abs;
  }
  return (peak / 128) * 100;
}

function setLevel(entry: MeterEntry, level: number): void {
  if (level === entry.level) return;
  entry.level = level;
  entry.emit(level);
}

function frame(): void {
  rafId = 0;
  if (meters.size === 0) return;
  let lit = false;
  for (const entry of meters) {
    const instant = readInstant(entry);
    // Peak hold with exponential decay. max(), not "decay unless louder":
    // that dropped a steady tone by 10% every other frame, so the meter
    // flickered and re-rendered on every frame.
    entry.peak = Math.max(instant, entry.peak * PEAK_DECAY);
    setLevel(entry, Math.round(entry.peak));
    if (entry.peak >= SILENT_BELOW) lit = true;
  }
  if (transportActive || lit) {
    rafId = requestAnimationFrame(frame);
    return;
  }
  // Everything has decayed to the floor: settle each meter on what it reads
  // now (0, or one step of residue) and fall back to probing.
  for (const entry of meters) {
    entry.peak = readInstant(entry);
    setLevel(entry, Math.round(entry.peak));
  }
  scheduleProbe();
}

function startLoop(): void {
  if (probeTimer !== null) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
  if (rafId === 0 && meters.size > 0) rafId = requestAnimationFrame(frame);
}

function scheduleProbe(): void {
  if (probeTimer !== null || rafId !== 0 || meters.size === 0) return;
  probeTimer = setTimeout(probe, PROBE_MS);
}

function probe(): void {
  probeTimer = null;
  if (rafId !== 0 || meters.size === 0) return;
  for (const entry of meters) {
    const instant = readInstant(entry);
    if (instant >= SILENT_BELOW) {
      startLoop();
      return;
    }
    // Keep a settled meter honest: residue that fades out reads 0 again.
    entry.peak = instant;
    setLevel(entry, Math.round(instant));
  }
  scheduleProbe();
}

function isTransportActive(s: {
  isPlaying: boolean;
  isRecording: boolean;
  isCountingIn: boolean;
}): boolean {
  return s.isPlaying || s.isRecording || s.isCountingIn;
}

/** Follow the transport once, for the module's lifetime. */
function subscribeTransport(): void {
  if (transportSubscribed) return;
  transportSubscribed = true;
  transportActive = isTransportActive(useStore.getState());
  useStore.subscribe((s) => {
    const active = isTransportActive(s);
    if (active === transportActive) return;
    transportActive = active;
    // Starting: meter from the first frame, not the next probe. Stopping:
    // the loop winds down by itself once the meters decay.
    if (active) startLoop();
  });
}

/**
 * Meter `analyser` on the shared loop. `emit` gets the 0–100 level each
 * time its whole-percent value changes. Returns the unregister function.
 */
export function registerMeter(
  analyser: AnalyserNode,
  emit: (level: number) => void,
): () => void {
  subscribeTransport();
  const entry: MeterEntry = {
    analyser,
    buffer: new Uint8Array(analyser.fftSize),
    peak: 0,
    level: 0,
    emit,
  };
  meters.add(entry);
  // One pass reads where the meter is now; the loop stops itself if silent.
  startLoop();
  return () => {
    meters.delete(entry);
    if (meters.size > 0) return;
    if (rafId !== 0) cancelAnimationFrame(rafId);
    rafId = 0;
    if (probeTimer !== null) clearTimeout(probeTimer);
    probeTimer = null;
  };
}

/**
 * Reads peak amplitude from an AnalyserNode on the shared meter loop.
 * Returns a level in the range 0–100 for direct use with MeterSegments.
 * The component re-renders only when the whole-percent level changes.
 *
 * Pass null when no analyser is available; the hook returns 0.
 */
export function useMeterLevel(analyser: AnalyserNode | null): number {
  const [level, setLevelState] = useState(0);

  useEffect(() => {
    if (!analyser) {
      setLevelState(0);
      return;
    }
    const unregister = registerMeter(analyser, setLevelState);
    return () => {
      unregister();
      setLevelState(0);
    };
  }, [analyser]);

  return level;
}

/** The meter colour for a 0–100 level. */
export function meterColor(level: number): string {
  if (level > 90) return 'var(--color-meter-red)';
  if (level > 75) return 'var(--color-meter-yellow)';
  return 'var(--color-meter-green)';
}

/**
 * Paints a horizontal level fill (width + colour) straight onto `ref`'s
 * element from the shared meter loop, with no React state: the component
 * that owns the bar never re-renders for the meter. With `analyserR` the
 * fill shows the mean of the two channels.
 */
export function useMeterFill(
  ref: RefObject<HTMLElement | null>,
  analyser: AnalyserNode | null,
  analyserR: AnalyserNode | null = null,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let left = 0;
    let right = 0;
    const paint = () => {
      const level = analyserR ? (left + right) / 2 : left;
      el.style.width = `${level}%`;
      el.style.backgroundColor = meterColor(level);
    };
    paint();
    const unregister: Array<() => void> = [];
    if (analyser) {
      unregister.push(
        registerMeter(analyser, (level) => {
          left = level;
          paint();
        }),
      );
    }
    if (analyserR) {
      unregister.push(
        registerMeter(analyserR, (level) => {
          right = level;
          paint();
        }),
      );
    }
    return () => {
      unregister.forEach((off) => off());
      left = 0;
      right = 0;
      paint();
    };
  }, [ref, analyser, analyserR]);
}
