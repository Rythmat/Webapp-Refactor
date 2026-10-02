import { ArrowUpRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '@/curriculum/types/songLibrary';
import { toConsolePath } from '../../content/mirror/mirrorPaths';
import {
  EditorColumn,
  Field,
  FieldInput,
  FieldRow,
  inputClass,
  patchBody,
  readNumber,
  readString,
  type RecordEditorProps,
  TextField,
  YearField,
} from '../../content/recordEditors/shared';
import { coerceSongDraft } from '../../content/songChart/chartOps';
import { ConnectionsPanel } from '../../content/songEditor/ConnectionsPanel';

/**
 * A song's Details in the row panel (design §3.3, "Song panel"): its title,
 * year and popularity, its key as the chart has it, and its connections —
 * the lead act, credits, where it was recorded, the records it is on, other
 * recordings and genres — in the song editor's own `ConnectionsPanel`, with
 * the v2 pickers where the server takes song v2. Every column of the Songs
 * table that the row states itself has its field here, as every table's
 * panel must (TableDetailPanel.test.tsx checks each one's anchors).
 *
 * The key is the chart's (every chord is a degree of it), so it is shown
 * here and edited on the song's page, never in the Table. So is the chart
 * itself: the row header's "Full editor ↗" opens it.
 *
 * Writes go field by field (`patchBody`): a cleared field is removed — the
 * title, which a song needs, is kept even empty, and the save names it —
 * and an edit that changes nothing is none. A popularity outside 0–100 is
 * refused where it is typed, and `onRefused` tells the panel, whose Save
 * waits until it is put right. Read-only disables every control.
 *
 * "New …" asks for a song's title in its own first fields, so it passes
 * `title={false}` and the form has one Title.
 */

const keyText = (body: Record<string, unknown>): string | undefined => {
  const key = readString(body.key)?.trim();
  const mode = readString(body.mode)?.trim();
  if (!key) return undefined;
  // "D minor" already says it; "D" with mode "minor" does not.
  return mode && !key.toLowerCase().includes(mode.toLowerCase())
    ? `${key} ${mode}`
    : key;
};

/**
 * A popularity as typed: blank is none (the field is removed), a whole
 * number from 0 to 100 is the value, and anything else is refused.
 */
function readPopularity(
  raw: string,
): { value: number | undefined } | { problem: string } {
  const typed = raw.trim();
  if (!typed) return { value: undefined };
  const n = /^\d+$/.test(typed) ? Number(typed) : NaN;
  return n >= 0 && n <= 100
    ? { value: n }
    : { problem: 'Popularity is a whole number from 0 to 100.' };
}

/**
 * Popularity (0–100: higher is more prominent in the song library's
 * browse). What cannot be written stays in the box, with why, until it is
 * put right. The draft keeps the value it had, which may be one typed on
 * the way ("15" on the way to "150"), so `onRefused` has the panel hold its
 * Save meanwhile: the box and what a save writes never differ.
 *
 * A value that changes from outside (Discard, a reload, an accepted
 * suggestion) replaces what was refused. A text box, not a number one: a
 * number box reports a lone "-" as empty, which would read as clearing it.
 */
const PopularityField = ({
  value,
  onChange,
  onRefused,
}: {
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  onRefused?: (problem: string | null) => void;
}) => {
  // What was refused, over the value the draft held when it was typed.
  const [typed, setTyped] = useState<{
    text: string;
    problem: string;
    over: number | undefined;
  } | null>(null);
  const refused = typed && typed.over === value ? typed : null;
  // Dropped for good once replaced, so it cannot come back with the value.
  if (typed && !refused) setTyped(null);
  const problem = refused?.problem ?? null;
  useEffect(() => {
    onRefused?.(problem);
    return () => onRefused?.(null);
  }, [onRefused, problem]);
  return (
    <Field
      label="Popularity"
      field="popularity"
      hint="0–100: higher shows first when browsing songs."
      warning={problem}
      className="flex-none"
    >
      <FieldInput
        aria-label="Popularity"
        type="text"
        inputMode="numeric"
        value={refused?.text ?? value ?? ''}
        onChange={(e) => {
          const read = readPopularity(e.target.value);
          if ('problem' in read) {
            setTyped({
              text: e.target.value,
              problem: read.problem,
              over: value,
            });
            return;
          }
          setTyped(null);
          onChange(read.value);
        }}
        placeholder="0–100"
        className={`${inputClass} w-24`}
      />
    </Field>
  );
};

export const SongDetails = ({
  body,
  onChange,
  readOnly = false,
  title = true,
  onRefused,
}: RecordEditorProps & {
  /** Show the Title field; "New …" asks for it first, in its own fields. */
  title?: boolean;
  /** Why the draft cannot be saved as the boxes show it, or null. */
  onRefused?: (problem: string | null) => void;
}) => {
  // Render-only, as the song page editor reads it: defaults filled in here
  // are never written back.
  const song = useMemo(() => coerceSongDraft(body), [body]);
  const patch = (p: Partial<Song>) => {
    if (readOnly) return;
    const next = patchBody(body, p);
    if (next !== body) onChange(next);
  };
  const slug = readString(body.id);
  const key = keyText(body);

  return (
    <EditorColumn label="Song details" readOnly={readOnly}>
      {title && (
        <TextField
          label="Title"
          field="title"
          required
          value={readString(body.title)}
          onChange={(next) => patch({ title: next ?? '' })}
        />
      )}
      <FieldRow>
        <YearField
          label="Year"
          field="year"
          value={readNumber(body.year)}
          onChange={(year) => patch({ year })}
          hint="The year the recording came out."
        />
        <Field
          label="Key"
          field={['key', 'mode', 'keyRoot']}
          hint={
            slug ? (
              <Link
                to={toConsolePath(`/songs/${encodeURIComponent(slug)}?edit=1`)}
                className="inline-flex items-center gap-1 text-white/55 hover:text-white hover:underline"
              >
                Edit in page editor
                <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            ) : undefined
          }
        >
          <p className="py-1 text-sm text-white/85">
            {key ?? <span className="text-white/40">No key yet.</span>}
          </p>
        </Field>
        <PopularityField
          value={readNumber(body.popularity)}
          onChange={(popularity) => patch({ popularity })}
          onRefused={onRefused}
        />
      </FieldRow>
      <ConnectionsPanel song={song} onPatch={patch} />
    </EditorColumn>
  );
};
