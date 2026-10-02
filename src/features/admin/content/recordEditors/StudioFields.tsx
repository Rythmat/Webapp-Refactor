import type { StudioRecord } from '@/content/records/types';
import { EntityPicker } from '../entities/EntityPicker';
import {
  AliasesField,
  bodyPatcher,
  CoordinatesField,
  EditorColumn,
  Field,
  FieldInput,
  FieldRow,
  inputClass,
  optionalId,
  readCoordinates,
  readNumber,
  readString,
  RecordMetaRow,
  type RecordEditorProps,
  TextField,
  YearField,
  yearsBackwards,
} from './shared';

/**
 * A recording studio (design §3.2 Recording → Studios). Songs point here
 * through `session.studioId`, so the songs made in it are not edited here;
 * the Table's Songs cell shows them and its Link… writes the song.
 *
 * The town is required — a studio is somewhere — but the field is optional
 * in the type, so clearing it removes it and the warning stays up.
 */

/** The keys this editor writes: a KindSpec's `structuralKeys`. */
export const STUDIO_KEYS = [
  'name',
  'aliases',
  'placeId',
  'openedYear',
  'closedYear',
  'coordinates',
  'description',
  'imageRef',
  'unverified',
  'source',
] as const satisfies readonly (keyof StudioRecord)[];

export const StudioFields = ({
  body,
  onChange,
  readOnly,
}: RecordEditorProps) => {
  const patch = bodyPatcher<StudioRecord>(body, onChange, readOnly);
  const slug = readString(body.slug);
  const placeId = readString(body.placeId);
  const opened = readNumber(body.openedYear);
  const closed = readNumber(body.closedYear);

  return (
    <EditorColumn label="Studio details" readOnly={readOnly}>
      <TextField
        label="Name"
        field="name"
        required
        value={readString(body.name)}
        onChange={(name) => patch({ name: name ?? '' })}
        hint={slug ? `Id: studio:${slug}` : undefined}
      />

      <AliasesField body={body} patch={patch} />

      <FieldRow>
        <Field
          label="City"
          field="placeId"
          required
          warning={placeId ? null : 'Needs the city it is in.'}
        >
          <EntityPicker
            kind="place"
            aria-label="City"
            value={placeId}
            onChange={(place) => patch({ placeId: place ?? undefined })}
            allowCreate
          />
        </Field>
        <YearField
          label="Opened"
          field="openedYear"
          value={opened}
          onChange={(openedYear) => patch({ openedYear })}
        />
        <YearField
          label="Closed"
          field="closedYear"
          value={closed}
          onChange={(closedYear) => patch({ closedYear })}
          placeholder="Open"
          warning={
            yearsBackwards(opened, closed)
              ? 'Closed before it opened.'
              : undefined
          }
        />
      </FieldRow>

      <CoordinatesField
        value={readCoordinates(body.coordinates)}
        onChange={(coordinates) => patch({ coordinates })}
        hint="The building, when it should get its own pin."
      />

      <TextField
        label="Description"
        field="description"
        multiline
        value={readString(body.description)}
        onChange={(description) => patch({ description })}
      />

      <Field label="Photo" field="imageRef" wide hint="A served image URL.">
        <FieldInput
          aria-label="Photo"
          value={readString(body.imageRef) ?? ''}
          onChange={(e) => patch({ imageRef: optionalId(e.target.value) })}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>

      <RecordMetaRow body={body} patch={patch} />
    </EditorColumn>
  );
};
