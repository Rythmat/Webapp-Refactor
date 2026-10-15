/* eslint-disable react/jsx-sort-props */
/**
 * Make a sound from recordings: upload a sample (or pick one uploaded
 * before), say the note it was recorded at, and the layer plays every note
 * from it — the sampler repitches. Add more samples across the range for a
 * truer sound high and low. Saved as a sampled instrument any layer, part
 * or (later) lesson can name: 'sample:<id>'. Opened on a sound already made,
 * it edits that sound: add samples, change their notes, save in place.
 *
 * Recordings go to their own folder (samples/instruments/uploads), apart from
 * the drum hits, and arrive with the silence before the note trimmed off.
 */

import { Loader2, Play, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as Tone from 'tone';
import { Button } from '@/components/ui/button';
import { type BandInstrument, bandIdFrom } from '@/curriculum/engine/band/band';
import {
  listSampleInstruments,
  rememberSampleInstrument,
  type SampleInstrumentFile,
} from '@/daw/instruments/sampleInstruments';
import { listUploadedSamples, uploadSample } from '../drumGrooves/devFiles';
import { SAMPLE_PREFIX } from './bandSounds';

/** C1 … C7, every semitone, as the sampler names notes. */
const NOTES = Array.from({ length: 12 * 6 + 1 }, (_, i) =>
  Tone.Frequency(24 + i, 'midi').toNote(),
);

interface Row {
  note: string;
  url: string | null;
  uploading: boolean;
}

interface Props {
  instrument: BandInstrument;
  /** The sound to edit; a new one when left out. */
  editing?: SampleInstrumentFile;
  /** The sound to give the layer: 'sample:<id>'. */
  onMade: (sound: string) => void;
  onCancel: () => void;
}

/** Low to high, the way the range reads. */
const byPitch = (a: Row, b: Row) =>
  Tone.Frequency(a.note).toMidi() - Tone.Frequency(b.note).toMidi();

/** Hears one recording as it was made. */
async function audition(url: string) {
  await Tone.start();
  const player = new Tone.Player(url).toDestination();
  await Tone.loaded();
  player.onstop = () => player.dispose();
  player.start();
}

async function saveSampleInstrument(file: SampleInstrumentFile) {
  const res = await fetch(`/__dev/sample-instruments/${file.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(file),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  rememberSampleInstrument(file);
}

export const SampleInstrumentMaker = ({
  instrument,
  editing,
  onMade,
  onCancel,
}: Props) => {
  const [name, setName] = useState(editing?.name ?? '');
  const [rows, setRows] = useState<Row[]>(() =>
    editing
      ? Object.entries(editing.samples)
          .map(([note, url]) => ({ note, url, uploading: false }))
          .sort(byPitch)
      : [{ note: 'C4', url: null, uploading: false }],
  );
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void listUploadedSamples('instrument-samples')
      .then(setUploaded)
      .catch(() => setUploaded([]));
  }, []);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const upload = async (i: number, file: File) => {
    setRow(i, { uploading: true });
    setError(null);
    try {
      const url = await uploadSample(file, 'instrument-samples');
      setRow(i, { url, uploading: false });
      setUploaded((u) => [...new Set([...u, url])]);
    } catch (err) {
      setRow(i, { uploading: false });
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const ready = rows.filter((r) => r.url);
  const notesUsed = new Set(ready.map((r) => r.note));
  const canSave =
    name.trim() && ready.length > 0 && notesUsed.size === ready.length;

  const save = async () => {
    let id = editing?.id;
    if (!id) {
      const base = bandIdFrom(name.trim());
      const taken = new Set(listSampleInstruments().map((f) => f.id));
      id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    }
    const file: SampleInstrumentFile = {
      ...editing,
      id,
      name: name.trim(),
      family: editing?.family ?? instrument,
      samples: Object.fromEntries(
        [...ready].sort(byPitch).map((r) => [r.note, r.url!]),
      ),
    };
    setSaving(true);
    try {
      await saveSampleInstrument(file);
      onMade(`${SAMPLE_PREFIX}${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const control =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm';
  const fileName = (url: string) => decodeURIComponent(url.split('/').pop()!);

  return (
    <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
      <p className="text-xs text-muted-foreground">
        {editing ? (
          <>
            Editing <strong className="text-white">{editing.name}</strong>: add
            samples, change the note each was recorded at, or remove one, then
            save. Every layer that plays this sound hears the change.
          </>
        ) : (
          <>
            A sound from your own recordings. One sample plays every note; add
            more across the range and each note plays from the nearest one.
          </>
        )}{' '}
        Record one note per file, starting right on the note.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sound name, e.g. Abuela's upright piano"
        className={`${control} w-80`}
        aria-label="Sound name"
      />
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={row.note}
            onChange={(e) => setRow(i, { note: e.target.value })}
            className={control}
            aria-label="Recorded at"
          >
            {NOTES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <label className={`${control} cursor-pointer`}>
            {row.uploading ? (
              <Loader2 className="inline size-3.5 animate-spin" />
            ) : (
              'Upload a recording…'
            )}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(i, f);
              }}
            />
          </label>
          <select
            value={row.url ?? ''}
            onChange={(e) => setRow(i, { url: e.target.value || null })}
            className={`${control} max-w-72`}
            aria-label="Or an earlier upload"
          >
            <option value="">or an earlier upload…</option>
            {uploaded.map((u) => (
              <option key={u} value={u}>
                {fileName(u)}
              </option>
            ))}
          </select>
          {row.url && (
            <>
              <button
                type="button"
                aria-label={`Hear the ${row.note} sample`}
                title="Hear it"
                className="text-muted-foreground hover:text-white"
                onClick={() => void audition(row.url!)}
              >
                <Play className="size-3.5" />
              </button>
              <span className="truncate text-xs text-emerald-300/90">
                {fileName(row.url)}
              </span>
            </>
          )}
          {rows.length > 1 && (
            <button
              type="button"
              aria-label="Remove this sample"
              className="text-muted-foreground hover:text-white"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      {notesUsed.size < ready.length && (
        <p className="text-xs text-amber-300">
          Two samples are set to the same note.
        </p>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setRows((rs) => {
              // A fourth above the highest so far: the next gap to fill.
              const top = Math.max(
                55,
                ...rs.map((r) => Tone.Frequency(r.note).toMidi()),
              );
              const note = NOTES[Math.min(top + 5, 96) - 24];
              return [...rs, { note, url: null, uploading: false }];
            })
          }
        >
          <Plus /> Another sample
        </Button>
        <Button
          size="sm"
          onClick={() => void save()}
          disabled={!canSave || saving}
        >
          {saving && <Loader2 className="animate-spin" />}{' '}
          {editing ? 'Save the sound' : 'Make the sound'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
