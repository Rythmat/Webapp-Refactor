// ── A Foli call on the staff ────────────────────────────────────────────────
// Written as the Studio's Score editor writes drums (lib/notation/buildScore,
// a percussion staff): the high bongo in the top space, the low bongo in the
// second, the side stick an x in the snare's space, the timbale above, beamed
// by the beat, triplets bracketed. Notes the player has played go green,
// the ones they missed red; the playhead runs with the audio clock.

import { useMemo } from 'react';
import { GrandStaff } from '@/components/notation/GrandStaff';
import type {
  NoteStyle,
  PlayheadSubscription,
} from '@/components/notation/StaffView';
import { DRUMS } from '@/curriculum/engine/foli/drums';
import type { FoliNote } from '@/curriculum/engine/foli/rhythms';
import { buildScore } from '@/lib/notation/buildScore';

export function FoliStaff({
  notes,
  bars,
  noteStyles,
  playhead,
}: {
  notes: readonly FoliNote[];
  bars: number;
  noteStyles: ReadonlyMap<string, NoteStyle>;
  playhead: PlayheadSubscription;
}) {
  const score = useMemo(
    () =>
      buildScore(
        notes.map((n, i) => ({
          id: String(i),
          midi: DRUMS[n.drum].gm,
          startTick: n.startTick,
          durationTicks: n.durationTick,
        })),
        {
          ticksPerQuarter: 480,
          timeSignature: [4, 4],
          minMeasures: bars,
          staves: 'percussion',
        },
      ),
    [notes, bars],
  );
  return (
    <div
      data-foli-staff
      className="w-full overflow-hidden rounded-xl"
      style={{
        maxWidth: bars === 2 ? 900 : 520,
        height: bars === 2 ? 260 : 170,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <GrandStaff
        score={score}
        noteStyles={noteStyles}
        playheadSource={playhead}
        fitHeight
        // Two bars that won't fit side by side go onto a second line, as a
        // lesson's staff does, rather than off the edge.
        wrapToFit
        className="size-full px-2 pt-2"
      />
    </div>
  );
}
