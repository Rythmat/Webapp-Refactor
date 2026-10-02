import { useMemo } from 'react';
import { SUBGENRE_PARENT } from '@/content/graph/genreTags';
import { getGenre, PROGRESSION_STYLE_TO_GENRE } from '@/content/graph/genres';
import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';
import {
  CHORD_FIELD_PATHS,
  chordFieldsOf,
  COMPLEXITY_LEVELS,
  suggestComplexity,
  validateProgression,
} from '@/curriculum/engine/progressionValidation';
import { VIBE_ALGORITHMS } from '@/curriculum/engine/vibeAlgorithms';
import { ChordChipEditor } from '../chords/ChordChipEditor';
import { useProgressionCorpus } from '../chords/useProgressionCorpus';
import { EntityMultiPicker } from '../entities/EntityMultiPicker';
import {
  bodyPatcher,
  EditorColumn,
  Field,
  FieldSelect,
  inputClass,
  optionalList,
  readString,
  readStrings,
  type RecordEditorProps,
  TagToggle,
  useFieldAria,
} from './shared';

/**
 * A chord progression library entry (content kind `chord_progression`,
 * design §3.2 Chord Progression): the Table row panel's Details and the
 * kind's editor.
 *
 * Everything it is is edited here (owner, 1 Oct 2026: progressions are
 * edited in Cortex from now on): its chords, as chips (ChordChipEditor),
 * the songs that use it (the progression owns that link, decision 4), its
 * styles, vibes and complexity. A change to the chords writes the fields
 * that follow from them in the same edit (`progression`, `chordCount`,
 * `startingChord`, `startingDegree`), is held to the library's rules as it
 * is made (progressionValidation.ts: chords Prism knows, 2 to 7 of them, no
 * second copy of another progression), and suggests a complexity. The
 * sheets' own song and artist text is kept, muted, as the trail `songIds`
 * was resolved from.
 */

/** The keys this editor writes: a KindSpec's `structuralKeys`. */
export const PROGRESSION_KEYS = [
  'chords',
  'progression',
  'chordCount',
  'startingChord',
  'startingDegree',
  'songIds',
  'styles',
  'vibes',
  'complexity',
] as const satisfies readonly (keyof ChordProgressionEntry)[];

/**
 * The entry's other keys: shown here (or, `id`, only in the JSON pane),
 * never written. With PROGRESSION_KEYS, every key of
 * `ChordProgressionEntry` — the tests hold the two lists to the type.
 */
export const PROGRESSION_READ_ONLY_KEYS = [
  'id',
  'artist',
  'song',
] as const satisfies readonly (keyof ChordProgressionEntry)[];

/**
 * The library's own style spellings: the ones the graph maps to a genre,
 * then the one genres.ts leaves unmapped on purpose.
 */
const UNMAPPED_STYLES = ['african'];
const STYLES = [...Object.keys(PROGRESSION_STYLE_TO_GENRE), ...UNMAPPED_STYLES];

const humanize = (slug: string) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const styleNote = (style: string) => {
  const genre = PROGRESSION_STYLE_TO_GENRE[style];
  // A style filed at a subgenre (gospel) names its genre first, as a
  // scene's genre chip does.
  const parent = genre && !getGenre(genre) ? SUBGENRE_PARENT[genre] : null;
  if (parent) {
    return `Filed under ${getGenre(parent)?.name ?? parent} › ${humanize(genre)}`;
  }
  if (genre) return `Filed under ${getGenre(genre)?.name ?? genre}`;
  return UNMAPPED_STYLES.includes(style)
    ? 'Deliberately mapped to no genre'
    : 'Not one of the library’s styles';
};

const VIBES = Object.keys(VIBE_ALGORITHMS);

const COMPLEXITIES: readonly string[] = COMPLEXITY_LEVELS;

const toggled = (list: string[], value: string, on: boolean) =>
  on ? [...list, value] : list.filter((v) => v !== value);

