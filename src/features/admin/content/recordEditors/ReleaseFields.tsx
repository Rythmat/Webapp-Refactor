import type { ReleaseFormat, ReleaseRecord } from '@/content/records/types';
import { EntityMultiPicker } from '../entities/EntityMultiPicker';
import { EntityPicker } from '../entities/EntityPicker';
import {
  bodyPatcher,
  EditorColumn,
  Field,
  FieldInput,
  FieldRow,
  FieldSelect,
  inputClass,
  optionalId,
  readNumber,
  readString,
  readStrings,
  RecordMetaRow,
  type RecordEditorProps,
  TextField,
  YearField,
} from './shared';

/**
 * A record (content kind `release`): an album, single or EP as issued
 * (design §3.2 Recording → Records). Only what the release itself is — its
 * billed artists, format, year and label. Which songs are on it is the
 * songs' to say (`song.releases`), and where it was made is their sessions',
 * so neither is edited here; the Table's Songs and Studio cells show them.
 */

/** Every format, in the order the picker lists them; keyed so none is missed. */
const FORMAT_LABEL: Record<ReleaseFormat, string> = {
  album: 'Album',
  single: 'Single',
  ep: 'EP',
  compilation: 'Compilation',
  live: 'Live',
  soundtrack: 'Soundtrack',
};

const isFormat = (value: string | undefined): value is ReleaseFormat =>
  value !== undefined &&
  Object.prototype.hasOwnProperty.call(FORMAT_LABEL, value);

/**
 * The keys this editor owns: a KindSpec's `structuralKeys`. `externalIds`
 * is owned but has no field (recordEditors/shared.tsx), so a stored one is
 * kept as it was and never shown.
 */
export const RELEASE_KEYS = [
  'title',
  'artistIds',
  'format',
  'year',
  'labelId',
  'catalogNumber',
  'coverRef',
  'externalIds',
  'unverified',
  'source',
] as const satisfies readonly (keyof ReleaseRecord)[];

export const ReleaseFields = ({
  body,
  onChange,
  readOnly,
}: RecordEditorProps) => {
  const patch = bodyPatcher<ReleaseRecord>(body, onChange, readOnly);
  const slug = readString(body.slug);
  const artistIds = readStrings(body.artistIds);
  const format = readString(body.format);
  const coverRef = readString(body.coverRef);

  return (
    <EditorColumn label="Record details" readOnly={readOnly}>
      <TextField
        label="Title"
        field="title"
        required
        value={readString(body.title)}
        onChange={(title) => patch({ title: title ?? '' })}
        hint={slug ? `Id: release:${slug}` : undefined}
      />

      <Field
        label="Artists"
        field="artistIds"
        required
        wide
        hint="The billed artists, in billing order."
        warning={artistIds.length ? null : 'Needs at least one artist.'}
      >
        <EntityMultiPicker
          kind="artist"
          aria-label="Artists"
          value={artistIds}
          // Required: an emptied list stays [], and the save says so.
          onChange={(ids) => patch({ artistIds: ids })}
          allowCreate
          disabled={readOnly}
        />
      </Field>

      <FieldRow>
        <Field
          label="Format"
          field="format"
          required
          className="flex-none"
          warning={isFormat(format) ? null : 'Needs a format.'}
        >
          <FieldSelect
            aria-label="Format"
            value={isFormat(format) ? format : ''}
            onChange={(e) => {
              const next = e.target.value;
              if (isFormat(next)) patch({ format: next });
            }}
            className={inputClass}
          >
            {!isFormat(format) && (
              <option value="" disabled>
                {format ? `${format} (not a format)` : 'Choose…'}
              </option>
            )}
            {Object.entries(FORMAT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FieldSelect>
        </Field>
        <YearField
          label="Year"
          field="year"
          value={readNumber(body.year)}
          onChange={(year) => patch({ year })}
          hint="Release year."
        />
        <Field label="Label" field="labelId" hint="The issuing label.">
          <EntityPicker
            kind="label"
            aria-label="Label"
            value={readString(body.labelId)}
            onChange={(labelId) => patch({ labelId: labelId ?? undefined })}
            allowCreate
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <TextField
          label="Catalogue number"
          field="catalogNumber"
          value={readString(body.catalogNumber)}
          onChange={(catalogNumber) => patch({ catalogNumber })}
          placeholder="TS 254"
        />
        <Field
          label="Cover"
          field="coverRef"
          hint="A served image URL, like artist images."
        >
          <div className="flex items-center gap-2">
            <FieldInput
              aria-label="Cover"
              value={coverRef ?? ''}
              onChange={(e) => patch({ coverRef: optionalId(e.target.value) })}
              placeholder="https://…"
              className={`${inputClass} flex-1`}
            />
            {coverRef && /^https?:\/\//.test(coverRef) && (
              <img
                src={coverRef}
                alt=""
                className="size-8 shrink-0 rounded object-cover"
              />
            )}
          </div>
        </Field>
      </FieldRow>

      <RecordMetaRow body={body} patch={patch} />
    </EditorColumn>
  );
};
