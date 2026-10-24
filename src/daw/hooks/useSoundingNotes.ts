import { useEffect, useState } from 'react';
import { subscribeHeardNotes } from '@/daw/audio/noteEvents';

const EMPTY: ReadonlySet<number> = new Set();

/**
 * The notes a track's instrument is sounding now, as they're heard: the
 * timeline's, a live keyboard's, an audition's (noteEvents). A key is down
 * from its note-on to its note-off, so the dock's keyboard plays along with
 * the song (owner, 2026-10-23). Two clips holding one pitch hold it until
 * both let go; a stop, a seek or a loop's seam lets go of everything.
 */
export function useSoundingNotes(
  trackId: string | null | undefined,
): ReadonlySet<number> {
  const [notes, setNotes] = useState<ReadonlySet<number>>(EMPTY);

  useEffect(() => {
    if (!trackId) return;
    const counts = new Map<number, number>();
    const publish = () =>
      setNotes(counts.size ? new Set(counts.keys()) : EMPTY);
    const off = subscribeHeardNotes(trackId, (event) => {
      if (event.type === 'allOff') {
        if (counts.size === 0) return;
        counts.clear();
      } else if (event.type === 'on') {
        if (event.velocity <= 0) return;
        const held = counts.get(event.note) ?? 0;
        counts.set(event.note, held + 1);
        if (held > 0) return;
      } else {
        const held = counts.get(event.note);
        if (!held) return;
        if (held > 1) {
          counts.set(event.note, held - 1);
          return;
        }
        counts.delete(event.note);
      }
      publish();
    });
    return () => {
      off();
      setNotes(EMPTY);
    };
  }, [trackId]);

  return notes;
}
