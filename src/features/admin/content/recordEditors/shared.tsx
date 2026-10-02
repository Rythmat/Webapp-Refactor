import { Trash2, X } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/components/utilities';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { useContentExport } from '@/hooks/data/admin/useContentExport';
import { CONSOLE_LABEL, consoleTabClass } from '../../ui/styles';
import type { StructuredEditorProps } from '../editorTypes';
import { RefRow, type RefMetaValue } from '../entities/RefRow';
import { optionalYear, parseCoordinates, yearsBackwards } from './parse';

/**
 * What the record editors share: reading a body that may be half-typed,
 * writing one field at a time, and the few controls every record needs.
 *
 * The rule for writing (design §3.3, phase D): an editor patches only the
 * field the author changed. It never fills in a default, never touches a
 * neighbouring key, and a cleared optional field is removed rather than left
 * as '' or []. A field the schema requires keeps its key: a required name
 * cleared is '', a required list emptied is []. References are bare slugs —
 * the field's name says the kind — exactly as the pickers hand them over.
 * An edit that leaves the body as it was (the same list, an equal pair of
 * numbers) is no edit: `onChange` does not fire.
 */

export type Body = Record<string, unknown>;

/** A patch over a body of type T: each key set, or `undefined` to remove it. */
export type Patch<T> = { [K in keyof T]?: T[K] | undefined };

/**
 * A record editor's props: a `StructuredEditor`'s, plus read-only for when
 * nothing can be saved — repo mode (design §3.4), a kind the server does not
 * serve, an item waiting on review. Optional, so every record editor is also
 * a plain `StructuredEditor`.
 */
export interface RecordEditorProps extends StructuredEditorProps {
  readOnly?: boolean;
}

// ── Reading ──────────────────────────────────────────────────────────────────
// A draft can hold anything (a half-typed JSON pane, an older import), so the
// editors read through these rather than trusting a cast.

export const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const readStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

export const readNumbers = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((v): v is number => typeof v === 'number')
    : [];

const isObject = (value: unknown): value is Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readObject = (value: unknown): Body | undefined =>
  isObject(value) ? value : undefined;

export const readObjects = (value: unknown): Body[] =>
  Array.isArray(value) ? value.filter(isObject) : [];

export const readCoordinates = (
  value: unknown,
): [number, number] | undefined =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((v) => typeof v === 'number' && Number.isFinite(v))
    ? (value as [number, number])
    : undefined;

// ── Writing ──────────────────────────────────────────────────────────────────

const has = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

/**
 * Equal as the stored JSON is: the same primitives, and arrays and plain
 * objects equal part by part. A list rebuilt with the same entries, or a
 * pair of numbers typed as "42.330" where "42.33" was, is the same value.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => sameValue(v, b[i]))
    );
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((k) => has(b, k) && sameValue(a[k], b[k]))
    );
  }
  return false;
}

/**
 * `body` with each key in `patch` set, or removed where the patch says
 * `undefined`. The same object back when nothing changes, so a caller can
 * tell a real edit from a no-op.
 */
