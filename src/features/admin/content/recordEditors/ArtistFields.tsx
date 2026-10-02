import { type FC, lazy, Suspense, useState } from 'react';
import { isGroupArtist } from '@/content/graph/deriveGraph';
import { isCalendarDate, yearOf } from '@/content/graph/time';
import type {
  ArtistBirth,
  ArtistInfluence,
  ArtistMember,
  ArtistRecord,
} from '@/content/records/types';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { artistBirthSchema } from '@/scripts/apiContract/recordBodySchemas';
import { EntityMultiPicker } from '../entities/EntityMultiPicker';
import { EntityPicker } from '../entities/EntityPicker';
import { RefRow, type RefMetaValue } from '../entities/RefRow';
import { influenceRefusal, memberRefusal } from './refusals';
import {
  AliasesField,
  type Body,
  bodyPatcher,
  CheckboxField,
  EditorColumn,
  Field,
  FieldInput,
  FieldRow,
  inputClass,
  metaChange,
  optionalList,
  type Patch,
  patchBody,
  readNumber,
  readObject,
  readObjects,
  readString,
  readStrings,
  RecordMetaRow,
  type RecordEditorProps,
  RemoveButton,
  TextField,
  useReadOnly,
  useServedBodies,
  YearInput,
  yearsBackwards,
} from './shared';

/**
 * Repo mode only (DEV): the globe roster toggle, which writes the repo's
 * files at once. Loaded behind a literal `import.meta.env.DEV`, so neither
 * it nor the repo client it calls ships in a build.
 */
const RosterToggle = import.meta.env.DEV
  ? lazy(() =>
      import('../repo/RosterToggle').then(({ RosterToggle }) => ({
        default: RosterToggle,
      })),
    )
  : null;

/**
 * An artist record, field by field (design §3.2 Artist, §3.3 Details): the
 * Table row panel's Details section and the `artist` kind's editor both.
 *
 * Name, the Group switch, City (`basedInPlaceId`: the hometown or scene; for
 * a band, where it formed), Years Active, Genres, Instruments and Labels are
 * the record's own; members and influences are references that carry their
 * own "unconfirmed" and source, so they sit in RefRows. Songs and Events are
 * not here: other records own those links (decision 4), and the Table's
 * Link… writes them there.
 */

/** An artist's `genreIds` hold genres and subgenres alike. */
const GENRE_KINDS = ['genre', 'subgenre'] as const;

/**
 * The keys this editor owns: a KindSpec's `structuralKeys`. `externalIds`
 * is owned but has no field (recordEditors/shared.tsx), so a stored one is
 * kept as it was and never shown.
 */
export const ARTIST_KEYS = [
  'name',
  'aliases',
  'group',
  'born',
  'basedInPlaceId',
  'activeFrom',
  'activeTo',
  'genreIds',
  'instrumentIds',
  'labelIds',
  'members',
  'influencedBy',
  'bio',
  'externalIds',
  'unverified',
  'source',
] as const satisfies readonly (keyof ArtistRecord)[];

