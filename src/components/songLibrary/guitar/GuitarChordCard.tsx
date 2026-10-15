// ── A song chord on guitar ─────────────────────────────────────────────────
// What a student sees on guitar when they click a chord in a song's chart:
// the chord's guitar box (the same one the page's strip shows), "Hear it",
// and Fingers or Chord tones on the dots. A slash chord whose box doesn't
// play its bass names the bass under it.

import { ChordBox } from '@/components/guitar';
import type { Song } from '@/curriculum/types/songLibrary';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { GuitarLabelToggle } from './GuitarLabelToggle';
import { songGuitarBox } from './songGuitarShapes';
import { useSongGuitarHear } from './useSongGuitarHear';

export interface GuitarChordCardProps {
  song: Song;
  /** The chart's chord name. */
  chordName: string;
  /** The name as the chart writes it in the reader's notation. */
  title: string;
  /** Its degree, shown when the title is the letter name. */
  degree?: string;
  keyColor: string;
}

export default function GuitarChordCard({
  song,
  chordName,
  title,
  degree,
  keyColor,
}: GuitarChordCardProps) {
  const box = songGuitarBox(song, chordName);
  const mirrored = useInstrumentStore((s) => s.leftHanded);
  const hear = useSongGuitarHear();
  return (
    <div
      data-testid="guitar-chord-card"
      className="w-full max-w-md overflow-hidden rounded-2xl"
      style={{
        background: 'var(--color-surface, #1a1a1a)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {degree && <p className="text-sm text-white/45">{degree}</p>}
        </div>
        {box && <GuitarLabelToggle />}
      </div>
      <div className="flex flex-col items-center gap-2 px-5 pb-5">
        {box ? (
          <>
            <ChordBox
              shape={box.shape}
              name={title}
              rootPc={box.chord.rootPc}
              keyColor={keyColor}
              mirrored={mirrored}
              toneLabels={box.toneLabels}
              onHear={() => hear(box.shape.frets)}
            />
            {box.bassNote && (
              <p
                className="text-sm text-white/55"
                title={`Bass note ${box.bassNote}: the bass plays it, or add it on your lowest string.`}
              >
                Bass: {box.bassNote}
              </p>
            )}
          </>
        ) : (
          <p className="py-6 text-sm text-white/45">
            No guitar box for this chord yet.
          </p>
        )}
      </div>
    </div>
  );
}
