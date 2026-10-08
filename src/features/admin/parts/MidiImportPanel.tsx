/* eslint-disable react/jsx-sort-props */
import { Upload } from 'lucide-react';
import { useRef, useState, type FC } from 'react';
import type { MidiSequence } from '@prism/engine';
import { Button } from '@/components/ui/button';
import {
  guessInstrument,
  notesFromSequence,
} from '@/curriculum/engine/parts/convert';
import {
  barsSpanned,
  blankPart,
  PART_INSTRUMENTS,
  type InstrumentPart,
  type PartInstrument,
} from '@/curriculum/engine/parts/part';
import { importMidiFile } from '@/daw/midi/MidiFileIO';

interface TrackChoice {
  seq: MidiSequence;
  instrument: PartInstrument;
}

/**
 * A .mid file's tracks, each a candidate part: pick the instrument (guessed
 * from the track name, channel and register) and open it in the editor. The
 * key is not guessed — set "Written in" in the editor before transposing.
 */
export const MidiImportPanel: FC<{
  makeId: (name: string) => string;
  onPick: (part: InstrumentPart) => void;
}> = ({ makeId, onPick }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [tracks, setTracks] = useState<TrackChoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setError(null);
    try {
      const seqs = importMidiFile(await file.arrayBuffer());
      if (seqs.length === 0) throw new Error('No notes in that file.');
      setFileName(file.name);
      setTracks(seqs.map((seq) => ({ seq, instrument: guessInstrument(seq) })));
    } catch (err) {
      setTracks([]);
      setError(
        err instanceof Error ? err.message : 'That file could not be read.',
      );
    }
  };

  const open = ({ seq, instrument }: TrackChoice) => {
    const notes = notesFromSequence(seq);
    const stem = fileName.replace(/\.midi?$/i, '');
    const name = seq.trackName ? `${stem} — ${seq.trackName}` : stem;
    const base = blankPart(makeId(name), name, instrument);
    onPick({
      ...base,
      bars: Math.min(16, barsSpanned(notes)),
      notes,
      source: {
        kind: 'midi',
        fileName,
        ...(seq.trackName ? { track: seq.trackName } : {}),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
        >
          <Upload /> Choose a MIDI file
        </Button>
        {fileName && (
          <span className="text-sm text-muted-foreground">{fileName}</span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".mid,.midi,audio/midi"
          onChange={onFile}
          className="hidden"
        />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {tracks.map((t, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-md border border-white/[0.08] px-3 py-2 text-sm"
        >
          <span className="min-w-0 flex-1 truncate">
            {t.seq.trackName || `Track ${i + 1}`}
            <span className="ml-2 text-xs text-muted-foreground">
              {t.seq.events.length} notes ·{' '}
              {barsSpanned(notesFromSequence(t.seq))} bars
            </span>
          </span>
          <select
            value={t.instrument}
            onChange={(e) =>
              setTracks((ts) =>
                ts.map((x, j) =>
                  j === i
                    ? { ...x, instrument: e.target.value as PartInstrument }
                    : x,
                ),
              )
            }
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1"
            aria-label="Instrument"
          >
            {PART_INSTRUMENTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => open(t)}>
            Open as part
          </Button>
        </div>
      ))}
    </div>
  );
};
