import { useCallback, useMemo, useState } from 'react';
import { sectionMeters } from '@/curriculum/songLibrary/performance';
import type { Song, SongSection } from '@/curriculum/types/songLibrary';
import {
  DURATIONS,
  type DurationChoice,
  type NoteLayer,
} from '@/daw/components/Score/noteEditor';
import type { NoteTools } from '@/daw/components/Score/notePalettes';
import {
  beatAt,
  editBarRhythm,
  eventStarts,
  rhythmOf,
  setEventLength,
  toggleDot,
  togglePlain,
  toggleRest,
  toggleStem,
  toggleTie,
  VALUE_QUARTERS,
  valueOfQuarters,
  type Meter,
} from '@/lib/chartEditor/rhythm';
import type { BarRef } from '@/lib/chartEditor/selection';

/**
 * The song chart's rhythm, edited with the Studio Score's palettes (owner,
 * 2026-11-12): pick a slash, then a length from Rhythmic or Rests, the dot,
 * the tie, or a chord symbol over it. The same keys as the Score: 2–7 the
 * lengths, `.` the dot, T the tie, X the stem's way, K a chord, 0 (or
 * Delete) a rest, the arrows the next slash; and / a beat as a standard
 * slash or rhythm notation.
 *
 * The edits themselves are lib/chartEditor/rhythm's, pure; this holds the
 * picked slash and speaks the palettes' `NoteTools`.
 */

export type SlashRef = BarRef & { index: number };

const DEFAULT_METER: Meter = [4, 4];
const EPS = 1e-6;

export interface ChartRhythm {
  slash: SlashRef | null;
  pick: (ref: BarRef, index: number) => void;
  clear: () => void;
  /** The palettes' note tools, for the picked slash. */
  tools: NoteTools;
  /** The chart's keys, when a slash is picked. True when one was used. */
  onKey: (event: React.KeyboardEvent) => boolean;
}