export function patchBody(body: Body, patch: object): Body {
  let next: Body | null = null;
  for (const [key, value] of Object.entries(patch) as [string, unknown][]) {
    const present = has(body, key);
    if (
      value === undefined ? !present : present && sameValue(body[key], value)
    ) {
      continue;
    }
    next ??= { ...body };
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next ?? body;
}

/**
 * A patcher over one body that calls `onChange` only for a real change, and
 * never when read-only (the fieldset disables the controls; this makes sure
 * nothing that slips past it writes). Typed by the record, so a key the
 * record does not have, or a value of the wrong type, does not compile.
 */
export const bodyPatcher =
  <T,>(body: Body, onChange: (next: Body) => void, readOnly = false) =>
  (patch: Patch<T>) => {
    if (readOnly) return;
    const next = patchBody(body, patch);
    if (next !== body) onChange(next);
  };

/** An optional text field's value: blank is absent. */
export const optionalText = (raw: string): string | undefined =>
  raw.trim() ? raw : undefined;

/** An id pasted into a field: no surrounding space, blank is absent. */
export const optionalId = (raw: string): string | undefined =>
  raw.trim() || undefined;

// How a typed year, span or pair reads: `parse.ts`, where the Table's cells
// read them too.
export { optionalYear, parseCoordinates, yearsBackwards };

/** An optional list: empty is absent. */
export const optionalList = <T,>(list: T[]): T[] | undefined =>
  list.length ? list : undefined;

/**
 * A nested object (a member, `externalIds`, `born`) without its blank keys;
 * `undefined` when nothing is left, so the parent can drop the whole field.
 * For a value built from scratch — an edit to one that is stored goes
 * through `patchBody`, which leaves the keys it was not asked about alone.
 */
export function compact<T extends object>(value: T): T | undefined {
  const kept = Object.entries(value).filter(
    ([, v]) => v !== undefined && v !== '',
  );
  return kept.length ? (Object.fromEntries(kept) as T) : undefined;
}

/** A record's own flags, or a reference's (RefMeta in types.ts). */
export interface RecordMeta {
  unverified?: boolean;
  source?: string;
}

/**
 * What an edit in a RefRow changed, and only that. RefRow hands back the
 * whole meta with one key moved; writing both keys back would rewrite the
 * one nobody touched — drop a stored `unverified: false` when the source is
 * edited, or clear a blank source when the box is ticked.
 */
export function metaChange(
  shown: RefMetaValue,
  next: RefMetaValue,
): Patch<RecordMeta> {
  const change: Patch<RecordMeta> = {};
  if (!!next.unverified !== !!shown.unverified) {
    change.unverified = next.unverified || undefined;
  }
  if ((next.source ?? '') !== (shown.source ?? '')) {
    change.source = next.source ? optionalText(next.source) : undefined;
  }
  return change;
}

// ── Cycles ───────────────────────────────────────────────────────────────────

/**
 * A kind's stored bodies by slug, for the walks that refuse a loop
 * (refusals.ts): from the console's shared export loader — the rows the
 * pickers already loaded, so this costs no request. Empty where the server
 * does not serve the kind (the API still refuses a loop there).
 */
export function useServedBodies(kind: ContentKind): ReadonlyMap<string, Body> {
  const { data } = useContentExport(kind);
  return useMemo(() => {
    const map = new Map<string, Body>();
    for (const row of data?.rows ?? []) {
      const body = row.body ?? row.pendingBody;
      if (body) map.set(row.slug, body);
    }
    return map;
  }, [data]);
}

// ── Read-only, and what a Field says about its control ──────────────────────

const ReadOnlyContext = createContext(false);

/** True inside an editor shown read-only: hide the adders and removers. */
export const useReadOnly = () => useContext(ReadOnlyContext);

interface FieldAria {
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

const FieldAriaContext = createContext<FieldAria>({});

/** What the Field a control sits in says about it: its warning and hint. */
export const useFieldAria = () => useContext(FieldAriaContext);

/** An `<input>` described by its Field's warning and hint. */
export const FieldInput: FC<ComponentProps<'input'>> = (props) => {
  const aria = useFieldAria();
  return <input {...aria} {...props} />;
};

export const FieldSelect: FC<ComponentProps<'select'>> = (props) => {
  const aria = useFieldAria();
  return <select {...aria} {...props} />;
};

export const FieldTextarea: FC<ComponentProps<'textarea'>> = (props) => {
  const aria = useFieldAria();
  return <textarea {...aria} {...props} />;
};

// ── Layout ───────────────────────────────────────────────────────────────────

export const inputClass =
  'min-w-0 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-sm text-white/85 placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-60';

/**
 * The editors' outer column; the page or the panel supplies the padding.
 * Read-only disables every control inside at once (the fieldset does it,
 * the pickers' triggers included) and tells the adders to stand down.
 */
export const EditorColumn: FC<{
  children: ReactNode;
  label: string;
  readOnly?: boolean;
}> = ({ children, label, readOnly = false }) => (
  <section aria-label={label}>
    <ReadOnlyContext.Provider value={readOnly}>
      <fieldset
        disabled={readOnly}
        className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0"
      >
        {children}
      </fieldset>
    </ReadOnlyContext.Provider>
  </section>
);

/** Fields that sit side by side and wrap in a narrow panel. */
export const FieldRow: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-4">{children}</div>
);

/**
 * `[data-field~="<path>"]`: where the Table scrolls and focuses for a cell
 * or a suggestion. A Field names the body key (or keys) it edits in
 * `data-field`, space-separated where one Field edits several.
 */
export const fieldSelector = (path: string) => `[data-field~="${path}"]`;

export const Field: FC<{
  label: string;
  children: ReactNode;
  /** The body key(s) this field edits: its `data-field` anchor. */
  field?: string | readonly string[];
  hint?: ReactNode;
  warning?: ReactNode;
  required?: boolean;
  /** Take the whole row rather than share it. */
  wide?: boolean;
  className?: string;
}> = ({ label, children, field, hint, warning, required, wide, className }) => {
  const id = useId();
  const warningId = `${id}warning`;
  const hintId = `${id}hint`;
  const describedBy =
    [warning ? warningId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(' ') || undefined;
  const aria = useMemo<FieldAria>(
    () => ({
      'aria-describedby': describedBy,
      'aria-invalid': warning ? true : undefined,
    }),
    [describedBy, warning],
  );
  return (
    <div
      data-field={typeof field === 'string' ? field : field?.join(' ')}
      className={cn(
        'flex min-w-0 flex-col',
        wide ? 'basis-full' : 'flex-1 basis-44',
        className,
      )}
    >
      <span className={cn(CONSOLE_LABEL, 'mb-1.5')}>
        {label}
        {required && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-white/30">
            required
          </span>
        )}
      </span>
      <FieldAriaContext.Provider value={aria}>
        {children}
      </FieldAriaContext.Provider>
      {/* Always there, so a refusal that appears is read out. */}
      <div role="status">
        {warning && (
          <p id={warningId} className="mt-1.5 text-xs text-amber-300/80">
            {warning}
          </p>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-white/40">
          {hint}
        </p>
      )}
    </div>
  );
};

export const RemoveButton: FC<{ onClick: () => void; title: string }> = ({
  onClick,
  title,
}) => {
  const readOnly = useReadOnly();
  if (readOnly) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="shrink-0 rounded p-1 text-white/25 transition-colors hover:bg-white/5 hover:text-white/70"
    >
      <Trash2 size={13} />
    </button>
  );
};

