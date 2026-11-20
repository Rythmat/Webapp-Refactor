import type { DaySnapshot } from '../publish/publishDay';
import { deckFromSnapshot, interactionsForSlide } from '../slides/deck';
import type { Slide } from '../slides/types';
import type {
  Interaction,
  InteractionResponsePayload,
  ShowcaseArtifact,
} from '../types';

// ── Handing in (owner, 2026-11-13) ─────────────────────────────────────────
// A lesson's Present your progress slide takes each student's work from
// this class, for the teacher only, with a note on what they got done. The
// teacher can ask the class to hand in from Present or the dashboard; a
// student's device shows the ask until they have.

/** An offer of work for the teacher only: the hand-in itself. */
export const isHandIn = (interaction: Interaction): boolean =>
  interaction.type === 'showcase' &&
  interaction.showcase?.audience === 'teacher';

export interface HandInSlide {
  slide: Slide;
  /** Everything the slide asks: the work, and the note with it. */
  interactions: Interaction[];
}

/** The deck's slide that takes the hand-in, if it has one. */
export const findHandInSlide = (
  snapshot: DaySnapshot | null | undefined,
): HandInSlide | null => {
  const deck = deckFromSnapshot(snapshot);
  if (!snapshot || !deck) return null;
  for (const slide of deck.slides) {
    const interactions = interactionsForSlide(snapshot, slide);
    if (interactions.some(isHandIn)) return { slide, interactions };
  }
  return null;
};

/**
 * Whether a student has handed in: their work, or their note alone (a
 * student with nothing from this class can still say what they did).
 */
export const hasHandedIn = (
  answers: Readonly<Record<string, InteractionResponsePayload>> | undefined,
  interactions: readonly Interaction[],
): boolean =>
  Boolean(answers) && interactions.some((i) => answers?.[i.id] !== undefined);

export interface HandInRow {
  enrollmentId: string;
  displayName: string;
  work: ShowcaseArtifact | null;
  note: string | null;
  done: boolean;
}

/** Each student in the class, with what they handed in; the missing last. */
export const handInRows = (
  roster: readonly { id: string; displayName: string }[],
  responsesByEnrollment: Readonly<
    Record<string, Record<string, InteractionResponsePayload>>
  >,
  interactions: readonly Interaction[],
): HandInRow[] => {
  const rows = roster.map((student): HandInRow => {
    const answers = responsesByEnrollment[student.id];
    let work: ShowcaseArtifact | null = null;
    let note: string | null = null;
    for (const interaction of interactions) {
      const payload = answers?.[interaction.id];
      if (payload?.kind === 'showcase' && isHandIn(interaction))
        work = payload.artifact;
      else if (payload?.kind === 'text' && payload.text.trim())
        note = payload.text.trim();
    }
    return {
      enrollmentId: student.id,
      displayName: student.displayName,
      work,
      note,
      done: hasHandedIn(answers, interactions),
    };
  });
  return [...rows.filter((r) => r.done), ...rows.filter((r) => !r.done)];
};

/** "Asked 2:41 PM": when the class was last asked, from the notice's id. */
export const askedAt = (id: number): string =>
  new Date(id).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
