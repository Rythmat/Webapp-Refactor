// ── Chords in this song ────────────────────────────────────────────────────
// On guitar, above a song's chart: every chord the song uses as a guitar box,
// in the order the song first plays it. A box plays its chord when clicked.
// Open chords first, then barre and Drop 2 grips near them
// (lib/guitar/songChords).

import { useId } from 'react';
import { ChordBox } from '@/components/guitar';
import { chordRgbFor } from '@/curriculum/songLibrary/chordColor';
import type { Song } from '@/curriculum/types/songLibrary';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { GuitarLabelToggle } from './GuitarLabelToggle';
import { songGuitarChords } from './songGuitarShapes';
import { useSongGuitarHear } from './useSongGuitarHear';

/** Teal, as the chart's chord popup falls back to. */
const FALLBACK_COLOR = 'rgb(126, 207, 207)';

export default function SongGuitarChords({ song }: { song: Song }) {
  const headingId = useId();
  const mirrored = useInstrumentStore((s) => s.leftHanded);
  const hear = useSongGuitarHear();
  const chords = songGuitarChords(song).filter((c) => c.box !== null);
  if (chords.length === 0) return null;

  return (
    <section
      data-song-guitar-chords
      aria-labelledby={headingId}
      className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] px-3 pb-3 pt-2"
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
        <h3
          id={headingId}
          className="whitespace-nowrap text-sm font-semibold text-white/85"
        >
          Chords in this song
        </h3>
        <span className="text-xs text-white/45">{chords.length}</span>
        <GuitarLabelToggle className="ml-auto" />
      </div>
      {/* The padding keeps the first and last box clear of the edge fades. */}
      <ul
        aria-label="Chords in this song"
        className="flex snap-x scroll-px-5 gap-3 overflow-x-auto overflow-y-hidden px-5 pb-1 [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-12px),transparent)] motion-safe:scroll-smooth [scrollbar-width:none]"
      >
        {chords.map(({ name, degree, box }) => {
          const rgb = chordRgbFor(name, song.keyRoot, song.mode);
          return (
            <li
              key={name}
              data-song-chord={name}
              className="flex shrink-0 snap-start flex-col items-center gap-1"
            >
              <ChordBox
                variant="lesson"
                size="sm"
                shape={box!.shape}
                name={name}
                hybridLabel={degree}
                rootPc={box!.chord.rootPc}
                keyColor={rgb ? `rgb(${rgb.join(', ')})` : FALLBACK_COLOR}
                mirrored={mirrored}
                toneLabels={box!.toneLabels}
                onHear={() => hear(box!.shape.frets)}
              />
              {box!.bassNote && (
                <span className="text-xs text-white/55">
                  Bass: {box!.bassNote}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
