import { memo, useId, useMemo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { hasWholeTrack, toggleTrackNotes } from '@/daw/utils/insightSelection';

// ── Insight's track picks ───────────────────────────────────────────────────
//
// A button for each instrument track with notes: a click selects every note
// of that track for Insight to analyze, another takes them out. With the
// chord track and the bass track picked, Analyze reads the chords they make
// together, which before took a ⌘-drag across both. Drum tracks are left
// out, having no harmony to read. A pick is the same note selection a
// ⌘-drag or the piano roll makes, so the rest of Insight is unchanged.

export const TrackNotePicks = memo(function TrackNotePicks() {
  const tracks = useStore((s) => s.tracks);
  const selectedNotes = useStore((s) => s.selectedNotes);
  const setSelectedNotes = useStore((s) => s.setSelectedNotes);
  const labelId = useId();

  const picks = useMemo(
    () =>
      tracks.flatMap((track, index) =>
        track.type === 'midi' &&
        track.instrument !== 'drum-machine' &&
        track.midiClips.some((clip) => clip.events.length > 0)
          ? [{ track, index, whole: hasWholeTrack(track, selectedNotes) }]
          : [],
      ),
    [tracks, selectedNotes],
  );
  if (picks.length === 0) return null;

  return (
    <div
      data-tutorial-id="insight-tracks"
      className="flex flex-col gap-1.5 border-b border-daw-hairline px-3 py-2"
    >
      <div id={labelId} className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>
        Analyze Tracks
      </div>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-1"
      >
        {picks.map(({ track, index, whole }) => (
          <button
            key={track.id}
            type="button"
            data-tutorial-id={`insight-track-${index}`}
            aria-pressed={whole}
            title={
              whole
                ? `Take ${track.name}'s notes out of the selection`
                : `Select every note of ${track.name} to analyze`
            }
            onClick={() =>
              setSelectedNotes(toggleTrackNotes(track, selectedNotes))
            }
            className={cn(
              'flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-daw-text hover:bg-daw-hover',
              whole
                ? 'border-daw-outline bg-daw-selected'
                : 'border-daw-hairline',
              TYPE_CLASS.label,
              TRANSITION,
              FOCUS_RING,
            )}
          >
            {whole ? (
              <Check aria-hidden className="size-3.5 shrink-0" />
            ) : (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: track.color }}
              />
            )}
            <span className="truncate">{track.name}</span>
          </button>
        ))}
      </div>
      <div className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
        Pick the tracks whose notes to analyze, then press Analyze.
      </div>
    </div>
  );
});
