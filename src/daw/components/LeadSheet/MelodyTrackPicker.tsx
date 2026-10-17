import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { TYPE_CLASS } from '@/daw/ui/styles';
import {
  autoMelodyTrack,
  hasMelodyNotes,
  melodyCandidates,
  pickMelodyTracks,
} from './leadSheetMelody';

// ── Which tracks are the melody ────────────────────────────────────────────
// The caret beside the toolbar's Melody button: every instrument track with
// a box to tick, and Auto, which is what the sheet shows until something is
// ticked. The button itself names what the sheet is showing, so nobody has
// to open the menu to find out why a track is there.

/** How many colour dots the button shows before the names take over. */
const MAX_DOTS = 3;

/**
 * Ticking a track while Melody is off swaps the chord chart for the written
 * sheet, toolbar and all, so the picker it was ticked in goes away with it.
 * It hands over as it goes, and the sheet's own picker opens in its place on
 * the same box, so ticking a second track needs no second trip to the menu.
 * A hand-over not taken up at once lapses: a picker mounted later never
 * opens by itself.
 */
let reopen: { trackId: string; at: number } | null = null;
const REOPEN_WITHIN_MS = 1000;

/** What the button says the sheet shows: "Auto: Lead", "Lead, Keys". */
export function melodyPickLabel(
  shown: readonly Track[],
  auto: boolean,
): string {
  if (shown.length === 0) return 'No track';
  if (auto) return `Auto: ${shown[0].name}`;
  if (shown.length <= 2) return shown.map((track) => track.name).join(', ');
  return `${shown[0].name} + ${shown.length - 1} more`;
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

interface MelodyTrackPickerProps {
  /** The toolbar's button look, so the caret sits with its neighbours. */
  className?: string;
  style?: CSSProperties;
}

export const MelodyTrackPicker = memo(function MelodyTrackPicker({
  className,
  style,
}: MelodyTrackPickerProps) {
  const tracks = useStore((s) => s.tracks);
  const assignedIds = useStore((s) => s.leadSheetMelodyTrackIds);
  const showMelody = useStore((s) => s.leadSheetShowMelody);
  const toggleTrack = useStore((s) => s.toggleLeadSheetMelodyTrack);
  const setTrackIds = useStore((s) => s.setLeadSheetMelodyTrackIds);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  /** The box to put focus back on when this picker opens in another's place. */
  const focusTrack = useRef<string | null>(null);
  /** A box ticked that switches Melody on, which may swap this picker out. */
  const handoff = useRef<string | null>(null);

  useEffect(() => {
    // Melody came on and this picker is still here: nothing to hand over.
    if (showMelody) handoff.current = null;
  }, [showMelody]);

  useEffect(() => {
    const pending = reopen;
    reopen = null;
    if (pending && performance.now() - pending.at < REOPEN_WITHIN_MS) {
      focusTrack.current = pending.trackId;
      setOpen(true);
    }
    return () => {
      // Runs before the new picker's mount, in the same commit.
      if (handoff.current) {
        reopen = { trackId: handoff.current, at: performance.now() };
      }
    };
  }, []);

  const tick = useCallback(
    (trackId: string) => {
      if (!showMelody) handoff.current = trackId;
      toggleTrack(trackId);
    },
    [showMelody, toggleTrack],
  );

  const candidates = useMemo(() => melodyCandidates(tracks), [tracks]);
  const pick = useMemo(
    () => pickMelodyTracks(tracks, assignedIds),
    [tracks, assignedIds],
  );
  // What Auto picks, named whether or not it is chosen, so going back to it
  // is never a guess.
  const autoTrack = useMemo(() => autoMelodyTrack(tracks), [tracks]);
  const ticked = useMemo(
    () => new Set(pick.auto ? [] : pick.tracks.map((track) => track.id)),
    [pick],
  );
  const label = melodyPickLabel(pick.tracks, pick.auto);

  // Choosing Auto asks to see it, as ticking a track does.
  const chooseAuto = useCallback(
    () => setTrackIds([], { show: true }),
    [setTrackIds],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(className, 'max-w-[220px]')}
          style={{ ...style, opacity: showMelody ? 1 : 0.5 }}
          title={
            pick.tracks.length === 0
              ? 'Choose the melody tracks'
              : `Melody tracks: ${pick.tracks.map((t) => t.name).join(', ')}${pick.auto ? ' (picked automatically)' : ''}. Click to change.`
          }
          aria-label={`Choose the melody tracks (now ${label})`}
          data-testid="melody-track-picker"
          data-melody-auto={pick.auto || undefined}
        >
          {pick.tracks.slice(0, MAX_DOTS).map((track) => (
            <ColorDot key={track.id} color={track.color} />
          ))}
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDown size={12} strokeWidth={2} className="shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-72 p-2"
        aria-label="Melody tracks"
        data-testid="melody-track-menu"
        ref={menuRef}
        onOpenAutoFocus={(event) => {
          const trackId = focusTrack.current;
          focusTrack.current = null;
          const box = trackId
            ? menuRef.current?.querySelector<HTMLInputElement>(
                `input[data-track-id="${CSS.escape(trackId)}"]`,
              )
            : null;
          if (box) {
            event.preventDefault();
            box.focus();
          }
        }}
      >
        <div className={cn(TYPE_CLASS.micro, 'px-2 pb-1 pt-1 text-daw-text-3')}>
          Show on the lead sheet
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-[var(--daw-radius-sm)] px-2 py-1.5 hover:bg-daw-hover">
          <input
            type="radio"
            name="melody-track-mode"
            checked={pick.auto}
            // A click, not a change: choosing Auto again while Melody is
            // off is still asking to see it.
            onClick={chooseAuto}
            readOnly
            className="mt-1 size-3.5 shrink-0 accent-[color:var(--daw-accent)]"
          />
          <span className="min-w-0">
            <span className="block truncate">
              {autoTrack ? `Auto: ${autoTrack.name}` : 'Auto'}
            </span>
            <span className={cn(TYPE_CLASS.label, 'block text-daw-text-3')}>
              Uses the track set to Melody in its track header, or else the
              first track with notes.
            </span>
          </span>
        </label>

        <div className="-mx-2 my-1.5 h-px bg-daw-hairline" />

        {candidates.length === 0 ? (
          <div className={cn(TYPE_CLASS.label, 'px-2 py-1.5 text-daw-text-3')}>
            No instrument tracks yet. Add one in Create and its melody can show
            here.
          </div>
        ) : (
          <>
            <div className={cn(TYPE_CLASS.label, 'px-2 pb-1 text-daw-text-3')}>
              Or tick the tracks to show. Each gets its own staff.
            </div>
            <ul aria-label="Instrument tracks">
              {candidates.map((track) => (
                <li key={track.id}>
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-[var(--daw-radius-sm)] px-2 py-1.5 hover:bg-daw-hover"
                    data-testid="melody-track-option"
                  >
                    <input
                      type="checkbox"
                      checked={ticked.has(track.id)}
                      onChange={() => tick(track.id)}
                      data-track-id={track.id}
                      className="size-3.5 shrink-0 accent-[color:var(--daw-accent)]"
                    />
                    <ColorDot color={track.color} />
                    <span className="min-w-0 flex-1 truncate">
                      {track.name}
                    </span>
                    {!hasMelodyNotes(track) && (
                      <span
                        className={cn(
                          TYPE_CLASS.label,
                          'shrink-0 text-daw-text-3',
                        )}
                      >
                        no notes yet
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});
