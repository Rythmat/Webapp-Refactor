import { type FC, useState } from 'react';
import { REGIONS } from '@/components/atlas/data/regions';
import type { RegionId } from '@/components/atlas/types';
import { resolveGenreTag } from '@/content/graph/genreTags';
import { getGenre } from '@/content/graph/genres';
import type { PlaceRecord } from '@/content/records/types';
import {
  AliasesField,
  bodyPatcher,
  CheckboxField,
  CoordinatesField,
  EditorColumn,
  Field,
  FieldInput,
  FieldRow,
  FieldSelect,
  inputClass,
  readCoordinates,
  readNumbers,
  readString,
  readStrings,
  type RecordEditorProps,
  StringListField,
  TagToggle,
  TextField,
  useReadOnly,
} from './shared';

/**
 * A place (content kind `globe_city`, `PlaceRecord`): the globe's City plus
 * its aliases and whether it gets a pin (design §3.2 Location).
 *
 * The City fields are all required by the globe, so they keep their keys —
 * a cleared subdivision is '', emptied genres are []. `genres` stays display
 * text, the way the globe prints it ("Garage Rock"); each chip says what the
 * graph files it under through the curated genre table, and a name the table
 * does not know reads muted and "unlinked", because it is shown but
 * connects nowhere. `pin` is absent for a pin: unticking writes `false`,
 * ticking removes it.
 */

/** The keys this editor writes: a KindSpec's `structuralKeys`. */
export const PLACE_KEYS = [
  'name',
  'aliases',
  'country',
  'subdivision',
  'region',
  'coordinates',
  'genres',
  'activeDecades',
  'description',
  'pin',
] as const satisfies readonly (keyof PlaceRecord)[];

const isRegion = (value: string | undefined): value is RegionId =>
  REGIONS.some((r) => r.id === value);

const humanize = (slug: string) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** What the graph makes of a scene genre, for its chip. */
const describeGenre = (tag: string) => {
  const resolved = resolveGenreTag(tag);
  if (!resolved) {
    return {
      note: 'Not in the genre table: shown on the globe, connected to nothing.',
      muted: true,
    };
  }
  const genre = getGenre(resolved.genre)?.name ?? resolved.genre;
  return {
    note: resolved.subgenre
      ? `Filed under ${genre} › ${humanize(resolved.subgenre)}`
      : `Filed under ${genre}`,
  };
};

