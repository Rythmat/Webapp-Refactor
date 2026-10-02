import { X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import type { EntityId } from '@/content/graph/types';
import type { SongMode } from '@/curriculum/types/songLibrary';
import {
  ContentApiError,
  type ContentKind,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { ProgressionDraftNote } from '../../content/chords/ProgressionDraftNote';
import {
  API_ONLY_KINDS,
  CONTENT_KIND_OF,
  type PickerKind,
} from '../../content/entities/entityKinds';
import { addSessionEntity } from '../../content/entities/sessionEntities';
import { useItemSession } from '../../content/itemEditor/useItemSession';
import { kindLabel } from '../../content/publishing/kindLabels';
import { recordEditorFor } from '../../content/recordEditors';
import {
  EditorColumn,
  Field,
  FieldRow,
  inputClass,
  readNumber,
  readString,
} from '../../content/recordEditors/shared';
import {
  buildKeyString,
  keyRootForPitchClass,
  NOTE_NAMES,
  pitchClass,
  SONG_MODES,
} from '../../content/songEditor/songDefaults';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { useCloseRow } from '../grid/rowHistory';
import { NEW_PARAM, searchOf } from '../grid/tableQuery';
import type { TableModel, TableRow } from '../model/types';
import { tableHref } from '../tablePaths';
import { EventDetails } from './EventPanel';
import { PanelFrame } from './PanelFrame';
import { PanelSaveBar } from './PanelSaveBar';
import { PanelSection } from './PanelSection';
import { SongDetails } from './SongPanel';
import { findAnchor, showField } from './findField';
import {
  idFor,
  lookFirst,
  missingFor,
  NAME_OF,
  newBodyFor,
  nextProgressionId,
  progressionIssues,
  withId,
} from './newItems';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  "New …": a new row, made in the row panel
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The toolbar's New opens this where a row's panel would be (`?new=`, with
 * the search as the name to start from). It is the kind's own editor — the
 * record editors, a song's details, an event's card — over a new body, with
 * the id worked out from the name as the kind spells ids, and the rules
 * `CreateEntityDialog` keeps:
 *
 *  - it looks before it writes: a row with the id it would take is opened,
 *    not made again, and rows with the same name (or a letter or two off)
 *    are named, since "Stevie Ray Vaughn" is usually "Stevie Ray Vaughan";
 *  - it is made create-only where the server can (`features.create`), so a
 *    row someone made meanwhile answers "taken" rather than being written
 *    over; a studio, label or record, which only the server lists, is not
 *    made at all on a server without it;
 *  - an admin's is a draft (or the status they pick); an editor's is a
 *    proposal, for an admin to approve.
 *
 * Once made, the table rebuilds with it, and the panel opens its row. Until
 * it does, the item is made: its id stops following the name, and the
 * button saves it (create-only is for making it once, not twice).
 *
 * A progression is made from its chords: the chip editor (its record
 * editor's), started from the chords `?new=` hands over ("1 major7 -
 * 4 major7", or an opening's id, "1 major7|4 major7", as Tesseract's "New
 * progression from here" does). Its id is the next above the high-water
 * mark, and Save waits until the chords keep the library's rules.
 */

export interface NewItemPanelProps {
  model: TableModel;
  /** The name to start from: the search, when there was one. */
  name: string;
  /** The working copy, or the repo's snapshot, which makes nothing. */
  mode: 'working' | 'repo';
}

const PICKER_KIND_OF = Object.fromEntries(
  Object.entries(CONTENT_KIND_OF).map(([picker, kind]) => [kind, picker]),
) as Partial<Record<ContentKind, PickerKind>>;

export const NewItemPanel = ({ model, name, mode }: NewItemPanelProps) => {
  const { def } = model;
  const kind = def.contentKind!;
  const { search } = useLocation();
  const closeRow = useCloseRow();
  // Closing stays on the table's page, where the console's guard does not
  // ask (it asks on leaving a page), so the panel asks itself.
  const dirty = useRef(false);
  const [asking, setAsking] = useState(false);

  // Back to the list it was opened from, as a row's panel closes.
  const leave = () => {
    const params = new URLSearchParams(search);
    params.delete(NEW_PARAM);
    closeRow(`${tableHref(def.id)}${searchOf(params)}`);
  };
  const close = () => (dirty.current ? setAsking(true) : leave());

  return (
    <>
      <PanelFrame onClose={close}>
        {(heading, closeButton) => (
          <NewItem
            // Another kind is another item.
            key={kind}
            model={model}
            kind={kind}
            name={name}
            mode={mode}
            heading={heading}
            close={closeButton}
            onDirty={(value) => {
              dirty.current = value;
            }}
          />
        )}
      </PanelFrame>
      <AlertDialog
        open={asking}
        // Esc is "Stay", as the Cancel button is.
        onOpenChange={(open) => !open && setAsking(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              This new {def.singular} has not been made yet. What you typed will
              be lost if you leave now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAsking(false)}>
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAsking(false);
                leave();
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const NewItem = ({
  model,
  kind,
  name,
  mode,
  heading,
  close,
  onDirty,
}: {
  model: TableModel;
  kind: ContentKind;
  name: string;
  mode: 'working' | 'repo';
  heading: (text: string) => ReactNode;
  close: (() => void) | null;
  /** Whether it holds anything unsaved, as it changes. */
  onDirty(dirty: boolean): void;
}) => {
  const { def } = model;
  const caps = useCapabilities();
  const navigate = useNavigate();
  const { search, state } = useLocation();
  const identity = caps.identityOf(kind);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The body it starts from, named from the search; a progression's number
  // is fixed now, one past the table's highest.
  const start = useMemo(
    () =>
      withId(
        kind,
        newBodyFor(kind, name, { nextId: nextProgressionId(model) }),
        identity,
      ),
    // Once: the session starts from it and owns the body after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const session = useItemSession({ kind, itemId: 'new', newBody: start });
  useEffect(() => onDirty(session.dirty), [onDirty, session.dirty]);
  const body = session.body ?? start;
  // Made: from then on the session is that item, and its id is fixed.
  const made = !session.isNew;
  const edit = (next: Record<string, unknown>) =>
    session.applyBody(made ? next : withId(kind, next, identity));

  const id = made ? String(body[identity] ?? '') : idFor(kind, body);
  const look = useMemo(
    () => lookFirst(kind, model, id, body),
    [kind, model, id, body],
  );
  const missing = missingFor(kind, body);
  // A progression's chords, held to the library's rules against the table's
  // others (the id is the server's to check: it was taken from the mark).
  const chordProblem = useMemo(() => {
    if (kind !== 'chord_progression' || made) return null;
    const errors = progressionIssues(model, body).filter(
      (issue) => issue.severity === 'error' && issue.rule !== 'id',
    );
    return errors.length ? errors[0].message : null;
  }, [kind, made, model, body]);
  // A value Details refused where it was typed (a popularity over 100).
  const [refused, setRefused] = useState<string | null>(null);

  const served = caps.isServed(kind);
  const picker = PICKER_KIND_OF[kind];
  // Only the server lists these: without create-only, a save could write
  // over one the console never saw (CreateEntityDialog's rule).
  const blind =
    !!picker && API_ONLY_KINDS.has(picker) && !caps.feature('create');
  const cannot =
    mode === 'repo'
      ? 'The rows are the repo’s snapshot, not the working copy: nothing is made here.'
      : caps.capabilities === null
        ? ''
        : !served
          ? `The content API does not store ${kindLabel(kind).toLowerCase()} yet, so they cannot be made here.`
          : blind
            ? `This server cannot make a ${def.singular} without the risk of overwriting one with the same id: it has no create-only save. Make it once the server supports that.`
            : null;
  const taken =
    session.saveError instanceof ContentApiError &&
    session.saveError.code === 'SLUG_TAKEN';
  const blocked =
    cannot !== null
      ? cannot || 'Loading…'
      : refused
        ? refused
        : made
          ? null
          : look.same
            ? `${look.same.label} already has this id.`
            : missing.length
              ? `Needs ${missing.join(', ')}.`
              : chordProblem
                ? chordProblem
                : !id
                  ? 'Needs a name.'
                  : null;

  // Made: once the table has its row, the panel opens there.
  const [madeSlug, setMadeSlug] = useState<string | null>(null);
  useEffect(() => {
    if (!madeSlug || !model.byKey.has(madeSlug)) return;
    const params = new URLSearchParams(search);
    params.delete(NEW_PARAM);
    navigate(`${tableHref(def.id, madeSlug)}${searchOf(params)}`, {
      replace: true,
      state,
    });
  }, [madeSlug, model, def.id, navigate, search, state]);

  // The cursor starts in the name.
  useEffect(() => {
    const root = bodyRef.current;
    const field = NAME_OF[kind]?.field ?? 'chords';
    const target = root ? findAnchor(root, [field]) : undefined;
    if (target) showField(target, true);
  }, [kind]);

  const rowLink = (row: TableRow, text?: string) => (
    <Link
      to={tableHref(def.id, row.key)}
      className="underline underline-offset-2 hover:text-white"
    >
      {text ?? row.label}
    </Link>
  );

  return (
    <>
      <header className="flex shrink-0 flex-col gap-3 border-b border-white/[0.08] px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <ConsoleBadge>{kindLabel(kind)}</ConsoleBadge>
            <ConsoleBadge tone="info">New</ConsoleBadge>
          </div>
          {close && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Close"
              className="-mr-2 -mt-1 size-8 shrink-0 text-white/60 hover:text-white"
              onClick={close}
            >
              <X />
            </Button>
          )}
        </div>
        <div className={cn('min-w-0', !close && 'pr-8')}>
          {heading(`New ${def.singular}`)}
          {/* The record editors say their id under the name; these do not. */}
          {!recordEditorFor(kind) || kind === 'chord_progression' ? (
            <p className="mt-1 font-mono text-xs text-white/45">
              Id: {id || '…'}
            </p>
          ) : null}
        </div>
      </header>

      <div
        ref={bodyRef}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5"
      >
        {cannot && <ConsoleCallout tone="warning">{cannot}</ConsoleCallout>}
        {made && (
          <ConsoleCallout tone="success" title="Made">
            {session.isEditor
              ? 'Sent for review. Its row opens once the table has it.'
              : 'Saved as its own item. Its row opens once the table has it.'}
          </ConsoleCallout>
        )}
        {!made && look.same && (
          <ConsoleCallout tone="warning" title="Already there">
            {look.same.label} already has the id “{id}”.{' '}
            {rowLink(look.same, 'Open it')}
          </ConsoleCallout>
        )}
        {taken && (
          <ConsoleCallout tone="warning" title="Taken meanwhile">
            Someone made “{id}” while this was open.{' '}
            <Link
              to={tableHref(def.id, id)}
              className="underline underline-offset-2 hover:text-white"
            >
              Open it
            </Link>
          </ConsoleCallout>
        )}
        {!made && look.named && (
          <ConsoleCallout tone="info">
            Something names “{id}”, but nothing defines it: this makes it.
          </ConsoleCallout>
        )}
        {!made && !look.same && look.near.length > 0 && (
          <ConsoleCallout tone="neutral" title="Is it one of these?">
            <ul className="mt-1 flex flex-col gap-0.5">
              {look.near.map((row) => (
                <li key={row.key}>
                  {rowLink(row)}
                  {row.sublabel && (
                    <span className="text-white/40"> · {row.sublabel}</span>
                  )}
                </li>
              ))}
            </ul>
          </ConsoleCallout>
        )}

        <PanelSection title="Details">
          <NewDetails
            kind={kind}
            body={body}
            onChange={edit}
            readOnly={cannot !== null}
            onRefused={setRefused}
          />
        </PanelSection>
      </div>

      {cannot === null && (
        <PanelSaveBar
          session={session}
          create={!made}
          blocked={blocked}
          onShowField={(path) => {
            const target = bodyRef.current
              ? findAnchor(bodyRef.current, [path])
              : undefined;
            if (target) showField(target, true);
          }}
          onSaved={({ item }) => {
            // A save once made is the item's own: nothing new to name.
            if (madeSlug) return;
            const slug = item.slug || id;
            if (picker)
              addSessionEntity({
                id: `${picker}:${slug}` as EntityId,
                kind: picker,
                slug,
                name: String(body[NAME_OF[kind]?.field ?? 'name'] ?? slug),
                source: session.isEditor ? 'pending' : 'draft',
              });
            setMadeSlug(slug);
          }}
        />
      )}
      {madeSlug && !model.byKey.has(madeSlug) && (
        <p role="status" className="sr-only">
          Made. Its row opens once the table has it.
        </p>
      )}
    </>
  );
};

/* ── The kind's editor, over the new body ────────────────────────────── */

const NewDetails = ({
  kind,
  body,
  onChange,
  readOnly,
  onRefused,
}: {
  kind: ContentKind;
  body: Record<string, unknown>;
  onChange(next: Record<string, unknown>): void;
  readOnly: boolean;
  onRefused(problem: string | null): void;
}) => {
  switch (kind) {
    case 'song':
      return (
        <div className="flex flex-col gap-6">
          <NewSongFields body={body} onChange={onChange} readOnly={readOnly} />
          {/* The title is NewSongFields' first field: one Title, not two. */}
          <SongDetails
            body={body}
            onChange={onChange}
            readOnly={readOnly}
            title={false}
            onRefused={onRefused}
          />
        </div>
      );
    case 'globe_event':
      return (
        <EventDetails
          body={body}
          onChange={onChange}
          readOnly={readOnly}
          guesses={{ artists: [], songs: [] }}
          // The id follows the title (newItems.ts); it is not typed.
          lockId
        />
      );
    case 'chord_progression': {
      // Its record editor edits the chords too, as chips.
      const editor = recordEditorFor(kind);
      return (
        <div className="flex flex-col gap-6">
          {editor && (
            <editor.Editor
              body={body}
              onChange={onChange}
              readOnly={readOnly}
            />
          )}
          <ProgressionDraftNote was={null} is={body} />
        </div>
      );
    }
    default: {
      const editor = recordEditorFor(kind);
      return editor ? (
        <editor.Editor body={body} onChange={onChange} readOnly={readOnly} />
      ) : null;
    }
  }
};

/**
 * A new song's title, billing and key: what its page editor would ask
 * first. The chart itself is made on the page (the row's "Full editor ↗").
 */
const NewSongFields = ({
  body,
  onChange,
  readOnly,
}: {
  body: Record<string, unknown>;
  onChange(next: Record<string, unknown>): void;
  readOnly: boolean;
}) => {
  // Nothing is chosen for the author: the key waits for both halves.
  const keyRoot = readNumber(body.keyRoot);
  const root = keyRoot === undefined ? undefined : pitchClass(keyRoot);
  const mode = readString(body.mode) as SongMode | undefined;
  const setKey = (pc: number | undefined, next: SongMode | undefined) => {
    const out: Record<string, unknown> = { ...body };
    delete out.key;
    if (pc !== undefined) out.keyRoot = keyRootForPitchClass(pc);
    if (next) out.mode = next;
    if (pc !== undefined && next)
      out.key = buildKeyString(keyRootForPitchClass(pc), next);
    onChange(out);
  };
  return (
    <EditorColumn label="New song" readOnly={readOnly}>
      <Field label="Title" field="title" required wide>
        <input
          aria-label="Title"
          value={readString(body.title) ?? ''}
          onChange={(e) => onChange({ ...body, title: e.target.value })}
          className={cn(inputClass, 'w-full')}
        />
      </Field>
      <Field
        label="Artist"
        field="artist"
        required
        wide
        hint="The billing line, as the song page shows it. Link the lead act below."
      >
        <input
          aria-label="Artist"
          value={readString(body.artist) ?? ''}
          onChange={(e) => onChange({ ...body, artist: e.target.value })}
          className={cn(inputClass, 'w-full')}
        />
      </Field>
      <FieldRow>
        <Field label="Key" field={['key', 'keyRoot', 'mode']}>
          <div className="flex gap-2">
            <select
              aria-label="Key root"
              value={root ?? ''}
              onChange={(e) => setKey(Number(e.target.value), mode)}
              className={inputClass}
            >
              {root === undefined && (
                <option value="" disabled>
                  Root…
                </option>
              )}
              {NOTE_NAMES.map((note, pc) => (
                <option key={note} value={pc}>
                  {note}
                </option>
              ))}
            </select>
            <select
              aria-label="Mode"
              value={mode ?? ''}
              onChange={(e) => setKey(root, e.target.value as SongMode)}
              className={inputClass}
            >
              {!mode && (
                <option value="" disabled>
                  Mode…
                </option>
              )}
              {SONG_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </Field>
      </FieldRow>
    </EditorColumn>
  );
};
