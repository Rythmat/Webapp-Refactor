// ── GuitarInputChip ────────────────────────────────────────────────────────
// The guitar input in the lesson visuals' chip row: where the guitar comes
// in, a small meter while the mic listens, what is happening in words, and
// the action that helps next. Status is told by text and icon, never by
// colour alone.

import { LoaderCircle, Mic, MicOff, Plug } from 'lucide-react';
import { memo, useEffect, useState, type ReactNode } from 'react';
import type {
  GuitarInputHandle,
  GuitarInputStatus,
} from '@/learn/audio/guitar/types';
import { AudioLevelMeter } from '../AudioLevelMeter';
import type { GuitarSetupStep } from './GuitarInputSetup';

const AUDIO_STATUS_TEXT: Record<GuitarInputStatus, string> = {
  idle: 'Mic off',
  'needs-setup': 'Set up guitar',
  'requesting-permission': 'Asking for the mic',
  listening: 'Listening',
  denied: 'Microphone blocked',
  'no-device': 'No microphone found',
  error: 'Mic problem',
};

/** Statuses the student can act on from the chip: retry, or switch to MIDI. */
const TROUBLE = new Set<GuitarInputStatus>(['denied', 'no-device', 'error']);

/** The rate the input reports its level at. */
const LEVEL_POLL_MS = 66;
/** The meter's floor: quieter input shows an empty bar. */
const METER_FLOOR_DB = -60;

/**
 * Input RMS as a 0-1 bar on a dB scale. Raw RMS barely moves for a guitar
 * (a good strum is ~0.03-0.2), so a linear bar would look empty and invite
 * too much boost. Half a bar is -30 dBFS; the meter's red zone is -9 dBFS.
 */
function meterFraction(rms: number): number {
  if (!(rms > 0)) return 0;
  const db = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, 1 - db / METER_FLOOR_DB));
}

/** Failures show up in the handle's status and error, not as rejections. */
function quietly(pending: Promise<unknown>): void {
  pending.catch(() => undefined);
}

/**
 * The input level: a bar for the eye, a value for assistive tech. The
 * handle's level can be a live getter on an unchanged handle, so the meter
 * polls it rather than waiting for its parent to re-render.
 */
export function InputLevelMeter({
  handle,
  width,
  height,
}: {
  handle: GuitarInputHandle;
  width: number;
  height: number;
}) {
  const [level, setLevel] = useState(() => meterFraction(handle.level));
  useEffect(() => {
    const read = () => setLevel(meterFraction(handle.level));
    read();
    const timer = setInterval(read, LEVEL_POLL_MS);
    return () => clearInterval(timer);
  }, [handle]);

  return (
    <span
      role="meter"
      aria-label="Input level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
      className="inline-flex"
    >
      <AudioLevelMeter level={level} width={width} height={height} />
    </span>
  );
}

function ChipButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-1.5 underline-offset-2 transition-colors hover:bg-white/10 hover:underline"
      style={{ color: 'var(--color-text, #e8e8f0)' }}
    >
      {children}
    </button>
  );
}

export interface GuitarInputChipProps {
  /** Null outside guitar lessons: the chip renders nothing. */
  handle: GuitarInputHandle | null;
  /** Open GuitarInputSetup, at `step` when given. */
  onOpenSetup: (step?: GuitarSetupStep) => void;
}

export const GuitarInputChip = memo(function GuitarInputChip({
  handle,
  onOpenSetup,
}: GuitarInputChipProps) {
  if (!handle) return null;
  const { status, prefs, error } = handle;
  const midi = prefs.source === 'midi';
  const trouble = !midi && TROUBLE.has(status);

  const text = !midi
    ? AUDIO_STATUS_TEXT[status]
    : status === 'needs-setup'
      ? AUDIO_STATUS_TEXT['needs-setup']
      : 'MIDI guitar';
  const Icon = midi
    ? Plug
    : status === 'requesting-permission'
      ? LoaderCircle
      : trouble
        ? MicOff
        : Mic;

  return (
    <div
      role="group"
      aria-label="Guitar input"
      className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-1 text-[11px]"
      style={{
        border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
        color: 'var(--color-text-dim, #9a9aab)',
      }}
    >
      <Icon
        aria-hidden
        size={12}
        strokeWidth={2}
        className={
          status === 'requesting-permission' ? 'animate-spin' : undefined
        }
      />
      <span role="status" title={error ?? undefined}>
        {text}
      </span>
      {!midi && status === 'listening' && (
        <InputLevelMeter handle={handle} width={36} height={4} />
      )}
      {trouble && (
        <>
          <ChipButton onClick={() => quietly(handle.enable())}>
            Retry
          </ChipButton>
          <ChipButton
            onClick={() => quietly(handle.restart({ source: 'midi' }))}
          >
            Use MIDI
          </ChipButton>
        </>
      )}
      {/* A mic in trouble opens straight onto the page that explains it. */}
      <ChipButton
        onClick={() => (trouble ? onOpenSetup('mic') : onOpenSetup())}
      >
        Set up
      </ChipButton>
    </div>
  );
});
