import type { FC, ReactNode } from 'react';
import type { GlobeEventRecord } from '@/content/records/types';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { EntityMultiPicker } from '../../content/entities/EntityMultiPicker';
import { EntityPicker } from '../../content/entities/EntityPicker';
import type { PickerKind } from '../../content/entities/entityKinds';
import {
  bodyPatcher,
  EditorColumn,
  Field,
  FieldRow,
  optionalList,
  readString,
  readStrings,
  type RecordEditorProps,
} from '../../content/recordEditors/shared';
import {
  type GlobeEventBody,
  GlobeEventVisualEditor,
} from '../../content/visual/GlobeEventVisualEditor';

/**
 * A globe event's Details in the row panel (design §3.3, Events): its card,
 * edited in place as the globe shows it (`GlobeEventVisualEditor`), and who
 * and where it is about — the event body v2's `artistIds`, `songIds`,
 * `placeId` and the records, studios and labels it names.
 *
 * Artists, songs and the place are inferred until stored: absent, the graph
 * matches them from the title, the tags and the city and draws them dotted.
 * Storing turns them solid: pick them, or keep the matches. A match in
 * doubt — a one-word name ("Eve"), or one that is also a place's or a
 * genre's ("Chicago") — is marked so, and left out of "Keep the sure
 * matches", as Link… and the bulk accept leave it out; picking a first one
 * by hand keeps the sure matches with it rather than dropping them. An
 * empty list is a statement too — reviewed, and about no one — so "None"
 * writes `[]`, removing the last one leaves `[]`, and "Back to matching"
 * removes the field. Records, studios and labels are never inferred, so an
 * emptied list is simply removed.
 *
 * The ids are the event body v2's (`globe_event` level 2): below it they are
 * shown, not edited, since a server at level 1 refuses the whole save.
 */

/** The `globe_event` body level with the ids (contract, priority 2). */
export const EVENT_V2_LEVEL = 2;

/** A connection the graph guessed, as a picker would name it. */
export interface Guess {
  slug: string;
  label: string;
  /**
   * Nothing puts it in doubt (`links.ts` `guessesFor`'s rule); absent is
   * sure. A doubtful one is shown, and kept only when picked.
   */
  sure?: boolean;
}

/** What the graph matches for an event that does not store it. */
export interface EventGuesses {
  artists: readonly Guess[];
  songs: readonly Guess[];
  place?: Guess;
}

export interface EventDetailsProps extends RecordEditorProps {
  guesses: EventGuesses;
  /** A stored event keeps its id; only a new one sets it. */
  lockId?: boolean;
}

export const EventDetails = ({
  body,
  onChange,
  readOnly = false,
  guesses,
  lockId = false,
}: EventDetailsProps) => (
  <div className="flex flex-col gap-6">
    {/* The card's click-to-edit text is not a form control, so read-only
        takes it out of reach, and ignores any write that slips past. */}
    <div {...(readOnly ? { inert: '' } : {})}>
      <GlobeEventVisualEditor
        event={body as unknown as GlobeEventBody}
        onChange={(next) => {
          if (!readOnly) onChange(next as unknown as Record<string, unknown>);
        }}
        lockId={lockId}
        narrow
      />
    </div>
    <EventLinksFields
      body={body}
      onChange={onChange}
      readOnly={readOnly}
      guesses={guesses}
    />
  </div>
);

/**
 * Who and where an event is about: the fields the Table's Artists, Songs and
 * Place columns edit, and a suggestion's Replace fills in.
 */
export const EventLinksFields = ({
  body,
  onChange,
  readOnly = false,
  guesses,
}: RecordEditorProps & { guesses: EventGuesses }) => {
  const level = useCapabilities().schemaVersionOf('globe_event');
  const saveable = level >= EVENT_V2_LEVEL;
  const patch = bodyPatcher<GlobeEventRecord>(
    body,
    onChange,
    readOnly || !saveable,
  );
  const has = (key: string) =>
    Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
  const city = readString(
    (body.location as Record<string, unknown> | undefined)?.city,
  );

  return (
    <EditorColumn label="Who and where it is about" readOnly={readOnly}>
      {!saveable && (
        <p className="text-xs text-white/45">
          Saved once the server takes the event body v2 (globe events level{' '}
          {EVENT_V2_LEVEL}; this one is at {level || 'none'}). Until then the
          map matches them from the title, the tags and the city.
        </p>
      )}
      <fieldset
        disabled={!saveable}
        className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0"
      >
        <InferredList
          label="Artists"
          field="artistIds"
          kind="artist"
          stored={has('artistIds') ? readStrings(body.artistIds) : undefined}
          guesses={guesses.artists}
          matchedFrom="its title and tags"
          onChange={(artistIds) => patch({ artistIds })}
        />
        <InferredList
          label="Songs"
          field="songIds"
          kind="song"
          stored={has('songIds') ? readStrings(body.songIds) : undefined}
          guesses={guesses.songs}
          matchedFrom="its title"
          onChange={(songIds) => patch({ songIds })}
        />
        <InferredPlace
          stored={readString(body.placeId)}
          guess={guesses.place}
          city={city}
          onChange={(placeId) => patch({ placeId })}
        />
        <FieldRow>
          <NamedList
            label="Records"
            field="releaseIds"
            kind="release"
            value={readStrings(body.releaseIds)}
            onChange={(releaseIds) => patch({ releaseIds })}
          />
          <NamedList
            label="Studios"
            field="studioIds"
            kind="studio"
            value={readStrings(body.studioIds)}
            onChange={(studioIds) => patch({ studioIds })}
          />
          <NamedList
            label="Labels"
            field="labelIds"
            kind="label"
            value={readStrings(body.labelIds)}
            onChange={(labelIds) => patch({ labelIds })}
          />
        </FieldRow>
      </fieldset>
    </EditorColumn>
  );
};

