/**
 * A layer's item, edited in place: the editor it was designed in — the drum
 * groove designer, the Bass Lines roll, the Chord Comping grid, the Parts
 * piano roll — opened inside the band. An edit there is an edit to the item,
 * heard in every band and lesson that plays it; Duplicate makes this band
 * its own copy and points the layer at it.
 */

import { type ComponentProps, useMemo } from 'react';
import type { BandSource } from '@/curriculum/engine/band/band';
import { uniquePartId } from '@/curriculum/engine/parts/part';
import { createBassLine } from '../bassLines/AdminBassLinesPage';
import { BassLineEditor } from '../bassLines/BassLineEditor';
import { useBassLineList } from '../bassLines/bassLineSession';
import type { ChartChoice } from '../chart/chartChoice';
import { createComping } from '../chordComping/AdminChordCompingsPage';
import { ChordCompingEditor } from '../chordComping/ChordCompingEditor';
import { useCompingList } from '../chordComping/compingSession';
import { createGroove } from '../drumGrooves/AdminDrumGroovesPage';
import { DrumGrooveEditor } from '../drumGrooves/DrumGrooveEditor';
import { rememberSaved, useGrooveList } from '../drumGrooves/grooveSession';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { PartEditor } from '../parts/PartEditor';
import { usePartList } from '../parts/partFiles';

interface Props {
  source: BandSource;
  /** Point the layer at another item (the copy Duplicate made). */
  onReplace: (source: BandSource) => void;
  /** A part edited here plays with the band (PartEditor's `band`). */
  band?: ComponentProps<typeof PartEditor>['band'];
  /** The band's chart: a line or comping opens on it. */
  chart?: ChartChoice;
}

export const LayerItemEditor = ({ source, onReplace, band, chart }: Props) => {
  const store = useInstrumentStore();
  const grooves = useGrooveList();
  const lines = useBassLineList();
  const patterns = useCompingList();
  const parts = usePartList();
  const takenParts = useMemo(() => new Set(parts.map((p) => p.id)), [parts]);

  const missing = (
    <p className="text-sm text-muted-foreground">
      Its item, <span className="tabular-nums">{source.id}</span>, isn&rsquo;t
      in the library any more. Pick another above.
    </p>
  );

  switch (source.kind) {
    case 'groove': {
      const groove = grooves.find((g) => g.id === source.id);
      if (!groove) return missing;
      return (
        <DrumGrooveEditor
          key={groove.id}
          groove={groove}
          onSaved={rememberSaved}
          onDuplicate={async (from) => {
            const copy = await createGroove(
              `${from.name} copy`,
              grooves,
              (g) => store.save('drum_groove', g),
              from,
            );
            if (copy) onReplace({ kind: 'groove', id: copy.id });
          }}
        />
      );
    }
    case 'bassLine': {
      const line = lines.find((l) => l.id === source.id);
      if (!line) return missing;
      return (
        <BassLineEditor
          key={line.id}
          line={line}
          chart={chart}
          onDuplicate={async (from) => {
            const copy = await createBassLine(`${from.name} copy`, lines, from);
            if (copy) onReplace({ kind: 'bassLine', id: copy.id });
          }}
        />
      );
    }
    case 'comping': {
      const pattern = patterns.find((c) => c.id === source.id);
      if (!pattern) return missing;
      return (
        <ChordCompingEditor
          key={pattern.id}
          pattern={pattern}
          chart={chart}
          onDuplicate={async (from) => {
            const copy = await createComping(
              `${from.name} copy`,
              patterns,
              from,
            );
            if (copy) onReplace({ kind: 'comping', id: copy.id });
          }}
        />
      );
    }
    case 'part': {
      const part = parts.find((p) => p.id === source.id);
      if (!part) return missing;
      return (
        <PartEditor
          key={part.id}
          part={part}
          band={
            band && {
              ...band,
              chart,
              // "Make it this band's": the part as the band plays it, filed
              // as a new part this layer plays (and its player keeps).
              adopt: async (made) => {
                const copy = {
                  ...made,
                  id: uniquePartId(made.name, takenParts),
                };
                await store.save('instrument_part', copy);
                onReplace({ kind: 'part', id: copy.id });
              },
            }
          }
          onDuplicate={async (from) => {
            const name = `${from.name} copy`;
            const copy = {
              ...from,
              id: uniquePartId(name, takenParts),
              name,
              status: 'draft' as const,
            };
            await store.save('instrument_part', copy);
            onReplace({ kind: 'part', id: copy.id });
          }}
        />
      );
    }
  }
};