export const ArtistFields = ({
  body,
  onChange,
  readOnly,
}: RecordEditorProps) => {
  const patch = bodyPatcher<ArtistRecord>(body, onChange, readOnly);
  const slug = readString(body.slug);
  const group = body.group === true;
  const members = readObjects(body.members);
  // What the graph reads as a group: marked one, or listing members.
  const readsAsGroup = isGroupArtist({ group, members });
  const bornDate = readString(readObject(body.born)?.date);
  // Ticking Group turns a birth date into a forming: say so as it happens.
  const [groupNotice, setGroupNotice] = useState<string | null>(null);
  const influences = readObjects(body.influencedBy);
  const activeFrom = readNumber(body.activeFrom);
  const activeTo = readNumber(body.activeTo);

  return (
    <EditorColumn label="Artist details" readOnly={readOnly}>
      <FieldRow>
        <TextField
          label="Name"
          field="name"
          required
          value={readString(body.name)}
          onChange={(name) => patch({ name: name ?? '' })}
          hint={
            slug
              ? `Id: artist:${slug} — it stays when the name changes.`
              : undefined
          }
        />
        <Field
          label="Group"
          field="group"
          className="flex-none"
          warning={groupNotice}
          hint={
            !group && readsAsGroup
              ? 'It lists members, so the graph already reads it as a group.'
              : undefined
          }
        >
          <CheckboxField
            label="A group or band, not one person"
            checked={group}
            onChange={(on) => {
              setGroupNotice(
                on && bornDate && !readsAsGroup
                  ? `Born ${bornDate} now reads as the year the band formed, and a birthplace is not read for a band.`
                  : null,
              );
              patch({ group: on || undefined });
            }}
          />
        </Field>
        {/* Repo mode only: the globe roster, which it writes at once. */}
        {RosterToggle && (
          <Suspense fallback={null}>
            <RosterToggle slug={slug} />
          </Suspense>
        )}
      </FieldRow>

      <AliasesField body={body} patch={patch} />

      <BornFields
        value={readObject(body.born)}
        group={readsAsGroup}
        onChange={(born) => patch({ born })}
      />

      <FieldRow>
        <Field
          label="City"
          field="basedInPlaceId"
          hint={
            group
              ? 'Where the band formed.'
              : 'Their hometown or scene: where they are from or were based.'
          }
        >
          <EntityPicker
            kind="place"
            aria-label="City"
            value={readString(body.basedInPlaceId)}
            onChange={(place) => patch({ basedInPlaceId: place ?? undefined })}
            allowCreate
          />
        </Field>
        <Field
          label="Years active"
          field={['activeFrom', 'activeTo']}
          className="flex-none"
          warning={
            yearsBackwards(activeFrom, activeTo)
              ? 'The last year is before the first.'
              : null
          }
        >
          <div className="flex items-center gap-2">
            <YearInput
              label="Active from"
              value={activeFrom}
              onChange={(year) => patch({ activeFrom: year })}
              placeholder="From"
            />
            <span className="text-white/35">–</span>
            <YearInput
              label="Active to"
              value={activeTo}
              onChange={(year) => patch({ activeTo: year })}
              placeholder="Now"
            />
          </div>
        </Field>
      </FieldRow>

      <Field
        label="Genres"
        field="genreIds"
        wide
        hint="Genres or subgenres, in any order."
      >
        <EntityMultiPicker
          kind={GENRE_KINDS}
          aria-label="Genres"
          value={readStrings(body.genreIds)}
          onChange={(ids) => patch({ genreIds: optionalList(ids) })}
          disabled={readOnly}
        />
      </Field>

      <Field
        label="Instruments"
        field="instrumentIds"
        wide
        hint="What they are known for playing."
      >
        <EntityMultiPicker
          kind="instrument"
          aria-label="Instruments"
          value={readStrings(body.instrumentIds)}
          onChange={(ids) => patch({ instrumentIds: optionalList(ids) })}
          disabled={readOnly}
        />
      </Field>

      <Field
        label="Labels"
        field="labelIds"
        wide
        hint="Labels they were signed to."
      >
        <EntityMultiPicker
          kind="label"
          aria-label="Labels"
          value={readStrings(body.labelIds)}
          onChange={(ids) => patch({ labelIds: optionalList(ids) })}
          allowCreate
          disabled={readOnly}
        />
      </Field>

      {(group || members.length > 0) && (
        <MembersField
          self={slug}
          members={members}
          // What was read is written back as it was, plus the edit.
          onChange={(next) =>
            patch({ members: optionalList(next) as ArtistMember[] | undefined })
          }
        />
      )}

      <InfluencesField
        self={slug}
        influences={influences}
        onChange={(next) =>
          patch({
            influencedBy: optionalList(next) as ArtistInfluence[] | undefined,
          })
        }
      />

      <TextField
        label="Bio"
        field="bio"
        multiline
        value={readString(body.bio)}
        onChange={(bio) => patch({ bio })}
        placeholder="A few sentences for the console's artist view."
      />

      <RecordMetaRow body={body} patch={patch} />
    </EditorColumn>
  );
};

// ── References ───────────────────────────────────────────────────────────────

/** A reference row's flags as its RefRow shows them. */
const shownMeta = (ref: Body): RefMetaValue => ({
  unverified: ref.unverified === true || undefined,
  source: readString(ref.source),
});

/**
 * A list of artist references (members, influences): each row edited in
 * place, leaving its other keys as they are; a refusal says why and changes
 * nothing, and any edit that goes through clears it.
 */
function useRefList(rows: Body[], onChange: (next: Body[]) => void) {
  const [notice, setNotice] = useState<string | null>(null);
  const change = (next: Body[]) => {
    setNotice(null);
    onChange(next);
  };
  return {
    notice,
    refuse: setNotice,
    change,
    set: (i: number, p: object) =>
      change(rows.map((row, n) => (n === i ? patchBody(row, p) : row))),
    remove: (i: number) => change(rows.filter((_, n) => n !== i)),
  };
}

// ── Members ──────────────────────────────────────────────────────────────────

