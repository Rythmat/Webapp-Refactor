import type { MidiNoteEvent } from '@prism/engine';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { importMidiFile } from '@/daw/midi/MidiFileIO';

/** Studio's tick resolution (ticks per quarter note). */
const PPQ = 480;

/**
 * Fetch a Grooves-library drum groove and return its notes rescaled from the
 * file's own PPQ to Studio's 480 — the pipeline the Grooves browser runs when a
 * groove is dropped onto a Drums track (`doLoadGroove` in GroovesBrowser.tsx).
 * Resolves to null when the groove is unknown or can't be fetched or parsed.
 */
export async function loadGrooveEvents(
  grooveId: string,
): Promise<MidiNoteEvent[] | null> {
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