export const PlaceFields = ({
  body,
  onChange,
  readOnly,
}: RecordEditorProps) => {
  const patch = bodyPatcher<PlaceRecord>(body, onChange, readOnly);
  const id = readString(body.id);
  const region = readString(body.region);

  return (
    <EditorColumn label="Place details" readOnly={readOnly}>
      <TextField
        label="Name"
        field="name"
        required
        value={readString(body.name)}
        onChange={(name) => patch({ name: name ?? '' })}
        hint={id ? `Id: place:${id}` : undefined}
      />

      <AliasesField body={body} patch={patch} />

      <FieldRow>
        <TextField
          label="Country"
          field="country"
          required
          value={readString(body.country)}
          onChange={(country) => patch({ country: country ?? '' })}
          placeholder="US"
        />
        {/* Required by the type, but many places have none: '' is valid. */}
        <Field label="State or province" field="subdivision">
          <FieldInput
            aria-label="State or province"
            value={readString(body.subdivision) ?? ''}
            onChange={(e) => patch({ subdivision: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field
          label="Region"
          field="region"
          required
          className="flex-none"
          warning={isRegion(region) ? null : 'Needs a region.'}
        >
          <FieldSelect
            aria-label="Region"
            value={isRegion(region) ? region : ''}
            onChange={(e) => {
              const next = e.target.value;
              if (isRegion(next)) patch({ region: next });
            }}
            className={inputClass}
          >
            {!isRegion(region) && (
              <option value="" disabled>
                {region ? `${region} (not a region)` : 'Choose…'}
              </option>
            )}
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </FieldSelect>
        </Field>
      </FieldRow>

      <FieldRow>
        <CoordinatesField
          required
          value={readCoordinates(body.coordinates)}
          onChange={(coordinates) => patch({ coordinates })}
        />
        <Field label="Globe" field="pin" className="flex-none">
          <CheckboxField
            label="Show it as a pin"
            title="A hometown or a studio's town can be a place without a pin."
            checked={body.pin !== false}
            onChange={(on) => patch({ pin: on ? undefined : false })}
          />
        </Field>
      </FieldRow>

      <StringListField
        label="Scene genres"
        field="genres"
        itemLabel="genre"
        values={readStrings(body.genres)}
        onChange={(genres) => patch({ genres })}
        describe={describeGenre}
        hint="As the globe prints them. Each chip says what the graph files it under; an unlinked one connects to nothing."
      />

      <DecadesField
        value={readNumbers(body.activeDecades)}
        onChange={(activeDecades) => patch({ activeDecades })}
      />

      {/* The globe's City always has one, but it may be empty: blank is ''. */}
      <TextField
        label="Description"
        field="description"
        multiline
        value={readString(body.description)}
        onChange={(description) => patch({ description: description ?? '' })}
      />
    </EditorColumn>
  );
};

const FIRST_MODERN = 1900;
const LAST_DECADE = Math.floor(new Date().getFullYear() / 10) * 10;
const MODERN_DECADES = Array.from(
  { length: (LAST_DECADE - FIRST_MODERN) / 10 + 1 },
  (_, i) => FIRST_MODERN + i * 10,
);

/** The oldest year the earlier box takes: a scene, not a typo ("5"). */
const OLDEST_YEAR = 100;

/**
 * `list` with `decade` put in before the first later one. Only the new
 * decade moves: entries stored out of order stay where they are.
 */
const insertDecade = (list: number[], decade: number) => {
  const at = list.findIndex((d) => d > decade);
  return at === -1
    ? [...list, decade]
    : [...list.slice(0, at), decade, ...list.slice(at)];
};

/**
 * The decades its scene was active: a toggle per decade since 1900, plus any
 * earlier one it already has (Baghdad's go back to the 790s) or one typed in
 * (a year before 1900 rounds down to its decade).
 */
const DecadesField: FC<{
  value: number[];
  onChange: (next: number[]) => void;
}> = ({ value, onChange }) => {
  const readOnly = useReadOnly();
  const [other, setOther] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const shown = [...new Set([...value, ...MODERN_DECADES])].sort(
    (a, b) => a - b,
  );
  const toggle = (decade: number, on: boolean) =>
    onChange(
      on ? insertDecade(value, decade) : value.filter((d) => d !== decade),
    );
  const addOther = () => {
    if (!other.trim()) return;
    const year = Number(other);
    if (Number.isInteger(year) && year >= OLDEST_YEAR && year < FIRST_MODERN) {
      const decade = Math.floor(year / 10) * 10;
      if (!value.includes(decade)) toggle(decade, true);
      setNotice(null);
    } else {
      setNotice(
        `An earlier decade is a year from ${OLDEST_YEAR} to ${FIRST_MODERN - 1}; later ones have their own toggle.`,
      );
    }
    setOther('');
  };

  return (
    <Field
      label="Active decades"
      field="activeDecades"
      wide
      warning={notice}
      hint="The scene's decades, for the globe's decade filter."
    >
      <div
        role="group"
        aria-label="Active decades"
        className="flex flex-wrap items-center gap-1.5"
      >
        {shown.map((decade) => (
          <TagToggle
            key={decade}
            label={`${decade}s`}
            checked={value.includes(decade)}
            onToggle={(on) => toggle(decade, on)}
          />
        ))}
        {!readOnly && (
          <FieldInput
            aria-label="Add an earlier decade"
            type="number"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOther();
              }
            }}
            onBlur={addOther}
            placeholder="Earlier…"
            className={`${inputClass} h-7 w-24 rounded-full px-2.5 text-xs`}
          />
        )}
      </div>
    </Field>
  );
};