const MembersField: FC<{
  self: string | undefined;
  members: Body[];
  onChange: (next: Body[]) => void;
}> = ({ self, members, onChange }) => {
  const readOnly = useReadOnly();
  const list = useRefList(members, onChange);
  // Membership may not loop (REF_PATHS `acyclic: 'member_of'`): a group
  // cannot take on an artist that already has it among their own members.
  const artists = useServedBodies('artist');
  const membersOf = (slug: string) =>
    readObjects(artists.get(slug)?.members).flatMap(
      (m) => readString(m.artistId) ?? [],
    );
  const pick = (artistId: string | null, at?: number) => {
    if (!artistId) {
      // A member with no artist is not a member: clearing removes it.
      if (at !== undefined) list.remove(at);
      return;
    }
    const why = memberRefusal(self, members, artistId, membersOf, at);
    if (why) list.refuse(why);
    else if (at === undefined) list.change([...members, { artistId }]);
    else list.set(at, { artistId });
  };

  return (
    <Field label="Members" field="members" wide warning={list.notice}>
      <div className="flex flex-col gap-2">
        {members.map((member, i) => {
          const artistId = readString(member.artistId);
          const shown = shownMeta(member);
          return (
            <div
              key={`${artistId ?? ''}|${i}`}
              role="group"
              aria-label={`Member ${i + 1}`}
            >
              <RefRow
                meta={shown}
                onMeta={(meta) => list.set(i, metaChange(shown, meta))}
                trailing={
                  <RemoveButton
                    title={`Remove member ${i + 1}`}
                    onClick={() => list.remove(i)}
                  />
                }
              >
                <EntityPicker
                  kind="artist"
                  aria-label={`Member ${i + 1}`}
                  value={artistId}
                  onChange={(slug) => pick(slug, i)}
                  allowCreate
                />
                <YearInput
                  label={`Member ${i + 1} joined`}
                  value={readNumber(member.from)}
                  onChange={(year) => list.set(i, { from: year })}
                  placeholder="Joined"
                  className="w-20"
                />
                <YearInput
                  label={`Member ${i + 1} left`}
                  value={readNumber(member.to)}
                  onChange={(year) => list.set(i, { to: year })}
                  placeholder="Left"
                  className="w-20"
                />
                <EntityMultiPicker
                  kind="instrument"
                  aria-label={`Member ${i + 1} instruments`}
                  value={readStrings(member.instrumentIds)}
                  onChange={(ids) =>
                    list.set(i, { instrumentIds: optionalList(ids) })
                  }
                  disabled={readOnly}
                />
              </RefRow>
            </div>
          );
        })}
        {!readOnly && (
          <EntityPicker
            kind="artist"
            aria-label="Add a member"
            placeholder="Add a member…"
            value={null}
            onChange={(slug) => pick(slug)}
            allowCreate
          />
        )}
      </div>
    </Field>
  );
};

// ── Influences ───────────────────────────────────────────────────────────────

const InfluencesField: FC<{
  self: string | undefined;
  influences: Body[];
  onChange: (next: Body[]) => void;
}> = ({ self, influences, onChange }) => {
  const readOnly = useReadOnly();
  const list = useRefList(influences, onChange);
  const pick = (artistId: string | null, at?: number) => {
    if (!artistId) {
      if (at !== undefined) list.remove(at);
      return;
    }
    const why = influenceRefusal(self, influences, artistId, at);
    if (why) list.refuse(why);
    else if (at === undefined) list.change([...influences, { artistId }]);
    else list.set(at, { artistId });
  };

  return (
    <Field
      label="Influenced by"
      field="influencedBy"
      wide
      warning={list.notice}
      hint="Stated outright: no other record implies it."
    >
      <div className="flex flex-col gap-2">
        {influences.map((influence, i) => {
          const artistId = readString(influence.artistId);
          const shown = shownMeta(influence);
          return (
            <div
              key={`${artistId ?? ''}|${i}`}
              role="group"
              aria-label={`Influence ${i + 1}`}
            >
              <RefRow
                meta={shown}
                onMeta={(meta) => list.set(i, metaChange(shown, meta))}
                trailing={
                  <RemoveButton
                    title={`Remove influence ${i + 1}`}
                    onClick={() => list.remove(i)}
                  />
                }
              >
                <EntityPicker
                  kind="artist"
                  aria-label={`Influence ${i + 1}`}
                  value={artistId}
                  onChange={(slug) => pick(slug, i)}
                  allowCreate
                />
              </RefRow>
            </div>
          );
        })}
        {!readOnly && (
          <EntityPicker
            kind="artist"
            aria-label="Add an influence"
            placeholder="Add an influence…"
            value={null}
            onChange={(slug) => pick(slug)}
            allowCreate
          />
        )}
      </div>
    </Field>
  );
};

