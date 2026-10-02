import { useMemo } from 'react';
import { useContentExport } from '@/hooks/data/admin/useContentExport';
import { chordFrequency } from './chordPicker';

/**
 * The library's progressions as the server holds them now, live or
 * proposed: what the chord editors check a progression against (the
 * duplicate rule), count chords by (the picker's "most used") and place a
 * progression among (its branch in Tesseract).
 *
 * From the console's shared export loader, so it costs no request where the
 * Table or a picker has already loaded the rows. Empty where the server
 * does not serve progressions; the server's own check still holds there.
 */

export interface CorpusEntry {
  id: number;
  chords: readonly string[];
}

export interface ProgressionCorpus {
  entries: readonly CorpusEntry[];
  /** Steps of the library's progressions that are each chord. */
  frequency: ReadonlyMap<string, number>;
}

const EMPTY: ProgressionCorpus = { entries: [], frequency: new Map() };

const chordsOf = (body: Record<string, unknown> | null | undefined) =>
  Array.isArray(body?.chords)
    ? body.chords.filter((chord): chord is string => typeof chord === 'string')
    : null;

export function useProgressionCorpus(): ProgressionCorpus {
  const { data } = useContentExport('chord_progression');
  return useMemo(() => {
    if (!data) return EMPTY;
    const entries: CorpusEntry[] = [];
    for (const row of data.rows) {
      for (const body of [row.body, row.pendingBody]) {
        const chords = chordsOf(body);
        const id = Number(body?.id ?? row.slug);
        if (chords && Number.isInteger(id)) entries.push({ id, chords });
      }
    }
    // The live bodies alone count chords: a proposal is not the library yet.
    const live = data.rows.flatMap((row) => {
      const chords = chordsOf(row.body);
      return chords ? [{ chords }] : [];
    });
    return { entries, frequency: chordFrequency(live) };
  }, [data]);
}
