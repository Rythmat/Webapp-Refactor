import { Lock } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { MODE_DISPLAY, NOTES } from '@prism/engine';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { Chip } from '@/daw/ui/Chip';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { TRANSITION } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { SongPopover } from './SongPopover';

// ── The Song chip (milestone 2.5) ──────────────────────────────────────────
//
// The song's key, metre and tempo in one chip ('C major · 4/4 · 92'), and
// one popover to change all three (SongPopover). It replaces the old bar's
// Key button, its lock, the time-signature button and the BPM field. With
// no key set the chip has a neutral dashed outline (the plan's default, not
// a rainbow). The key colour's dot is meaning, so it stays in colour.
//
// The key lock behaves as before: opening the popover frees the key so it
// can change, and closing it locks a chosen key again, so Prism and key
// detection leave it alone. The chip shows the lock.

/** 'major', 'minor', or the mode's own name ('Dorian'). */
export function modeWord(mode: string): string {
  if (mode === 'ionian') return 'major';
  if (mode === 'aeolian') return 'minor';
  return MODE_DISPLAY[mode] ?? mode;
}

/** The chip's text, long or short ('C major · 4/4 · 92' or 'C · 92'). */
export function songChipText(
  s: {
    rootNote: number | null;
    mode: string;
    timeSignatureNumerator: number;
    timeSignatureDenominator: number;
    bpm: number;
  },
  short: boolean,
): string {
  const root =
    s.rootNote === null ? null : displayAccidentals(NOTES[s.rootNote]);
  if (short) return `${root ?? 'No key'} · ${s.bpm}`;
  const key = root === null ? 'No key' : `${root} ${modeWord(s.mode)}`;
  return `${key} · ${s.timeSignatureNumerator}/${s.timeSignatureDenominator} · ${s.bpm}`;
}

/**
 * The Song popover's open state, with the key lock: opening frees the key
 * so the circle can change it, closing locks a chosen one again (as the old
 * Key popover did). A lesson step done in it (Hip Hop's tempo) closes it,
 * so it never sits over the next step's card. The top bar's chip and the
 * chord lane's key chip each open one.
 */
export function useSongPopover(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  const onOpenChange = useCallback((next: boolean) => {
    const s = useStore.getState();
    if (next && s.rootLocked) s.toggleRootLock();
    if (!next && s.rootNote !== null && !s.rootLocked) s.toggleRootLock();
    setOpen(next);
  }, []);

  const step = useStore((s) =>
    s.activeTutorialId === null ? null : s.tutorialStepIndex,
  );
  const lastStep = useRef(step);
  useEffect(() => {
    if (step !== lastStep.current && step !== null && open) {
      onOpenChange(false);
    }
    lastStep.current = step;
  }, [step, open, onOpenChange]);

  return [open, onOpenChange];
}

export const SongChip = memo(function SongChip({
  short = false,
}: {
  /** The folded top bar's short form. */
  short?: boolean;
}) {
  const full = useStore((s) => songChipText(s, false));
  const brief = useStore((s) => songChipText(s, true));
  const keyColour = useStore((s) =>
    s.rootNote !== null ? s.rootTrackColor : null,
  );
  const hasKey = useStore((s) => s.rootNote !== null);
  const locked = useStore((s) => s.rootLocked && s.rootNote !== null);
  const [open, onOpenChange] = useSongPopover();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip content="Key, metre and tempo" side="bottom">
        <PopoverTrigger asChild>
          <Chip
            asChild
            size="md"
            dashed={!hasKey}
            color={keyColour ?? undefined}
            className={cn(
              'h-7 cursor-pointer gap-1.5 px-2.5 font-bold tabular-nums text-daw-text hover:bg-daw-hover',
              TRANSITION,
            )}
          >
            <button
              type="button"
              data-tutorial-id="song-chip"
              data-testid="song-chip"
              aria-label={`Song: ${full}${locked ? ', key locked' : ''}`}
            >
              {short ? brief : full}
              {locked ? <Lock aria-hidden className="text-daw-text-3" /> : null}
            </button>
          </Chip>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        align="end"
        sideOffset={6}
        data-testid="song-popover"
        data-ds="v2"
        className="w-[440px]"
      >
        <SongPopover onDone={() => onOpenChange(false)} />
      </PopoverContent>
    </Popover>
  );
});