// ── Born ─────────────────────────────────────────────────────────────────────

/**
 * The artist body level that takes `born` (contract §2): artist 2 is the
 * body with it, the version 4 draft. A server at level 1 runs the strict
 * body without it and would refuse the whole save, so below this Born is
 * shown, not edited.
 */
export const BORN_ARTIST_LEVEL = 2;

/**
 * What is wrong with a Born date as written, or null. Its shape is the API
 * schema's own (`artistBirthSchema`, generated from the `@pattern` on
 * `ArtistBirth.date`), so the editor and the API cannot disagree; the day
 * and the year are the calendar's, as integrity checks them.
 */
export function bornDateProblem(
  date: string,
  thisYear = new Date().getFullYear(),
): string | null {
  if (!artistBirthSchema.shape.date.safeParse(date).success) {
    return 'Write a year, a year and month, or a full date: 1939, 1939-04 or 1939-04-02.';
  }
  const year = yearOf(date);
  if (year === null || !isCalendarDate(date)) {
    return `${date} is not a date the calendar has.`;
  }
  if (year > thisYear) return `${year} is still to come.`;
  return null;
}

/**
 * Born, or Formed for a group. Exported so it can be tested on its own.
 *
 * `born` (`ArtistBirth`, design decision 6) is a date as 'YYYY', 'YYYY-MM' or
 * 'YYYY-MM-DD' and a birthplace, for people only: a band's City is where it
 * formed. Born is its date or its place: with neither, it goes, so its flags
 * and source wait until one is there (on their own they would be dropped).
 * A birthplace created here is a place, not a globe pin.
 *
 * Editable only on a server that takes it (`BORN_ARTIST_LEVEL`). Below that
 * a stored Born is shown with a way to remove it, since the save would fail
 * with it.
 */
export const BornFields: FC<{
  value: unknown;
  group: boolean;
  onChange: (next: ArtistBirth | undefined) => void;
}> = ({ value, group, onChange }) => {
  const readOnly = useReadOnly();
  const level = useCapabilities().schemaVersionOf('artist');
  const saveable = level >= BORN_ARTIST_LEVEL;
  const born = readObject(value) ?? {};
  const set = (p: Patch<ArtistBirth>) => {
    const next = patchBody(born, p);
    if (next === born) return;
    onChange(
      readString(next.date) || readString(next.placeId)
        ? (next as ArtistBirth)
        : undefined,
    );
  };
  const date = readString(born.date);
  const placeId = readString(born.placeId);
  const shown = shownMeta(born);
  const label = group ? 'Formed' : 'Born';
  const stored = value !== undefined;
  const hint = !saveable
    ? `Saved once the server takes an artist's Born (artist schema ${BORN_ARTIST_LEVEL}; this one is at ${level || 'none'}).`
    : group
      ? 'The year the band formed. Where it formed is its City.'
      : 'A year, a year and month, or a full date.';
  return (
    <Field
      label={label}
      field={['born', 'born.date', 'born.placeId']}
      wide
      warning={
        !saveable && stored
          ? 'This server refuses an artist with Born: remove it to save.'
          : date
            ? bornDateProblem(date)
            : null
      }
      hint={hint}
    >
      <div role="group" aria-label={label}>
        <fieldset disabled={!saveable} className="m-0 min-w-0 border-0 p-0">
          <RefRow
            meta={shown}
            onMeta={(meta) => set(metaChange(shown, meta))}
            flagsDisabled={
              date || placeId ? undefined : 'Set a date or a place first.'
            }
          >
            <FieldInput
              aria-label={group ? 'Year formed' : 'Date of birth'}
              value={date ?? ''}
              onChange={(e) =>
                set({ date: e.target.value.trim() || undefined })
              }
              placeholder={group ? '1977' : '1939-04-02'}
              className={`${inputClass} w-32`}
            />
            {(!group || placeId) && (
              <EntityPicker
                kind="place"
                aria-label="Birthplace"
                placeholder="Birthplace…"
                value={placeId}
                onChange={(place) => set({ placeId: place ?? undefined })}
                allowCreate
                newPlacePin={false}
              />
            )}
          </RefRow>
        </fieldset>
        {group && placeId && (
          <p className="mt-1.5 text-xs text-amber-300/80">
            A band&apos;s birthplace is not read: where it formed is its City.
            Move it there.
          </p>
        )}
        {!saveable && stored && !readOnly && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="mt-1.5 text-xs text-white/60 underline underline-offset-2 hover:text-white"
          >
            Remove {label}
          </button>
        )}
      </div>
    </Field>
  );
};
