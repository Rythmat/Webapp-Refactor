import { Lock, Plus } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NOTES } from '@prism/engine';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { useIsPremium } from '@/hooks/useIsPremium';
import { useStore, type AllSlices } from '@/daw/store';
import { barStartTick, timeSignatureOf } from '@/daw/time/timeModel';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { trackRole } from '@/daw/utils/chordAnalysis';
import { modeWord, useSongPopover } from '../topbar/SongChip';
import { SongPopover } from '../topbar/SongPopover';
import { CHORD_LANE_PX } from '../tracklist/rowLayout';

// ── The chord lane's header (milestone 2.7) ────────────────────────────────
//
// The left end of the chord lane, sticky with it: what the lane is, the
// song's key as a chip ('C major', with its key colour) that opens the Song
// popover, and + (Suggest chords), which opens Prism's suggestions where the
// chords end. Both were reachable only by right-click or from the top bar
// (ia-flows-26). Prism is Premium: a free student sees + locked and is
// offered the plans (decision 8). In 200 × 24 px, Suggest is an icon with
// its name in the tooltip.

const SMALL_BUTTON = cn(
  'inline-flex h-6 min-w-6 items-center gap-1 rounded-full px-2 font-bold text-daw-text-2 hover:bg-daw-hover hover:text-daw-text [&_svg]:size-3.5',
  TYPE_CLASS.label,
  TRANSITION,
  FOCUS_RING,
);

/**
 * Where + Suggest suggests chords, and for which track: after the last
 * chord (or at the playhead's bar when there are none), for the selected
 * track if it can hold chords, else the first one that can. Null when no
 * track can (no MIDI track that isn't drums).
 */
export function suggestTarget(
  s: Pick<
    AllSlices,
    | 'tracks'
    | 'selectedTrackId'
    | 'chordRegions'
    | 'timeSignatureNumerator'
    | 'timeSignatureDenominator'
  >,
  playheadTick: number,
): { tick: number; trackId: string } | null {
  const holdsChords = (t: AllSlices['tracks'][number]) =>
    t.type === 'midi' &&
    t.instrument !== 'drum-machine' &&
    trackRole(t) !== 'drums';
  const selected = s.tracks.find((t) => t.id === s.selectedTrackId);
  const track =
    selected && holdsChords(selected) ? selected : s.tracks.find(holdsChords);
  if (!track) return null;
  const lastEnd = s.chordRegions.reduce(
    (end, r) => Math.max(end, r.endTick),
    0,
  );
  const tick =
    s.chordRegions.length > 0
      ? lastEnd
      : barStartTick(Math.max(0, playheadTick), timeSignatureOf(s));
  return { tick, trackId: track.id };
}

export const ChordLaneHeader = memo(function ChordLaneHeader() {
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const keyColour = useStore((s) =>
    s.rootNote !== null ? s.rootTrackColor : null,
  );
  const canSuggest = useStore((s) => suggestTarget(s, 0) !== null);
  const [open, onOpenChange] = useSongPopover();
  const { isPremium, isLoading } = useIsPremium();
  const navigate = useNavigate();

  const key =
    rootNote === null
      ? 'No key'
      : `${displayAccidentals(NOTES[rootNote])} ${modeWord(mode)}`;

  const suggest = () => {
    if (!isPremium) {
      // While the plan is loading a premium student looks free for a
      // moment: the lock may show, but it never sends them away.
      if (!isLoading) navigate(ProfileRoutes.plan.definition);
      return;
    }
    const s = useStore.getState();
    const target = suggestTarget(s, getPlayheadTick());
    if (target) s.openPrismSuggestion(target.tick, target.trackId);
  };

  return (
    <div
      data-testid="chord-lane-header"
      className="flex items-center gap-1 border-b border-daw-hairline pl-2 pr-1"
      style={{ height: CHORD_LANE_PX }}
    >
      <span className={cn(TYPE_CLASS.micro, 'shrink-0 text-daw-text-3')}>
        Chords
      </span>
      <Popover open={open} onOpenChange={onOpenChange}>
        <Tooltip content="Key, metre and tempo" side="right">
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="chord-lane-key"
              aria-label={`Key: ${key}. Change the key, metre and tempo`}
              className={cn(
                SMALL_BUTTON,
                'min-w-0 border',
                rootNote === null
                  ? 'border-dashed border-daw-outline'
                  : 'border-transparent bg-daw-chip',
              )}
            >
              {keyColour ? (
                <span
                  aria-hidden
                  data-meaning="key-colour"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: keyColour }}
                />
              ) : null}
              <span className="truncate">{key}</span>
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          align="start"
          sideOffset={6}
          data-testid="chord-lane-song-popover"
          data-ds="v2"
          className="w-[440px]"
        >
          <SongPopover onDone={() => onOpenChange(false)} />
        </PopoverContent>
      </Popover>
      <Tooltip
        content={
          !canSuggest
            ? 'Add an instrument track first: Prism suggests chords for it'
            : isPremium
              ? 'Suggest chords (Prism)'
              : 'Prism is part of Premium. Subscribe to unlock it.'
        }
        side="right"
      >
        <button
          type="button"
          data-testid="chord-lane-suggest"
          aria-label={
            isPremium
              ? 'Suggest chords (Prism)'
              : 'Suggest chords (Prism, Premium, locked)'
          }
          disabled={!canSuggest}
          className={cn(
            SMALL_BUTTON,
            'ml-auto shrink-0 justify-center px-0 disabled:pointer-events-none disabled:opacity-40',
          )}
          onClick={suggest}
        >
          {isPremium ? <Plus aria-hidden /> : <Lock aria-hidden />}
        </button>
      </Tooltip>
    </div>
  );
});
