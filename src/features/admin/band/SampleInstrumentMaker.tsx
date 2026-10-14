/* eslint-disable react/jsx-sort-props */
/**
 * Make a sound from recordings: upload a sample (or pick one uploaded
 * before), say the note it was recorded at, and the layer plays every note
 * from it — the sampler repitches. Add more samples across the range for a
 * truer sound high and low. Saved as a sampled instrument any layer, part
 * or (later) lesson can name: 'sample:<id>'.
 */

import { Loader2, Plus, X } from 'lucide-react';
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
  /** The sound to give the layer: 'sample:<id>'. */
  onMade: (sound: string) => void;
  onCancel: () => void;
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
  onMade,
  onCancel,
}: Props) => {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[]>([
    { note: 'C4', url: null, uploading: false },
  ]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void listUploadedSamples()
      .then(setUploaded)
      .catch(() => setUploaded([]));
  }, []);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const upload = async (i: number, file: File) => {
    setRow(i, { uploading: true });
    setError(null);
    try {
      const url = await uploadSample(file);
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
    const base = bandIdFrom(name.trim());
    const taken = new Set(listSampleInstruments().map((f) => f.id));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    const file: SampleInstrumentFile = {
      id,
      name: name.trim(),
      family: instrument,
      samples: Object.fromEntries(ready.map((r) => [r.note, r.url!])),
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
        A sound from your own recordings. One sample plays every note; add more
        across the range and each note plays from the nearest one.
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
            <span className="truncate text-xs text-emerald-300/90">
              {fileName(row.url)}
            </span>
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
            setRows((rs) => [
              ...rs,
              { note: 'C5', url: null, uploading: false },
            ])
          }
        >
          <Plus /> Another sample
        </Button>
        <Button
          size="sm"
          onClick={() => void save()}
          disabled={!canSave || saving}
        >
          {saving && <Loader2 className="animate-spin" />} Make the sound
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