export function useChartRhythm({
  song,
  sections,
  apply,
  onChordAt,
}: {
  song: Song;
  sections: SongSection[];
  /** Write new sections as one undo step under this name. */
  apply: (next: SongSection[], label: string) => void;
  /** A chord on this beat: the one there, or a new one. */
  onChordAt: (sectionIdx: number, barIdx: number, beat: number) => void;
}): ChartRhythm {
  const [picked, setPicked] = useState<SlashRef | null>(null);
  const [layer, setLayer] = useState<NoteLayer>('slashes');
  const meters = useMemo(() => sectionMeters(song), [song]);
  const meterOf = useCallback(
    (si: number, bi: number): Meter =>
      meters[si]?.[bi] ?? song.timeSignature ?? DEFAULT_METER,
    [meters, song.timeSignature],
  );

  // A pick outliving its slash (the bar went, the rhythm got shorter)
  // picks nothing.
  const bar = picked ? sections[picked.section]?.bars[picked.bar] : undefined;
  const meter = picked ? meterOf(picked.section, picked.bar) : DEFAULT_METER;
  const events = bar ? rhythmOf(bar, meter) : [];
  const event = picked ? events[picked.index] : undefined;
  const slash = event ? picked : null;

  const pick = useCallback(
    (ref: BarRef, index: number) => {
      const b = sections[ref.section]?.bars[ref.bar];
      const e = b ? rhythmOf(b, meterOf(ref.section, ref.bar))[index] : null;
      if (!e) return;
      setPicked({ ...ref, index });
      // The live palette is the one that wrote it: Rests for a rest.
      setLayer(e.rest ? 'rests' : 'slashes');
    },
    [sections, meterOf],
  );

  const edit = useCallback(
    (label: string, change: Parameters<typeof editBarRhythm>[4]) => {
      if (!slash) return;
      apply(
        editBarRhythm(sections, slash.section, slash.bar, meter, change),
        label,
      );
    },
    [apply, meter, sections, slash],
  );

  const onDuration = useCallback(
    (choice: DurationChoice, into: NoteLayer) => {
      const value = valueOfQuarters(choice.quarters);
      if (!slash || !value) return;
      const rest = into === 'rests';
      edit(`${choice.name} ${rest ? 'rest' : 'slash'}`, (evs) => {
        const next = setEventLength(evs, slash.index, value, false, meter);
        return !!next[slash.index]?.rest === rest
          ? next
          : toggleRest(next, slash.index);
      });
    },
    [edit, meter, slash],
  );

  const addChord = useCallback(() => {
    if (!slash) return;
    const beat = beatAt(eventStarts(events)[slash.index] ?? 0, meter);
    onChordAt(slash.section, slash.bar, beat);
  }, [events, meter, onChordAt, slash]);

  // A standard slash has no written length to light.
  const currentDuration =
    event && !event.plain && !!event.rest === (layer === 'rests')
      ? (DURATIONS.find(
          (d) => Math.abs(d.quarters - VALUE_QUARTERS[event.value]) < EPS,
        ) ?? null)
      : null;

  const tools: NoteTools = {
    hasNotes: !!event,
    layer,
    onLayer: (next) => setLayer(next === 'rests' ? 'rests' : 'slashes'),
    currentDuration,
    dotted: !!event?.dot,
    activeArticulations: new Set(),
    slurred: false,
    canTie: !!event && !event.rest,
    onTie: () => slash && edit('Tie', (evs) => toggleTie(evs, slash.index)),
    canAddChord: !!event,
    onAddChord: addChord,
    currentAccidental: null,
    onAccidental: () => undefined,
    onDuration,
    onToggleDot: () =>
      slash && edit('Dot', (evs) => toggleDot(evs, slash.index, meter)),
    onArticulation: () => undefined,
    onSlur: () => undefined,
    onFlipStem: () =>
      slash &&
      edit(event?.stem === 'down' ? 'Stem up' : 'Stem down', (evs) =>
        toggleStem(evs, slash.index, meter),
      ),
    stemDown: event?.stem === 'down',
    onTogglePlain: () =>
      slash &&
      edit(event?.plain ? 'Rhythm notation' : 'Standard slash', (evs) =>
        togglePlain(evs, slash.index, meter),
      ),
    plainSlash: !!event?.plain,
  };

  /** The slash before or after, across bars and sections. */
  const step = (dir: -1 | 1) => {
    if (!slash) return;
    const nextIndex = slash.index + dir;
    if (nextIndex >= 0 && nextIndex < events.length) {
      pick(slash, nextIndex);
      return;
    }
    let si = slash.section;
    let bi = slash.bar + dir;
    while (si >= 0 && si < sections.length) {
      const bars = sections[si].bars;
      if (bi >= 0 && bi < bars.length) {
        const count = rhythmOf(bars[bi], meterOf(si, bi)).length;
        pick({ section: si, bar: bi }, dir > 0 ? 0 : count - 1);
        return;
      }
      si += dir;
      bi = dir > 0 ? 0 : (sections[si]?.bars.length ?? 0) - 1;
    }
  };

  const onKey = (e: React.KeyboardEvent): boolean => {
    if (!slash || e.metaKey || e.ctrlKey || e.altKey) return false;
    const target = e.target as HTMLElement | null;
    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
    )
      return false;
    const choice = DURATIONS.find((d) => d.key === e.key);
    const key = e.key.toLowerCase();
    if (choice) onDuration(choice, layer);
    else if (key === '.') tools.onToggleDot(layer);
    else if (key === 't') tools.onTie();
    else if (key === 'x') tools.onFlipStem?.();
    else if (key === '/') tools.onTogglePlain?.();
    else if (key === 'k') addChord();
    else if (key === '0' || key === 'delete' || key === 'backspace') {
      if (key === '0' || !event?.rest)
        edit(event?.rest ? 'Slash' : 'Rest', (evs) =>
          toggleRest(evs, slash.index),
        );
    } else if (key === 'arrowright') step(1);
    else if (key === 'arrowleft') step(-1);
    else if (key === 'escape') {
      setPicked(null);
      return false;
    } else return false;
    e.preventDefault();
    return true;
  };

  return {
    slash,
    pick,
    clear: () => setPicked(null),
    tools,
    onKey,
  };
}
