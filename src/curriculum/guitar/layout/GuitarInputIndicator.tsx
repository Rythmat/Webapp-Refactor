import { Guitar, MicOff } from 'lucide-react';
import { cn } from '@/components/utilities';
import type {
  GuitarInputHandle,
  GuitarInputStatus,
} from '@/learn/audio/guitar/types';
import type { GuitarSetupStep } from '@/learn/components/guitar/GuitarInputSetup';

// ── Guitar input indicator ─────────────────────────────────────────────────
// In the header, and only when the student has something to do: the guitar
// isn't set up yet, or the microphone failed. Everything else about the
// input lives in Settings → Input. The failure icon is the screen's one
// error colour; the words say it too.

/** Microphone failures the setup's mic page explains. */
const MIC_TROUBLE = new Set<GuitarInputStatus>([
  'denied',
  'no-device',
  'error',
]);

export type GuitarInputAttention = 'setup' | 'micTrouble' | null;

/** What, if anything, the indicator asks of the student. */
export function guitarInputAttention(
  handle: Pick<GuitarInputHandle, 'status' | 'prefs'> | null,
): GuitarInputAttention {
  if (!handle) return null;
  if (handle.status === 'needs-setup') return 'setup';
  // A MIDI guitar never asks for the microphone.
  if (handle.prefs.source !== 'midi' && MIC_TROUBLE.has(handle.status)) {
    return 'micTrouble';
  }
  return null;
}

export interface GuitarInputIndicatorProps {
  handle: GuitarInputHandle | null;
  /** Open the guitar input setup, at `step` when given. */
  onOpenSetup: (step?: GuitarSetupStep) => void;
  /**
   * "Fix" for a failed mic: Settings → Input, where the input chip offers
   * Retry, Use MIDI and the setup. Without it, the setup's mic page opens.
   */
  onOpenInputSettings?: () => void;
  className?: string;
}

const pill =
  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-normal text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] max-[639px]:h-11';

export function GuitarInputIndicator({
  handle,
  onOpenSetup,
  onOpenInputSettings,
  className,
}: GuitarInputIndicatorProps) {
  const attention = guitarInputAttention(handle);
  if (attention === null) return null;

  if (attention === 'setup') {
    return (
      <button
        type="button"
        data-guitar-input-indicator="setup"
        onClick={() => onOpenSetup()}
        className={cn(pill, className)}
      >
        <Guitar className="size-4 text-white/55" />
        Set up guitar
      </button>
    );
  }

  return (
    <button
      type="button"
      data-guitar-input-indicator="micTrouble"
      onClick={() =>
        onOpenInputSettings ? onOpenInputSettings() : onOpenSetup('mic')
      }
      title={handle?.error ?? undefined}
      className={cn(pill, className)}
    >
      <MicOff className="size-4 text-red-400" />
      Mic blocked · Fix
    </button>
  );
}
