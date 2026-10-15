/**
 * The items a player can own, from every library at once, with what the
 * Players pages show of each: its name, genre, kind and where it is edited.
 */

import { useMemo } from 'react';
import { AdminRoutes } from '@/constants/routes';
import type { BandInstrument } from '@/curriculum/engine/band/band';
import type { PlayerItem } from '@/curriculum/engine/players/player';
import { useBassLineList } from '../bassLines/bassLineSession';
import { useCompingList } from '../chordComping/compingSession';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { usePartList } from '../parts/partFiles';

export interface ItemInfo {
  item: PlayerItem;
  name: string;
  /** What kind of thing it is, for people: 'Drum groove'. */
  kindLabel: string;
  genre?: string;
  /** The instrument that plays it. */
  instrument: BandInstrument;
  status: 'draft' | 'live';
  href: string;
}

export const KIND_LABEL: Record<PlayerItem['kind'], string> = {
  groove: 'Drum groove',
  bassLine: 'Bass line',
  comping: 'Comping pattern',
  part: 'Part',
};

const PART_INSTRUMENT: Record<string, BandInstrument> = {
  piano: 'keys',
  bass: 'bass',
  guitar: 'guitar',
  drums: 'drums',
};

/** Every item in every library, by `${kind}:${id}`. */
export function useAllItems(): Map<string, ItemInfo> {
  const grooves = useGrooveList();
  const lines = useBassLineList();
  const patterns = useCompingList();
  const parts = usePartList();
  return useMemo(() => {
    const out = new Map<string, ItemInfo>();
    const put = (info: ItemInfo) =>
      out.set(`${info.item.kind}:${info.item.id}`, info);
    const genreOfGroove = new Map(grooves.map((g) => [g.id, g.genre]));
    for (const g of grooves)
      put({
        item: { kind: 'groove', id: g.id },
        name: g.name,
        kindLabel: KIND_LABEL.groove,
        genre: g.genre,
        instrument: 'drums',
        status: g.status,
        href: AdminRoutes.drumGroove({ id: g.id }),
      });
    for (const l of lines)
      put({
        item: { kind: 'bassLine', id: l.id },
        name: l.name,
        kindLabel: KIND_LABEL.bassLine,
        genre: l.grooves.map((id) => genreOfGroove.get(id)).find(Boolean),
        instrument: 'bass',
        status: l.status,
        href: AdminRoutes.bassLine({ id: l.id }),
      });
    for (const c of patterns)
      put({
        item: { kind: 'comping', id: c.id },
        name: c.name,
        kindLabel: KIND_LABEL.comping,
        genre: c.grooves.map((id) => genreOfGroove.get(id)).find(Boolean),
        instrument: 'keys',
        status: c.status,
        href: AdminRoutes.chordCompingPattern({ id: c.id }),
      });
    for (const p of parts)
      put({
        item: { kind: 'part', id: p.id },
        name: p.name,
        kindLabel: KIND_LABEL.part,
        genre: p.genre,
        instrument: PART_INSTRUMENT[p.instrument] ?? 'keys',
        status: p.status,
        href: AdminRoutes.part({ id: p.id }),
      });
    return out;
  }, [grooves, lines, patterns, parts]);
}

export const itemKey = (item: PlayerItem) => `${item.kind}:${item.id}`;