export const ProgressionFields = ({
  body,
  onChange,
  readOnly,
}: RecordEditorProps) => {
  const patch = bodyPatcher<ChordProgressionEntry>(body, onChange, readOnly);
  const chords = readStrings(body.chords);
  const corpus = useProgressionCorpus();
  const issues = useMemo(
    () =>
      validateProgression(body, { others: corpus.entries }).filter(
        (issue) => issue.rule !== 'id' && issue.rule !== 'derived',
      ),
    [body, corpus.entries],
  );
  const suggested = suggestComplexity(chords);
  const styles = readStrings(body.styles);
  const vibes = readStrings(body.vibes);
  const songIds = readStrings(body.songIds);
  const complexity = readString(body.complexity);
  const knownComplexity = !!complexity && COMPLEXITIES.includes(complexity);
  const legacySong = readString(body.song)?.trim();
  const legacyArtist = readString(body.artist)?.trim();

  const styleChoices = [
    ...STYLES,
    ...styles.filter((s) => !STYLES.includes(s)),
  ];
  const vibeChoices = [...VIBES, ...vibes.filter((v) => !VIBES.includes(v))];

  return (
    <EditorColumn label="Progression details" readOnly={readOnly}>
      <Field
        label="Chords"
        field={CHORD_FIELD_PATHS}
        required
        wide
        warning={
          issues.length ? issues.map((issue) => issue.message).join(' ') : null
        }
        hint={
          chords.length
            ? `${chords.length} chord${chords.length === 1 ? '' : 's'}, starting on ${chords[0]}. Click a chord to replace it, drag or Alt+arrows to move it.`
            : 'Two to seven chords, each a degree and a chord type.'
        }
      >
        <ChordsInField
          chords={chords}
          frequency={corpus.frequency}
          readOnly={readOnly}
          onChange={(next) =>
            patch({ ...chordFieldsOf(next) } as Partial<ChordProgressionEntry>)
          }
        />
      </Field>

      <Field
        label="Songs"
        field="songIds"
        wide
        hint="Songs that use it. The progression owns this link; the song's Chord Progression column reads it."
      >
        <EntityMultiPicker
          kind="song"
          aria-label="Songs"
          value={songIds}
          onChange={(ids) => patch({ songIds: optionalList(ids) })}
          disabled={readOnly}
        />
        {(legacySong || legacyArtist) && (
          <p className="text-xs italic text-white/40">
            The source sheet says{' '}
            {[legacySong && `“${legacySong}”`, legacyArtist]
              .filter(Boolean)
              .join(' · ')}
            {songIds.length ? '' : ' — not linked to a song yet.'}
          </p>
        )}
      </Field>

      <Field
        label="Style"
        field="styles"
        wide
        hint="The library's own spellings."
      >
        <div role="group" aria-label="Style" className="flex flex-wrap gap-1.5">
          {styleChoices.map((style) => (
            <TagToggle
              key={style}
              label={style}
              note={styleNote(style)}
              checked={styles.includes(style)}
              onToggle={(on) => patch({ styles: toggled(styles, style, on) })}
            />
          ))}
        </div>
      </Field>

      <Field label="Vibe" field="vibes" wide>
        <div role="group" aria-label="Vibe" className="flex flex-wrap gap-1.5">
          {vibeChoices.map((vibe) => (
            <TagToggle
              key={vibe}
              label={vibe}
              checked={vibes.includes(vibe)}
              onToggle={(on) => patch({ vibes: toggled(vibes, vibe, on) })}
            />
          ))}
        </div>
      </Field>

      <Field
        label="Complexity"
        field="complexity"
        required
        className="flex-none"
        warning={knownComplexity ? null : 'Needs a complexity.'}
        hint={
          suggested && suggested !== complexity ? (
            <>
              Its chords suggest {suggested}.{' '}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => patch({ complexity: suggested })}
                  className="underline underline-offset-2 hover:text-white"
                >
                  Use {suggested}
                </button>
              )}
            </>
          ) : null
        }
      >
        <FieldSelect
          aria-label="Complexity"
          value={knownComplexity ? complexity : ''}
          onChange={(e) => patch({ complexity: e.target.value })}
          className={inputClass}
        >
          {!knownComplexity && (
            <option value="" disabled>
              {complexity ? `${complexity} (not a level)` : 'Choose…'}
            </option>
          )}
          {COMPLEXITIES.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </FieldSelect>
      </Field>
    </EditorColumn>
  );
};

/** The chip editor, described by the Field it sits in. */
const ChordsInField = (props: {
  chords: readonly string[];
  frequency: ReadonlyMap<string, number>;
  readOnly?: boolean;
  onChange(next: string[]): void;
}) => {
  const aria = useFieldAria();
  return (
    <ChordChipEditor
      {...props}
      label="Chords"
      describedBy={aria['aria-describedby']}
      invalid={aria['aria-invalid']}
    />
  );
};
