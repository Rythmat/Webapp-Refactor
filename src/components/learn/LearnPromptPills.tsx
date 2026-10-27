import { useSearchParams } from 'react-router-dom';
import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { PromptFilterPill } from '@/components/promptBox/PromptFilterPill';
import {
  DIFFICULTY_OPTIONS,
  GENRE_OPTIONS,
  SAVED_OPTIONS,
} from '@/components/songLibrary/SongLibraryPage';
import { cn } from '@/components/utilities';
import type { LearnTab } from '@/features/learn/learnPaths';
import {
  GENRE_SECTIONS,
  type GenreSectionId,
} from '@/features/learn/learnPromptSuggestions';

/** The kinds of Learn material the bar's pills narrow it to, in the nav's
 *  order; names alone, no icons (owner, 2026-10-25). */
const KIND_OPTIONS: { id: LearnTab; label: string }[] = [
  { id: 'Songs', label: 'Songs' },
  { id: 'Genre', label: 'Genre' },
  { id: 'Theory', label: 'Theory' },
  { id: 'Technique', label: 'Technique' },
];

/**
 * One-of pills in the prompt bar, Home's look: choosing one lights it,
 * choosing it again lets it go.
 */
function ChoicePills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** The group's name for screen readers. */
  label: string;
  options: readonly { id: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center gap-1.5"
    >
      {options.map((option) => {
        const on = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : option.id)}
            className={cn(PROMPT_PILL, on ? PROMPT_PILL_ON : PROMPT_PILL_OFF)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The Learn page prompt bar's kinds (owner, 2026-10-25), as Home's bar has
 * its destinations: Songs, Genre, Theory, Technique. Choosing one narrows
 * the suggestions to that kind; choosing it again lets them all back.
 */
export const LearnKindPills = ({
  kind,
  onChange,
}: {
  kind: LearnTab | null;
  onChange: (kind: LearnTab | null) => void;
}) => (
  <ChoicePills
    label="Suggest"
    options={KIND_OPTIONS}
    value={kind}
    onChange={onChange}
  />
);

const SECTION_OPTIONS = GENRE_SECTIONS.map(({ id, label }) => ({ id, label }));

/**
 * The Genre pages' pills (owner, 2026-10-25): a genre lesson's sections,
 * Melody, Chords, Bass, Performance. Choosing one turns the suggestions to
 * that section of every course; none, the courses.
 */
export const GenreSectionPills = ({
  section,
  onChange,
}: {
  section: GenreSectionId | null;
  onChange: (section: GenreSectionId | null) => void;
}) => (
  <ChoicePills
    label="Suggest a section"
    options={SECTION_OPTIONS}
    value={section}
    onChange={onChange}
  />
);

/**
 * The Songs pages' Difficulty, Genre and Saved filters, as the prompt bar's
 * pills (owner, 2026-10-25). They set the URL (?difficulty=, ?genre=,
 * ?saved=), which the song list below follows (SongLibraryBody's `clear`).
 */
export const SongFilterPills = () => {
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'all') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  return (
    <div
      role="group"
      aria-label="Filter songs"
      className="flex items-center gap-1.5"
    >
      <PromptFilterPill
        label="Difficulty"
        value={params.get('difficulty') ?? 'all'}
        options={DIFFICULTY_OPTIONS}
        onChange={(v) => set('difficulty', v)}
      />
      <PromptFilterPill
        label="Genre"
        value={params.get('genre') ?? 'all'}
        options={GENRE_OPTIONS}
        onChange={(v) => set('genre', v)}
      />
      <PromptFilterPill
        label="Saved"
        value={params.get('saved') ?? 'all'}
        options={SAVED_OPTIONS}
        onChange={(v) => set('saved', v)}
      />
    </div>
  );
};
