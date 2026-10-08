import type { MidiNoteEvent } from '@prism/engine';
import {
  barTicks,
  buildDesignedDrums,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import { loadLiveGroove } from '@/curriculum/engine/drumGrooves/registry';
import { applySwing } from '@/curriculum/engine/genreGeneration/swing';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { importMidiFile } from '@/daw/midi/MidiFileIO';

/** Studio's tick resolution (ticks per quarter note). */
const PPQ = 480;

/**
 * Fetch a Grooves-library drum groove and return its notes rescaled from the
 * file's own PPQ to Studio's 480. The one loader for grooves: the Grooves
 * browser's preview and Add, practice tracks and demo drums all use it.
 * Resolves to null when the groove is unknown or can't be fetched or parsed.
 */
/**
 * One pass of a designed groove as Studio clip events: its played feel, pad
 * trims, humanize and its own swing (a Studio clip has no lesson swing to
 * share).
 */
export function designedGrooveEvents(groove: DrumGroove): MidiNoteEvent[] {
  const notes = applySwing(
    buildDesignedDrums(groove, groove.bars, barTicks(groove.timeSignature)),
    groove.swing,
  );
  return notes.map((n) => ({
    note: n.note,
    velocity: n.velocity,
    startTick: n.onset,
    durationTicks: n.duration,
    channel: 9,
  }));
}

export async function loadGrooveEvents(
  grooveId: string,
): Promise<MidiNoteEvent[] | null> {
  // A groove published in the console's Drum Grooves designer wins over the
  // .mid it was imported from (or adds one the Studio never had).
  const designed = await loadLiveGroove(grooveId);
  if (designed) return designedGrooveEvents(designed);

  const groove = GROOVES.find((g) => g.id === grooveId);
  if (!groove) return null;

  try {
    const resp = await fetch(groove.url);
    if (!resp.ok) return null;
    const sequences = importMidiFile(await resp.arrayBuffer());
    if (sequences.length === 0) return null;

    const { ticksPerQuarterNote: ppq, events } = sequences[0];
    return events.map((evt) => ({
      ...evt,
      startTick: Math.round((evt.startTick / ppq) * PPQ),
      durationTicks: Math.round((evt.durationTicks / ppq) * PPQ),
    }));
  } catch (err) {
    console.error(`Failed to load groove "${grooveId}":`, err);
    return null;
  }
}
