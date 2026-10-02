import { GitBranch, Music, Tags } from 'lucide-react';
import { type ReactNode, useEffect, useMemo } from 'react';
import { progressionErrors } from '@/curriculum/engine/progressionValidation';
import { useChordNotation } from '@/lib/chordNotation';
import { CONSOLE_LABEL } from '../../ui/styles';
import { chordNamer } from './chordPicker';
import { branchPlace } from './progressionPlace';
import { suggestTags, type TagSuggestion } from './ruleSuggestions';
import { useProgressionCorpus } from './useProgressionCorpus';

/**
 * What saving a progression's new chords does, said before it is saved:
 * under the row panel's Details while the chords differ from the stored
 * ones, and under a new progression's chords in the New panel.
 *
 * - **Songs.** A progression linked to songs keeps its links: a warning
 *   says the songs may no longer use these chords, and nothing is cleared.
 * - **Tesseract.** Where the chords put it on the map of openings: the
 *   branch it leaves and the one it joins, from the library's other
 *   progressions.
 * - **Vibes and styles.** What the progression rules suggest for the new
 *   chords (ruleSuggestions.ts), as suggestions only.
 *
 * It also holds the draft to the library's rules against the other
 * progressions (the duplicate check needs them all), and hands the first
 * problem the change makes to `onBlocked`, for Save to wait on. A problem
 * the stored progression already had is not this save's to fix.
 */

type Body = Readonly<Record<string, unknown>>;

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export interface ProgressionDraftNoteProps {
  /** The progression as stored; null or undefined for a new one. */
  was: Body | null | undefined;
  /** The draft. */
  is: Body | null | undefined;
  /** A linked song's title, by its id. */
  songName?(id: string): string;
  /** The first problem the draft's change makes, or null: Save waits on it. */
  onBlocked?(problem: string | null): void;
}

export const ProgressionDraftNote = ({
  was,
  is,
  songName = (id) => id,
  onBlocked,
}: ProgressionDraftNoteProps) => {
  const corpus = useProgressionCorpus();
  const notation = useChordNotation();
  const name = useMemo(() => chordNamer(notation), [notation]);

  const chords = strings(is?.chords);
  const before = was ? strings(was.chords) : null;
  const changed = before === null || !sameList(chords, before);

  const problem = useMemo(() => {
    if (!is) return null;
    const errors = progressionErrors(is, {
      others: corpus.entries,
      before: was ?? undefined,
    }).filter((issue) => issue.rule !== 'id');
    return errors.length ? errors[0].message : null;
  }, [is, was, corpus.entries]);

  useEffect(() => {
    onBlocked?.(problem);
  }, [onBlocked, problem]);
  useEffect(() => () => onBlocked?.(null), [onBlocked]);

  const place = useMemo(
    () => branchPlace(chords, corpus.entries, is?.id),
    // The chords as a list: a new array with the same chords is the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chords.join('|'), corpus.entries, is?.id],
  );

  if (!is || !changed || chords.length === 0) return null;

  const path = (list: readonly string[]) => list.map(name).join(' → ');
  const songIds = strings(is.songIds);
  const rules = suggestTags({
    chords,
    vibes: strings(is.vibes),
    styles: strings(is.styles),
  });
  const ready = corpus.entries.length > 0;

  const where = !ready
    ? 'Its branch shows once the library’s progressions have loaded.'
    : place.shared === 0
      ? `It starts a tree of its own: no other progression opens on ${name(chords[0])}.`
      : place.shared === chords.length
        ? `It ends inside a branch: ${plural(place.continuing, 'progression')} open with all its chords and go on.`
        : `It branches off after ${path(chords.slice(0, place.shared))}, an opening ${plural(place.others, 'other progression')} share.`;

  return (
    <section
      aria-label="What saving the chords does"
      className="flex flex-col gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"
    >
      <h3 className={CONSOLE_LABEL}>
        {before === null ? 'Where it goes' : 'What saving the chords does'}
      </h3>
      <ul className="flex flex-col gap-2 text-sm leading-snug text-white/75">
        {before !== null && songIds.length > 0 && (
          <Effect icon={<Music className="size-3.5 text-amber-300/80" />}>
            <span className="text-amber-200/90">
              Linked to {plural(songIds.length, 'song')}:{' '}
              {songIds.map(songName).join(', ')}.
            </span>{' '}
            {songIds.length === 1 ? 'It' : 'They'} may no longer use these
            chords. The links stay until you change them.
          </Effect>
        )}
        <Effect icon={<GitBranch className="size-3.5 text-white/45" />}>
          {before === null ? (
            <>Tesseract: {where}</>
          ) : (
            <>
              Tesseract: it leaves {path(before)} for its new branch. {where}
            </>
          )}
        </Effect>
        <Effect icon={<Tags className="size-3.5 text-white/45" />}>
          {rules ? (
            <RuleLine vibes={rules.vibes} styles={rules.styles} />
          ) : (
            'Vibe and style suggestions from the progression rules are not available yet.'
          )}
        </Effect>
      </ul>
    </section>
  );
};

const Effect = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <li className="flex gap-2">
    <span aria-hidden className="mt-0.5 shrink-0">
      {icon}
    </span>
    <span className="min-w-0">{children}</span>
  </li>
);

const tagLine = (what: string, { add, remove }: TagSuggestion) =>
  [
    add.length && `add ${what} ${add.join(', ')}`,
    remove.length && `take off ${remove.join(', ')}`,
  ]
    .filter(Boolean)
    .join('; ');

const RuleLine = ({
  vibes,
  styles,
}: {
  vibes: TagSuggestion;
  styles: TagSuggestion;
}) => {
  const parts = [tagLine('vibes', vibes), tagLine('styles', styles)].filter(
    Boolean,
  );
  return (
    <>
      {parts.length
        ? `The progression rules suggest: ${parts.join('. ')}.`
        : 'The progression rules agree with its vibes and styles.'}{' '}
      <span className="text-white/45">
        Suggestions only: the tags stay as they are set.
      </span>
    </>
  );
};
