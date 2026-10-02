import { useState } from 'react';
import type { LabelRecord } from '@/content/records/types';
import { EntityPicker } from '../entities/EntityPicker';
import { parentLabelRefusal } from './refusals';
import {
  AliasesField,
  bodyPatcher,
  EditorColumn,
  Field,
  FieldRow,
  readNumber,
  readString,
  RecordMetaRow,
  type RecordEditorProps,
  TextField,
  useServedBodies,
  YearField,
  yearsBackwards,
} from './shared';

/**
 * A record label (design §3.2 Recording → Labels). Releases point here
 * through `labelId` and artists through `labelIds`, so neither list is
 * edited here; the Table's Records and Artists cells show them.
 *
 * A label can be an imprint of another (Tamla → Motown), never of itself,
 * and never of one of its own imprints: the chain may not loop (REF_PATHS
 * `acyclic: 'imprint_of'`). The check walks the labels the console has
 * loaded; the API refuses whatever it cannot see.
 */

/** The keys this editor writes: a KindSpec's `structuralKeys`. */
export const LABEL_KEYS = [
  'name',
  'aliases',
  'placeId',
  'parentLabelId',
  'foundedYear',
  'defunctYear',
  'description',
  'unverified',
  'source',
] as const satisfies readonly (keyof LabelRecord)[];

export const LabelFields = ({
  body,
  onChange,
  readOnly,
}: RecordEditorProps) => {
  const patch = bodyPatcher<LabelRecord>(body, onChange, readOnly);
  const slug = readString(body.slug);
  const founded = readNumber(body.foundedYear);
  const defunct = readNumber(body.defunctYear);
  const [refusal, setRefusal] = useState<string | null>(null);
  const labels = useServedBodies('label');
  const parentOf = (label: string) => {
    const parent = readString(labels.get(label)?.parentLabelId);
    return parent ? [parent] : [];
  };

  const pickParent = (parent: string | null) => {
    const why = parent ? parentLabelRefusal(slug, parent, parentOf) : null;
    setRefusal(why);
    if (!why) patch({ parentLabelId: parent ?? undefined });
  };

  return (
    <EditorColumn label="Label details" readOnly={readOnly}>
      <TextField
        label="Name"
        field="name"
        required
        value={readString(body.name)}
        onChange={(name) => patch({ name: name ?? '' })}
        hint={slug ? `Id: label:${slug}` : undefined}
      />

      <AliasesField body={body} patch={patch} />

      <FieldRow>
        <Field label="City" field="placeId" hint="Where it was based.">
          <EntityPicker
            kind="place"
            aria-label="City"
            value={readString(body.placeId)}
            onChange={(place) => patch({ placeId: place ?? undefined })}
            allowCreate
          />
        </Field>
        <Field
          label="Imprint of"
          field="parentLabelId"
          hint="The parent label, when this one is an imprint."
          warning={refusal}
        >
          <EntityPicker
            kind="label"
            aria-label="Imprint of"
            value={readString(body.parentLabelId)}
            onChange={pickParent}
            allowCreate
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <YearField
          label="Founded"
          field="foundedYear"
          value={founded}
          onChange={(foundedYear) => patch({ foundedYear })}
        />
        <YearField
          label="Defunct"
          field="defunctYear"
          value={defunct}
          onChange={(defunctYear) => patch({ defunctYear })}
          placeholder="Active"
          warning={
            yearsBackwards(founded, defunct)
              ? 'Defunct before it was founded.'
              : undefined
          }
        />
      </FieldRow>

      <TextField
        label="Description"
        field="description"
        multiline
        value={readString(body.description)}
        onChange={(description) => patch({ description })}
      />

      <RecordMetaRow body={body} patch={patch} />
    </EditorColumn>
  );
};