const LINK =
  'text-xs text-white/60 underline underline-offset-2 hover:text-white disabled:no-underline disabled:opacity-50';

/** A chip for what the map guessed: dotted, as the grid draws a guess. */
const GuessChip: FC<{ children: ReactNode; doubtful?: boolean }> = ({
  children,
  doubtful = false,
}) => (
  <span
    className={
      doubtful
        ? 'inline-flex h-7 items-center gap-1 rounded-full border border-dotted border-amber-300/45 px-2.5 text-xs text-white/65'
        : 'inline-flex h-7 items-center rounded-full border border-dotted border-white/30 px-2.5 text-xs text-white/65'
    }
    title={
      doubtful
        ? 'In doubt: a one-word name, or also a place’s or a genre’s. Kept only if you pick it.'
        : undefined
    }
  >
    {children}
    {doubtful && <span className="text-amber-200/80">?</span>}
    <span className="sr-only">
      {doubtful ? ' (matched, in doubt, not stored)' : ' (matched, not stored)'}
    </span>
  </span>
);

/**
 * A list the map infers until it is stored: `stored` undefined is "matched",
 * `[]` is "reviewed: none", anything else is the stored list.
 */
const InferredList: FC<{
  label: string;
  field: string;
  kind: PickerKind;
  stored: string[] | undefined;
  guesses: readonly Guess[];
  matchedFrom: string;
  onChange: (next: string[] | undefined) => void;
}> = ({ label, field, kind, stored, guesses, matchedFrom, onChange }) => {
  const noun = label.toLowerCase();
  const sure = guesses.filter((guess) => guess.sure !== false);
  const doubtful = guesses.length - sure.length;
  const matched = [
    `Matched from ${matchedFrom}, not stored:`,
    sure.length
      ? `keep the ${doubtful ? 'sure ' : ''}matches, or pick. Picking one keeps the sure matches with it.`
      : 'pick the ones it is about.',
    doubtful ? 'Those marked ? are in doubt: kept only if picked.' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const hint =
    stored === undefined
      ? guesses.length
        ? matched
        : `Nothing stored, and nothing in ${matchedFrom} matches.`
      : stored.length === 0
        ? `Reviewed: no ${noun}.`
        : undefined;
  const keep = sure.map((guess) => guess.slug);
  return (
    <Field label={label} field={field} wide hint={hint}>
      <div className="flex flex-col gap-2">
        {stored === undefined && guesses.length > 0 && (
          <div
            role="group"
            aria-label={`Matched ${noun}`}
            className="flex flex-wrap items-center gap-1.5"
          >
            {guesses.map((guess) => (
              <GuessChip key={guess.slug} doubtful={guess.sure === false}>
                {guess.label}
              </GuessChip>
            ))}
          </div>
        )}
        <EntityMultiPicker
          kind={kind}
          aria-label={label}
          value={stored ?? []}
          // The first pick stores the list: the sure matches with it, not
          // in place of them.
          onChange={(next) =>
            onChange(
              stored === undefined ? [...new Set([...keep, ...next])] : next,
            )
          }
          allowCreate={kind !== 'song'}
        />
        <div className="flex flex-wrap gap-3">
          {stored === undefined && keep.length > 0 && (
            <button
              type="button"
              className={LINK}
              onClick={() => onChange(keep)}
            >
              {doubtful
                ? keep.length === 1
                  ? 'Keep the sure match'
                  : `Keep the ${keep.length} sure matches`
                : 'Keep the matches'}
            </button>
          )}
          {stored === undefined && (
            <button type="button" className={LINK} onClick={() => onChange([])}>
              None
            </button>
          )}
          {stored !== undefined && (
            <button
              type="button"
              className={LINK}
              onClick={() => onChange(undefined)}
            >
              Back to matching
            </button>
          )}
        </div>
      </div>
    </Field>
  );
};

/** Where the event happened: stored, or placed from its city. */
const InferredPlace: FC<{
  stored: string | undefined;
  guess: Guess | undefined;
  city: string | undefined;
  onChange: (next: string | undefined) => void;
}> = ({ stored, guess, city, onChange }) => {
  const hint = stored
    ? 'Stored. Clear it to place the event from its city again.'
    : guess
      ? 'Placed from its city, not stored.'
      : city
        ? `Its city “${city}” matches no place: pick one.`
        : 'No city, and no place stored.';
  return (
    <Field label="Place" field={['placeId', 'location.city']} wide hint={hint}>
      <div className="flex flex-wrap items-center gap-2">
        {!stored && guess && <GuessChip>{guess.label}</GuessChip>}
        <EntityPicker
          kind="place"
          aria-label="Place"
          value={stored}
          suggestion={stored ? undefined : city}
          onChange={(slug) => onChange(slug ?? undefined)}
          allowCreate
        />
        {!stored && guess && (
          <button
            type="button"
            className={LINK}
            onClick={() => onChange(guess.slug)}
          >
            Keep it
          </button>
        )}
      </div>
    </Field>
  );
};

/** Records, studios or labels it names: never inferred, so empty is absent. */
const NamedList: FC<{
  label: string;
  field: string;
  kind: PickerKind;
  value: string[];
  onChange: (next: string[] | undefined) => void;
}> = ({ label, field, kind, value, onChange }) => (
  <Field label={label} field={field}>
    <EntityMultiPicker
      kind={kind}
      aria-label={label}
      value={value}
      onChange={(next) => onChange(optionalList(next))}
      allowCreate
    />
  </Field>
);
