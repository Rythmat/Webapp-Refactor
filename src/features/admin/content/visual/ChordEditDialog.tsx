/* eslint-disable react/jsx-sort-props */
import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, type FC } from 'react';
import {
  ChordDiagramCard,
  chordRgbFor,
} from '@/components/songLibrary/ChordDiagramCard';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import type { ChordHit, SongMode } from '@/curriculum/types/songLibrary';
import { InlineNumber, InlineText } from './Editable';

/**
 * The chord popup a student sees, with its fields made editable.
 *
 * Same card, same keyboard, same colour resolution — the header's static title
 * and degree are swapped for inline inputs and a strip of beat/duration
 * controls is added below. The keyboard re-resolves as the admin types, so a
 * chord name that the parser cannot read is visible immediately (empty
 * keyboard, "doesn't resolve" note) rather than at publish time.
 */
export const ChordEditDialog: FC<{
  hit: ChordHit;
  keyRoot: number;
  mode: SongMode;
  /** Beats in a bar, from the song's time signature — bounds the beat field. */
  beatsPerBar: number;
  onChange: (hit: ChordHit) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ hit, keyRoot, mode, beatsPerBar, onChange, onDelete, onClose }) => {
  const midi = useMemo(() => chordNameToMidi(hit.chordName), [hit.chordName]);
  const rgb = useMemo(
    () => chordRgbFor(hit.chordName, keyRoot, mode),
    [hit.chordName, keyRoot, mode],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patch = (next: Partial<ChordHit>) => onChange({ ...hit, ...next });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <ChordDiagramCard
          midi={midi}
          rgb={rgb}
          header={
            <>
              <InlineText
                value={hit.chordName}
                onChange={(value) => patch({ chordName: value })}
                placeholder="Chord name"
                ariaLabel="Chord name"
                className="block text-xl font-bold text-white"
              />
              <InlineText
                value={hit.degree}
                onChange={(value) => patch({ degree: value })}
                placeholder="Degree, e.g. 1 maj"
                ariaLabel="Chord degree"
                className="block text-sm text-white/40"
              />
              <p className="mt-1 text-[10px] text-white/25">
                Degree is the source of truth; the name is display only.
              </p>
            </>
          }
          footer={
            <div className="border-t border-white/[0.06] px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/30">
                    Beat
                  </span>
                  <InlineNumber
                    value={hit.beat}
                    onChange={(value) => patch({ beat: value ?? 1 })}
                    min={1}
                    max={beatsPerBar + 0.99}
                    step={0.5}
                    ariaLabel="Beat position"
                    className="font-medium text-white"
                  />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/30">
                    Beats held
                  </span>
                  <InlineNumber
                    value={hit.duration}
                    onChange={(value) => patch({ duration: value ?? 1 })}
                    min={0.5}
                    step={0.5}
                    ariaLabel="Duration in beats"
                    className="font-medium text-white"
                  />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/30">
                    Voicing
                  </span>
                  <InlineText
                    value={hit.voicingHint}
                    onChange={(value) =>
                      patch({ voicingHint: value.trim() || undefined })
                    }
                    placeholder="e.g. 3-5-1"
                    ariaLabel="Voicing hint"
                    className="text-white"
                  />
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-red-400"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Remove chord
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white/10 px-3 py-1 text-xs text-white/80 transition-colors hover:bg-white/20"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
};