/**
 * A checkbox over a fixed vocabulary, drawn as a pill. `note` is read out
 * with it and shown on hover.
 */
export const TagToggle: FC<{
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  note?: string;
}> = ({ label, checked, onToggle, note }) => {
  const noteId = useId();
  return (
    <>
      <label
        title={note}
        className={`cursor-pointer ${consoleTabClass(checked, 'sm')} has-[:disabled]:cursor-default has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white/40`}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          aria-describedby={note ? noteId : undefined}
        />
        {label}
      </label>
      {/* Beside the label, not in it: a description, not part of the name. */}
      {note && (
        <span id={noteId} className="sr-only">
          {note}
        </span>
      )}
    </>
  );
};

export const CheckboxField: FC<{
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  title?: string;
}> = ({ label, checked, onChange, title }) => {
  const aria = useFieldAria();
  return (
    <label
      title={title}
      className="flex items-center gap-2 self-start text-sm text-white/75"
    >
      <input
        {...aria}
        type="checkbox"
        className="accent-white"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
};

// ── Scalar fields ────────────────────────────────────────────────────────────

/**
 * One line (or a paragraph) of text. Optional text is removed when blanked;
 * required text keeps its key, even empty, and the save names what is
 * missing.
 */
export const TextField: FC<{
  label: string;
  field: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  warning?: ReactNode;
  wide?: boolean;
}> = ({
  label,
  field,
  value,
  onChange,
  required,
  multiline,
  placeholder,
  hint,
  warning,
  wide,
}) => {
  const change = (raw: string) => onChange(required ? raw : optionalText(raw));
  const missing = required && !value?.trim();
  return (
    <Field
      label={label}
      field={field}
      required={required}
      hint={hint}
      warning={warning ?? (missing ? `Needs ${label.toLowerCase()}.` : null)}
      wide={wide ?? multiline}
    >
      {multiline ? (
        <FieldTextarea
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => change(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <FieldInput
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => change(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </Field>
  );
};

/** A year input on its own, for rows that lay several out together. */
export const YearInput: FC<{
  label: string;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  placeholder?: string;
  className?: string;
}> = ({ label, value, onChange, placeholder, className }) => (
  <FieldInput
    aria-label={label}
    type="number"
    inputMode="numeric"
    value={value ?? ''}
    onChange={(e) => onChange(optionalYear(e.target.value))}
    placeholder={placeholder ?? 'Year'}
    className={cn(inputClass, 'w-24', className)}
  />
);

export const YearField: FC<{
  label: string;
  field: string;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  placeholder?: string;
  hint?: ReactNode;
  warning?: ReactNode;
}> = ({ label, field, value, onChange, placeholder, hint, warning }) => (
  <Field
    label={label}
    field={field}
    hint={hint}
    warning={warning}
    className="flex-none"
  >
    <YearInput
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </Field>
);

/** One chip of a list, with its note read out (and shown on hover). */
const Chip: FC<{
  children: ReactNode;
  note?: string;
  /** Shown but connected to nothing: dashed and muted, and says so. */
  muted?: boolean;
  onRemove: () => void;
  removeLabel: string;
}> = ({ children, note, muted, onRemove, removeLabel }) => {
  const readOnly = useReadOnly();
  return (
    <span
      title={note}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs',
        muted
          ? 'border-dashed border-white/15 text-white/45'
          : 'border-white/[0.12] text-white/85',
      )}
    >
      {children}
      {muted && <span className="text-white/35">· unlinked</span>}
      {note && <span className="sr-only">: {note}</span>}
      {!readOnly && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="text-white/40 hover:text-white"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
};

/**
 * A plain list of text: aliases, a city's scene genres. Enter adds, the
 * chip's × removes; a spelling already there (case aside) is not added twice.
 * Backspace in the empty box takes the last chip — one per press, never a
 * held key's repeats, which would empty the list.
 * The caller decides whether an emptied list is removed or kept as [].
 */
export const StringListField: FC<{
  label: string;
  field: string;
  /** What one entry is called: "alias" → "Add alias". */
  itemLabel: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: ReactNode;
  /** Extra per chip: a note, and whether it connects to nothing. */
  describe?: (value: string) => { note?: string; muted?: boolean };
}> = ({
  label,
  field,
  itemLabel,
  values,
  onChange,
  placeholder,
  hint,
  describe,
}) => {
  const readOnly = useReadOnly();
  const [draft, setDraft] = useState('');
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    const folded = value.toLowerCase();
    if (!values.some((v) => v.toLowerCase() === folded)) {
      onChange([...values, value]);
    }
    setDraft('');
  };
  return (
    <Field label={label} field={field} hint={hint} wide>
      <div
        role="group"
        aria-label={label}
        className="flex flex-wrap items-center gap-1.5"
      >
        {values.map((value, i) => (
          <Chip
            key={`${value}|${i}`}
            {...describe?.(value)}
            onRemove={() => onChange(values.filter((_, n) => n !== i))}
            removeLabel={`Remove ${value}`}
          >
            {value}
          </Chip>
        ))}
        {readOnly ? (
          values.length === 0 && (
            <span className="text-xs text-white/35">None</span>
          )
        ) : (
          <FieldInput
            aria-label={`Add ${itemLabel}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              } else if (
                e.key === 'Backspace' &&
                !e.repeat &&
                !draft &&
                values.length
              ) {
                onChange(values.slice(0, -1));
              }
            }}
            onBlur={add}
            placeholder={placeholder ?? `Add ${itemLabel}…`}
            className={cn(inputClass, 'h-7 w-36 rounded-full px-2.5 text-xs')}
          />
        )}
      </div>
    </Field>
  );
};

/** Other spellings that resolve to the record; absent when there are none. */
export const AliasesField: FC<{
  body: Body;
  patch: (p: Patch<{ aliases?: string[] }>) => void;
}> = ({ body, patch }) => (
  <StringListField
    label="Aliases"
    field="aliases"
    itemLabel="alias"
    values={readStrings(body.aliases)}
    onChange={(aliases) => patch({ aliases: optionalList(aliases) })}
    hint="Other spellings that should find this record."
  />
);

/**
 * `[lat, lng]`, written only as a pair: a half-typed pair stays in the inputs
 * until both halves read as coordinates, so the body never holds one number.
 * Blanking both removes an optional pair; a required one keeps its last value.
 * 0, 0 is written (it is a pair) but flagged: it is a new place's
 * placeholder, and it would pin in the Gulf of Guinea.
 */
export const CoordinatesField: FC<{
  value: [number, number] | undefined;
  onChange: (next: [number, number] | undefined) => void;
  field?: string;
  required?: boolean;
  label?: string;
  hint?: ReactNode;
}> = ({
  value,
  onChange,
  field = 'coordinates',
  required,
  label = 'Coordinates',
  hint,
}) => {
  // The typed text, and the value it was typed against: when the body moves
  // on without this field (an accepted suggestion, a reload), the text yields.
  const [draft, setDraft] = useState<{
    text: [string, string];
    against: string;
  } | null>(null);
  const current = value ? value.join(',') : '';
  const text: [string, string] =
    draft && draft.against === current
      ? draft.text
      : value
        ? [String(value[0]), String(value[1])]
        : ['', ''];

  const edit = (i: 0 | 1, raw: string) => {
    const next: [string, string] = i === 0 ? [raw, text[1]] : [text[0], raw];
    const parsed = parseCoordinates(next);
    const blank = !next[0].trim() && !next[1].trim();
    if (parsed) {
      setDraft({ text: next, against: parsed.join(',') });
      onChange(parsed);
    } else if (blank && !required) {
      setDraft({ text: next, against: '' });
      onChange(undefined);
    } else {
      setDraft({ text: next, against: current });
    }
  };

  const typed = text[0].trim() || text[1].trim();
  const parsed = parseCoordinates(text);
  const problem =
    (typed || required) && !parsed
      ? 'Needs both: latitude −90 to 90, longitude −180 to 180.'
      : parsed && parsed[0] === 0 && parsed[1] === 0
        ? '0, 0 is not a place — set its coordinates.'
        : null;

  return (
    <Field
      label={label}
      field={field}
      required={required}
      hint={hint}
      warning={problem}
    >
      <div className="flex items-center gap-2">
        <FieldInput
          aria-label="Latitude"
          inputMode="decimal"
          value={text[0]}
          onChange={(e) => edit(0, e.target.value)}
          placeholder="Latitude"
          className={cn(inputClass, 'w-28')}
        />
        <FieldInput
          aria-label="Longitude"
          inputMode="decimal"
          value={text[1]}
          onChange={(e) => edit(1, e.target.value)}
          placeholder="Longitude"
          className={cn(inputClass, 'w-28')}
        />
      </div>
    </Field>
  );
};

// ── Record-level flags ───────────────────────────────────────────────────────

/**
 * The record's own "unconfirmed" and source (every record kind but places
 * has them): the same RefRow the reference rows use, for the whole record.
 */
export const RecordMetaRow: FC<{
  body: Body;
  patch: (p: Patch<RecordMeta>) => void;
}> = ({ body, patch }) => {
  const shown: RefMetaValue = {
    unverified: body.unverified === true || undefined,
    source: readString(body.source),
  };
  return (
    <Field label="This record" field={['unverified', 'source']} wide>
      <div role="group" aria-label="This record">
        <RefRow meta={shown} onMeta={(meta) => patch(metaChange(shown, meta))}>
          <span className="text-xs text-white/45">
            Unconfirmed records read muted everywhere they show.
          </span>
        </RefRow>
      </div>
    </Field>
  );
};

// ── External ids ─────────────────────────────────────────────────────────────

// A record's `externalIds` (other catalogues' ids for it) has no field in
// the console: the site names no outside catalogue (owner decision of 30
// September 2026). The schema keeps the field for the API contract, and an
// editor that owns the key passes a stored value through untouched.
