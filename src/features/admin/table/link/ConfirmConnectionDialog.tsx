import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { getPath } from '@/content/bodyPaths';
import type { Graph } from '@/content/graph/deriveGraph';
import type { EntityId, EntityKind } from '@/content/graph/types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { CreditRole } from '@/curriculum/types/songLibrary';
import {
  type ContentItemDetail,
  contentRequest,
  unwrapSaveResponse,
  type ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { useContentExport } from '@/hooks/data/admin/useContentExport';
import { refreshAfterDecisions } from '@/hooks/data/admin/useSuggestions';
import { isContentEditor } from '../../consoleRoles';
import { EntityPicker, PickerList } from '../../content/entities/EntityPicker';
import { readItem } from '../../content/itemEditor/readItem';
import { kindLabel as contentKindLabel } from '../../content/publishing/kindLabels';
import { ProposalDiff } from '../../content/review/EditReview';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { GUESSED_FIELDS, logWritten } from '../data/logWritten';
import { useItemLock } from '../edit/cellWriteContext';
import { itemKeyOf } from '../edit/itemLock';
import { labelOf } from '../model/aggregate';
import { tableHrefForItem } from '../tablePaths';
import { candidatesOf } from './candidates';
import {
  alreadyLinked,
  applyLink,
  applyUnlink,
  type Body,
  changedSince,
  genreTagField,
  type Guessed,
  guessedAgain,
  guessesFor,
  isStated,
  levelOf,
  type LinkChoice,
  linkRefusal,
  type LinkSpec,
  placeAndGenreNames,
  songArtistDefault,
  songArtistWays,
  storedId,
  storedIds,
  targetNode,
  type UnlinkHow,
  unlinkedCreditFor,
  waitsFor,
} from './links';
import { baseOf } from './ownerBase';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Link…, Confirm and Unlink: one connection, written on the item that owns it
 * ══════════════════════════════════════════════════════════════════════════
 *
 * From a one-step cell the row does not own — an artist's songs, the events
 * about them, a studio's songs, a label's records, a place's artists — and
 * from Confirm on one of its guesses (design §3.3, Table design §7.6), or
 * from Unlink on one of its stated chips (design §3.4):
 *
 *  1. it names the owning item and field ("writes Woodstock · artistIds"),
 *     picked here or given (the guess confirmed, the chip unlinked, the
 *     song's record);
 *  2. it re-reads that item, so what it shows is what is stored now;
 *  3. it shows the whole field as it will be — every artist the event will
 *     be about, the other guesses as checkboxes (the sure ones ticked), the
 *     song's credits, the id it replaces or clears — and the change as a
 *     diff. An unlink also says which of the ways a song names an artist
 *     go, and when a text the owner keeps will guess the row back;
 *  4. it saves once, the item's ordinary save (a proposal for an editor, the
 *     item for an admin), having read the item again just before and found
 *     the field as shown; then refreshes once.
 *
 * The row panel's own draft is never touched: the owner is always another
 * item. An item with a proposal waiting is not written under it — an admin
 * reviews the proposal first, an editor builds on their own or waits.
 */

export interface LinkRow {
  /** The row's slug: what the owner's field will name (unless `picks`). */
  key: string;
  label: string;
  node: EntityId;
  body?: Body;
}

export interface ConfirmConnectionDialogProps {
  spec: LinkSpec;
  graph: Graph;
  row: LinkRow;
  /**
   * `link` (the default) puts the row into the owner's field; `unlink`
   * takes it out, from one of the column's stated chips.
   */
  mode?: 'link' | 'unlink';
  /**
   * The id the owner's field gains or loses: the row's key, unless the spec
   * `picks` the value (a song's Label on its record) — then the label, which
   * a link starts on and an unlink takes off the record (by default, the one
   * it holds).
   */
  target?: string;
  /** The owner, when it is given: a guess confirmed, a chip unlinked, the song's record. */
  owner?: string;
  /** For `song-label`: the song's records, to choose from when several. */
  owners?: readonly string[];
  /** Owners the column guesses, offered first: its dotted chips. */
  guessed?: readonly string[];
  /** Owners that already state it: not offered to link, the only ones offered to unlink. */
  linked?: ReadonlySet<string>;
  /** Written: what to say about it, and the warnings the save came back with. */
  onDone(message: string, warnings: readonly ValidationProblem[]): void;
  onClose(): void;
  /**
   * Where the keyboard goes when it closes: the control it was opened from,
   * which the dialog library cannot know when it was opened from state.
   */
  returnFocus?(): void;
}

/** Roles a credit can be, in the order a picker lists them. */
const ROLES: readonly CreditRole[] = [
  'performer',
  'vocals',
  'songwriter',
  'producer',
  'arranger',
  'engineer',
  'conductor',
];

const REREAD_KEY = ['admin', 'table-link'] as const;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const recordsIn = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (v): v is Record<string, unknown> =>
          Boolean(v) && typeof v === 'object' && !Array.isArray(v),
      )
    : [];

const sameBody = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** One entry of an id list as it will be, for the checkboxes. */
interface IdEntry {
  id: string;
  label: string;
  note: string;
  keep: boolean;
  fixed: boolean;
}

export const ConfirmConnectionDialog = ({
  spec,
  graph,
  row,
  mode = 'link',
  target,
  owner: given,
  owners,
  guessed = [],
  linked,
  onDone,
  onClose,
  returnFocus,
}: ConfirmConnectionDialogProps) => {
  const { token, role, userId } = useAuthContext();
  const editor = isContentEditor(role);
  const withItemLock = useItemLock();
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const unlinking = mode === 'unlink';
  const ownerKind = spec.owner.kind;
  const ownerNode = spec.owner.node;
  const [picked, setPicked] = useState<string | null>(
    given ?? (owners?.length === 1 ? owners[0] : null),
  );
  const ownerSlug = given ?? picked;
  const ownerId = ownerSlug ? (`${ownerNode}:${ownerSlug}` as EntityId) : null;
  const ownerName = ownerId ? labelOf(graph, ownerId) : '';
  // A genre row is a genre or a subgenre: a song states each its own way.
  const level = levelOf(row.node);

  const served = caps.isServed(ownerKind);
  const waiting = waitsFor(spec, caps.schemaVersionOf(ownerKind), level);
  const exported = useContentExport(ownerKind);
  const exportRow = ownerSlug
    ? exported.data?.rows.find((r) => r.slug === ownerSlug)
    : undefined;
  const canLookup = caps.feature('lookup');

  /** The owner as stored now: by its id from the export, or by its slug. */
  const readOwner = (): Promise<ContentItemDetail | null> =>
    readItem(
      token!,
      { kind: ownerKind, slug: ownerSlug!, id: exportRow?.id },
      canLookup,
    );

  // Re-read on open (and when the owner changes), never from a cache: what
  // the dialog shows is what the save will check against.
  const read = useQuery({
    queryKey: [...REREAD_KEY, ownerKind, ownerSlug, exportRow?.id ?? null],
    queryFn: readOwner,
    enabled:
      !!token &&
      !!ownerSlug &&
      served &&
      !waiting &&
      (exported.ready || canLookup),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const detail = read.data ?? null;
  const base = detail ? baseOf(detail, editor, userId, ownerName) : null;
  const shown = base && 'body' in base ? base.body : null;

  /* ── The choice ─────────────────────────────────────────────────── */

  const doubtful = useMemo(() => placeAndGenreNames(graph), [graph]);
  const guesses: Guessed[] = useMemo(
    () =>
      ownerId && shown && !isStated(spec, shown)
        ? guessesFor(spec, graph, ownerId, doubtful)
        : [],
    [spec, graph, ownerId, shown, doubtful],
  );
  // What the author unticked or ticked, over each entry's default.
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [label, setLabel] = useState<{ id: string; name?: string } | null>(
    () =>
      spec.picks && !unlinking && target
        ? {
            id: target,
            name: labelOf(graph, `${spec.picks}:${target}` as EntityId),
          }
        : null,
  );
  const [artistAs, setArtistAs] = useState<'lead' | 'credit' | null>(null);
  const [pickedRole, setRole] = useState<CreditRole | null>(null);
  // An unlink's ways, over their default (every way goes).
  const [dropLead, setDropLead] = useState(true);
  const [dropCredits, setDropCredits] = useState<Record<number, boolean>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const noteId = useId();

  // The value written or taken out: the row, or (song-label) the label.
  const value: string | null = spec.picks
    ? unlinking
      ? (target ?? (shown ? (storedId(spec, shown) ?? null) : null))
      : (label?.id ?? null)
    : (target ?? row.key);
  const valueName = !value
    ? ''
    : spec.picks
      ? (label?.name ?? labelOf(graph, `${spec.picks}:${value}` as EntityId))
      : value === row.key
        ? row.label
        : labelOf(graph, targetNode(spec, graph, value));
  const rowNames = useMemo(() => {
    const aliases = row.body?.aliases;
    return [
      row.label,
      ...(Array.isArray(aliases)
        ? aliases.filter((a): a is string => typeof a === 'string')
        : []),
    ];
  }, [row]);

  /** The list an `ids` link writes, every entry and whether it is kept. */
  const idEntries = useMemo((): IdEntry[] => {
    if (spec.shape !== 'ids' || !shown || !value) return [];
    const stored = isStated(spec, shown) ? storedIds(spec, shown) : [];
    const entries = [
      ...stored.map((id) => ({
        id,
        label: labelOf(graph, targetNode(spec, graph, id)),
        note: 'stored',
        keep: true,
      })),
      ...guesses.map((g) => ({
        id: g.id,
        label: g.label,
        note: g.sure ? 'guessed' : 'guessed · in doubt',
        keep: g.sure,
      })),
    ];
    if (!unlinking && !entries.some((e) => e.id === value))
      entries.push({ id: value, label: valueName, note: 'new', keep: true });
    // The row is fixed: kept by a link, left out by an unlink.
    return entries.map((entry) =>
      entry.id === value
        ? {
            ...entry,
            note: `${entry.note} · this row${unlinking ? ', taken out' : ''}`,
            fixed: true,
            keep: !unlinking,
          }
        : { ...entry, fixed: false, keep: ticks[entry.id] ?? entry.keep },
    );
  }, [spec, shown, value, valueName, guesses, graph, ticks, unlinking]);

  const artistDefault =
    spec.shape === 'song-artist' && shown
      ? songArtistDefault(shown, rowNames)
      : null;
  const as = artistAs ?? artistDefault?.as ?? 'lead';
  const creditIndex =
    shown && spec.shape === 'song-artist'
      ? unlinkedCreditFor(shown, rowNames)
      : undefined;
  const creditRole =
    pickedRole ??
    (artistDefault?.as === 'credit' ? artistDefault.credit.role : 'performer');
  const ways =
    unlinking && spec.shape === 'song-artist' && shown && value
      ? songArtistWays(shown, value)
      : null;

  /**
   * What a link writes. An id list is written whole either way, as the
   * boxes show it — the row in it for a link, left out for an unlink; any
   * other unlink is `how`, below.
   */
  const choice = ((): LinkChoice | null => {
    if (!value) return null;
    if (spec.shape === 'ids')
      return {
        as: 'ids',
        ids: idEntries.filter((e) => e.keep).map((e) => e.id),
      };
    if (unlinking) return null;
    switch (spec.shape) {
      case 'one': {
        const before = shown ? storedId(spec, shown) : undefined;
        return {
          as: 'one',
          id: value,
          name: valueName,
          previousName: before
            ? labelOf(graph, targetNode(spec, graph, before))
            : undefined,
        };
      }
      case 'releases':
        return { as: 'release', id: value };
      case 'refs':
        return { as: 'ref', id: value };
      case 'genre-tags':
        return { as: 'genre', id: value, level };
      case 'song-artist':
        return as === 'lead'
          ? { as: 'lead', id: value }
          : {
              as: 'credit',
              id: value,
              name: row.label,
              credit:
                creditIndex !== undefined
                  ? { role: creditRole, index: creditIndex }
                  : { role: creditRole },
            };
    }
  })();
  /** How an unlink goes, where the shape leaves a choice. */
  const how: UnlinkHow = {
    ...(spec.shape === 'one' ? { name: valueName } : {}),
    ...(spec.shape === 'genre-tags' ? { level } : {}),
    ...(ways
      ? {
          lead: ways.lead && dropLead,
          credits: ways.credits.filter((n) => dropCredits[n] ?? true),
        }
      : {}),
  };

  /** The owner's body with the choice written, on `body`. */
  const write = (body: Body): Record<string, unknown> | null => {
    if (!value) return null;
    if (choice) return applyLink(spec, body, choice);
    return unlinking ? applyUnlink(spec, body, value, how) : null;
  };
  const after = shown ? write(shown) : null;

  /** The row is in the field now: stored, or (an event storing nothing) guessed. */
  const linkedNow =
    !!shown &&
    !!value &&
    (alreadyLinked(spec, shown, value, level) ||
      (spec.shape === 'ids' &&
        !isStated(spec, shown) &&
        guesses.some((g) => g.id === value)));
  const nothingToWrite =
    !!shown &&
    !!value &&
    (unlinking
      ? !linkedNow || sameBody(after, shown)
      : spec.shape === 'ids'
        ? isStated(spec, shown) &&
          JSON.stringify(storedIds(spec, shown)) ===
            JSON.stringify(choice && choice.as === 'ids' ? choice.ids : [])
        : spec.shape === 'song-artist'
          ? as === 'lead'
            ? storedId(spec, shown) === value
            : alreadyLinked(spec, shown, value) && creditIndex === undefined
          : alreadyLinked(spec, shown, value, level));

  /** The field a genre is written in on a song; for other links, the spec's. */
  const fieldPath =
    spec.shape === 'genre-tags' && value
      ? (genreTagField(level, value)?.path ?? spec.path)
      : spec.path;

  /* ── Why it cannot be written ───────────────────────────────────── */

  const ownerNoun = spec.noun;
  // "an event", "a song".
  const aNoun = `${/^[aeiou]/.test(ownerNoun) ? 'an' : 'a'} ${ownerNoun}`;
  // A link that would loop, or that the owner would not read; said as soon
  // as the row alone decides it, before an owner is picked.
  const refused = unlinking
    ? null
    : linkRefusal(spec, {
        graph,
        owner: ownerSlug ?? undefined,
        ownerBody: shown ?? undefined,
        row,
      });
  const reason: ReactNode = !served
    ? `The content API does not store ${contentKindLabel(ownerKind).toLowerCase()} yet, so nothing can be ${unlinking ? 'unlinked' : 'linked'} here.`
    : waiting
      ? `Saved once the server takes ${waiting.what}: ${aNoun}’s ${fieldPath} is refused below it.`
      : refused
        ? refused
        : ownerSlug && read.isSuccess && !detail
          ? (() => {
              const href = tableHrefForItem(ownerKind, ownerSlug);
              return (
                <>
                  {ownerName} is not in the content API yet. Save it in its row
                  first
                  {href && (
                    <>
                      {' '}
                      (
                      <Link to={href} className="underline underline-offset-2">
                        open it
                      </Link>
                      )
                    </>
                  )}
                  , then {unlinking ? 'unlink' : 'link'}.
                </>
              );
            })()
          : base && 'blocked' in base
            ? base.blocked
            : null;

  // A text the owner keeps that will guess the row back once it is out.
  const guessedBack =
    unlinking && after && !nothingToWrite
      ? guessedAgain(spec, after, rowNames)
      : null;

  /* ── Saving ─────────────────────────────────────────────────────── */

  const save = async () => {
    if (!ownerSlug || !value || !shown || !token) return;
    setBusy(true);
    setProblem(null);
    try {
      // The owner's lock, from the re-read to the write: a cell's write to
      // it, or its row panel's save, waits for this one and builds on it
      // (`edit/itemLock.ts`), rather than reading it before and writing
      // this link's field back as it was.
      const written = await withItemLock(
        itemKeyOf(ownerKind, ownerSlug),
        async () => {
          // Again, just before the write: the field must still say what
          // was shown, or the author decided on something that is no
          // longer there.
          const fresh = await readOwner();
          if (!fresh)
            throw new Error(`${ownerName} is no longer in the content API.`);
          const now = baseOf(fresh, editor, userId, ownerName);
          if ('blocked' in now) {
            setProblem(now.blocked);
            void read.refetch();
            return null;
          }
          const moved = changedSince(spec, shown, now.body);
          if (moved.length) {
            setProblem(
              `${ownerName} changed while this was open (${moved.join(', ')}). Look at it again, then save.`,
            );
            void read.refetch();
            return null;
          }
          const next = write(now.body);
          if (!next) return null;
          const what = unlinking
            ? `${valueName} from ${ownerName} ${fieldPath}`
            : `${row.label} → ${ownerName} ${fieldPath}`;
          const raw = await contentRequest('/items', token, {
            method: 'PUT',
            body: JSON.stringify({
              kind: ownerKind,
              slug: ownerSlug,
              body: next,
              note:
                note.trim() ||
                `${unlinking ? 'Unlinked' : 'Linked'} in the Table: ${what}`,
            }),
          });
          return { now, body: next, raw };
        },
      );
      if (!written) return;
      const { now, body, raw } = written;
      const { warnings } = unwrapSaveResponse(raw);
      // What the owner stated here that a suggestion offered is their
      // decision about it: logged, so it reaches decisions.json. The link
      // is saved either way; a log that fails is said, not undone.
      let logged = '';
      if (caps.feature('suggestions')) {
        try {
          const count = await logWritten(token, {
            kind: ownerKind,
            slug: ownerSlug,
            before: now.body,
            after: body,
            guessed: GUESSED_FIELDS[ownerKind],
          });
          if (count)
            logged = ` ${count === 1 ? 'A suggestion it matches is' : `${count} suggestions it matches are`} logged as accepted.`;
        } catch (error) {
          logged = ` It could not be logged as a decision: ${messageOf(error)}.`;
        }
      }
      // Once, for everything the write touches: the exports, the graph —
      // behind the dialog, which closes as soon as the item is read again.
      await refreshAfterDecisions(queryClient);
      onDone(
        `${
          unlinking
            ? editor
              ? `Sent for review: ${ownerName} · ${fieldPath}, no longer naming ${valueName}.`
              : `Unlinked: ${ownerName} · ${fieldPath} no longer names ${valueName}.`
            : editor
              ? `Sent for review: ${ownerName} · ${fieldPath}, naming ${valueName}.`
              : `Linked: ${ownerName} · ${fieldPath} now names ${valueName}.`
        }${logged}`,
        warnings,
      );
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  /* ── The dialog ─────────────────────────────────────────────────── */

  const title = unlinking
    ? spec.picks
      ? `Clear the label of ${row.label}’s record`
      : ownerSlug
        ? `Unlink ${row.label} from ${ownerName}`
        : `Unlink ${row.label} from ${aNoun}`
    : spec.picks
      ? `Set the label of ${row.label}’s record`
      : given
        ? `Confirm: ${ownerName} and ${row.label}`
        : `Link ${row.label} to ${aNoun}`;
  const canSave =
    !!after && !reason && !nothingToWrite && !busy && !read.isFetching;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto"
        // Esc closes this dialog, not the row panel it opened from too.
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.stopPropagation();
        }}
        onCloseAutoFocus={(event) => {
          if (!returnFocus) return;
          event.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {ownerSlug ? (
              <>
                Writes <span className="text-white/85">{ownerName}</span>
                {' · '}
                <code className="text-xs">{fieldPath}</code>.{' '}
              </>
            ) : (
              <>
                Writes {aNoun}’s <code className="text-xs">{fieldPath}</code>:
                the {ownerNoun} states this connection.{' '}
              </>
            )}
            {editor
              ? 'Sent as a proposal: an admin approves it before it is published.'
              : 'Saved to the item, keeping its status.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!ownerSlug && !spec.picks && (
            <OwnerPicker
              spec={spec}
              graph={graph}
              row={row}
              unlinking={unlinking}
              guessed={guessed}
              linked={linked}
              onPick={setPicked}
            />
          )}

          {spec.picks && owners && owners.length > 1 && (
            <label className="flex flex-col gap-1.5 text-xs text-white/55">
              The record
              <select
                value={picked ?? ''}
                onChange={(e) => setPicked(e.target.value || null)}
                className="h-9 rounded-md border border-white/[0.12] bg-transparent px-2 text-sm text-white"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {owners.map((slug) => (
                  <option key={slug} value={slug}>
                    {labelOf(graph, `release:${slug}`)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {ownerSlug && !given && !spec.picks && (
            <p className="flex items-center gap-2 text-sm text-white/75">
              {ownerName}
              <button
                type="button"
                className="text-xs text-white/50 underline underline-offset-2 hover:text-white"
                onClick={() => {
                  setPicked(null);
                  setTicks({});
                  setDropLead(true);
                  setDropCredits({});
                }}
              >
                Change
              </button>
            </p>
          )}

          {reason && (
            <ConsoleCallout tone="warning">
              <span>{reason}</span>
            </ConsoleCallout>
          )}
          {!reason && base && 'body' in base && base.sentBack && (
            <ConsoleCallout tone="info">
              Your proposal on {ownerName} was sent back
              {detail?.reviewNote ? `: “${detail.reviewNote}”` : ''}. This goes
              into it, and sends it for review again.
            </ConsoleCallout>
          )}

          {ownerSlug && !reason && read.isLoading && (
            <p
              aria-busy
              className="flex items-center gap-2 text-sm text-white/55"
            >
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Reading {ownerName}…
            </p>
          )}
          {read.error && (
            <ConsoleCallout
              tone="danger"
              title={`${ownerName} could not be read`}
            >
              {messageOf(read.error)}
            </ConsoleCallout>
          )}

          {shown && !reason && (
            <>
              {spec.picks && !unlinking && (
                <label className="flex flex-col gap-1.5 text-xs text-white/55">
                  Its label
                  <EntityPicker
                    kind="label"
                    aria-label="Label"
                    value={label?.id ?? storedId(spec, shown) ?? null}
                    allowCreate
                    onChange={(slug, entry) =>
                      setLabel(slug ? { id: slug, name: entry?.name } : null)
                    }
                  />
                </label>
              )}

              {spec.shape === 'song-artist' && !unlinking && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-xs text-white/55">
                    How {ownerName} names {row.label}
                  </legend>
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="radio"
                      name="song-artist"
                      checked={as === 'lead'}
                      onChange={() => setArtistAs('lead')}
                    />
                    Its lead act
                    <span className="text-xs text-white/40">
                      origin.artistGlobeId
                    </span>
                  </label>
                  <label className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                    <input
                      type="radio"
                      name="song-artist"
                      checked={as === 'credit'}
                      onChange={() => setArtistAs('credit')}
                    />
                    {creditIndex !== undefined
                      ? 'Link the credit that names them'
                      : 'A credit, as'}
                    {creditIndex === undefined && (
                      <select
                        aria-label="Credited as"
                        value={creditRole}
                        disabled={as !== 'credit'}
                        onChange={(e) => setRole(e.target.value as CreditRole)}
                        className="h-8 rounded-md border border-white/[0.12] bg-transparent px-2 text-xs text-white disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                </fieldset>
              )}

              {ways && (ways.lead || ways.credits.length > 0) && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-xs text-white/55">
                    The ways {ownerName} names {row.label} that go
                  </legend>
                  {ways.lead && (
                    <label className="flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={dropLead}
                        onChange={(e) => setDropLead(e.target.checked)}
                      />
                      Its lead act
                      <span className="text-xs text-white/40">
                        origin.artistGlobeId
                      </span>
                    </label>
                  )}
                  {ways.credits.map((n) => {
                    const credit = recordsIn(shown.credits)[n] ?? {};
                    return (
                      <label
                        key={n}
                        className="flex items-center gap-2 text-sm text-white/80"
                      >
                        <input
                          type="checkbox"
                          checked={dropCredits[n] ?? true}
                          onChange={(e) =>
                            setDropCredits((d) => ({
                              ...d,
                              [n]: e.target.checked,
                            }))
                          }
                        />
                        The credit {String(credit.name ?? '')}
                        <span className="text-xs text-white/40">
                          {String(credit.role ?? '')} · removed whole
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              )}

              <FieldAfter
                spec={spec}
                graph={graph}
                shown={shown}
                after={after}
                entries={idEntries}
                value={value}
                valueName={valueName}
                ownerName={ownerName}
                fieldPath={fieldPath}
                unlinking={unlinking}
                onTick={(id, keep) => setTicks((t) => ({ ...t, [id]: keep }))}
                as={as}
              />

              {guessedBack && (
                <ConsoleCallout tone="info">
                  Its {guessedBack} still says “
                  {String(getPath(after, guessedBack) ?? '')}”, so the map will
                  guess {valueName} there again, dotted, until that text
                  changes.
                </ConsoleCallout>
              )}

              {nothingToWrite ? (
                <p className="text-sm text-white/55">
                  {unlinking
                    ? linkedNow
                      ? 'Nothing chosen to take out.'
                      : 'Not linked: nothing to take out.'
                    : 'Already linked: nothing to write.'}
                </p>
              ) : (
                after && (
                  <ProposalDiff
                    before={shown as Record<string, unknown>}
                    after={after}
                    defaultOpen
                  />
                )
              )}

              {editor && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={noteId} className="text-xs text-white/55">
                    Note for the reviewer (optional)
                  </label>
                  <input
                    id={noteId}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-9 rounded-md border border-white/[0.12] bg-transparent px-3 text-sm text-white"
                  />
                </div>
              )}
            </>
          )}

          {problem && (
            <ConsoleCallout tone="danger">
              <span role="alert">{problem}</span>
            </ConsoleCallout>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!canSave}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {editor ? 'Submit for review' : unlinking ? 'Unlink' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Picking the owner ───────────────────────────────────────────────── */

const OwnerPicker = ({
  spec,
  graph,
  row,
  unlinking,
  guessed,
  linked,
  onPick,
}: {
  spec: LinkSpec;
  graph: Graph;
  row: LinkRow;
  unlinking: boolean;
  guessed: readonly string[];
  linked?: ReadonlySet<string>;
  onPick(slug: string): void;
}) => {
  const kind = spec.owner.node;
  // A link offers every owner but those that state it already, and never
  // the row itself (a group is not its own member); an unlink only those
  // that state it.
  const entries = useMemo(
    () =>
      candidatesOf(graph, kind).filter((e) =>
        unlinking
          ? !!linked?.has(e.slug)
          : !linked?.has(e.slug) && e.id !== row.node,
      ),
    [graph, kind, linked, unlinking, row.node],
  );
  const context = useMemo(
    () => new Set(guessed.map((slug) => `${kind}:${slug}`)),
    [guessed, kind],
  );
  const offered = unlinking
    ? []
    : guessed.filter((slug) => !linked?.has(slug)).slice(0, 12);
  if (unlinking && entries.length === 0)
    return (
      <p className="text-sm text-white/55">
        No {spec.noun} states this connection: nothing to take out.
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      {offered.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-white/55">Guessed from the names</p>
          <ul className="flex flex-wrap gap-1.5">
            {offered.map((slug) => (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => onPick(slug)}
                  className="inline-flex h-7 items-center rounded-full border border-dotted border-white/45 px-2.5 text-xs text-white/75 hover:border-white/70 hover:text-white"
                >
                  {labelOf(graph, `${kind}:${slug}` as EntityId)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-lg border border-white/[0.12]">
        <PickerList
          kind={kind}
          entries={entries}
          context={context}
          onPick={(entry) => onPick(entry.slug)}
        />
      </div>
    </div>
  );
};

/* ── The field as it will be ─────────────────────────────────────────── */

const box = 'flex flex-col gap-1.5 rounded-lg border border-white/[0.08] p-3';

/** A list of the field's entries as they will be, the row's marked. */
const ListAfter = ({
  heading,
  items,
  value,
  valueName,
  unlinking,
}: {
  heading: string;
  items: readonly { id: string; label: string }[];
  value: string | null;
  valueName: string;
  unlinking: boolean;
}) => (
  <div className={box}>
    <p className="text-xs text-white/55">{heading}</p>
    {items.length === 0 ? (
      <p className="text-sm text-white/45">none</p>
    ) : (
      <ul className="flex flex-col gap-0.5 text-sm text-white/85">
        {items.map((item, n) => (
          <li
            key={`${item.id}|${n}`}
            className={cn(item.id === value && 'text-white')}
          >
            {item.label}
            {!unlinking && item.id === value && (
              <span className="text-xs text-emerald-300/80"> · new</span>
            )}
          </li>
        ))}
      </ul>
    )}
    {unlinking && value && (
      <p className="text-xs text-amber-300/85">Takes out {valueName}.</p>
    )}
  </div>
);

const FieldAfter = ({
  spec,
  graph,
  shown,
  after,
  entries,
  value,
  valueName,
  ownerName,
  fieldPath,
  unlinking,
  onTick,
  as,
}: {
  spec: LinkSpec;
  graph: Graph;
  shown: Body;
  after: Record<string, unknown> | null;
  entries: readonly IdEntry[];
  value: string | null;
  valueName: string;
  ownerName: string;
  fieldPath: string;
  unlinking: boolean;
  onTick(id: string, keep: boolean): void;
  as: 'lead' | 'credit';
}) => {
  const nameOf = (kind: EntityKind, id: string | undefined) =>
    id ? labelOf(graph, `${kind}:${id}` as EntityId) : 'none';
  const targetName = (id: string | undefined) =>
    id ? labelOf(graph, targetNode(spec, graph, id)) : 'none';
  switch (spec.shape) {
    case 'ids':
      return (
        <fieldset className={box}>
          <legend className="px-1 text-xs text-white/55">
            {spec.path}, as it will be
          </legend>
          {spec.inferred && !isStated(spec, shown) && (
            <p className="text-xs text-white/45">
              Nothing is stored yet: the map guesses these. Storing the list
              {unlinking ? ` without ${valueName}` : ''} makes the ticked ones
              solid and drops the rest.
            </p>
          )}
          {entries.map((entry) => (
            <label
              key={entry.id}
              className="flex items-center gap-2 text-sm text-white/85"
            >
              <input
                type="checkbox"
                checked={entry.keep}
                disabled={entry.fixed}
                onChange={(e) => onTick(entry.id, e.target.checked)}
              />
              {entry.label}
              <span className="text-xs text-white/40">{entry.note}</span>
            </label>
          ))}
        </fieldset>
      );
    case 'one': {
      const before = storedId(spec, shown);
      const now = after ? storedId(spec, after) : undefined;
      const textBefore = spec.text ? getPath(shown, spec.text) : undefined;
      const textAfter = spec.text && after ? getPath(after, spec.text) : null;
      return (
        <div className={box}>
          <p className="text-xs text-white/55">{spec.path}</p>
          <p className="text-sm text-white/85">
            <span className="text-white/45">{targetName(before)}</span>
            {' → '}
            {unlinking ? (
              targetName(now)
            ) : value ? (
              targetName(value)
            ) : (
              <span className="text-white/45">pick one</span>
            )}
          </p>
          {!unlinking && before && value && before !== value && (
            <p className="text-xs text-amber-300/85">
              {spec.moves
                ? `Moves ${ownerName} from ${targetName(before)}.`
                : `Replaces ${targetName(before)}.`}
            </p>
          )}
          {!unlinking && typeof textAfter === 'string' && textAfter && (
            <p className="text-xs text-white/45">
              Shown as “{textAfter}” ({spec.text}).
            </p>
          )}
          {unlinking &&
            typeof textBefore === 'string' &&
            textBefore &&
            (textAfter === undefined ? (
              <p className="text-xs text-white/45">
                Its {spec.text} “{textBefore}” goes with it: it was the record’s
                name.
              </p>
            ) : (
              <p className="text-xs text-white/45">
                Its {spec.text} “{textBefore}” stays: the {spec.noun}’s own
                text.
              </p>
            ))}
        </div>
      );
    }
    case 'releases':
      return (
        <ListAfter
          heading="releases, as they will be"
          items={recordsIn(after?.releases).map((release) => {
            const id = String(release.releaseId ?? '');
            return { id, label: nameOf('release', id) };
          })}
          value={value}
          valueName={valueName}
          unlinking={unlinking}
        />
      );
    case 'refs':
      return (
        <ListAfter
          heading={`${spec.path}, as it will be`}
          items={recordsIn(after ? getPath(after, spec.path) : []).map(
            (entry) => {
              const id = String(entry[spec.key ?? ''] ?? '');
              return { id, label: targetName(id) };
            },
          )}
          value={value}
          valueName={valueName}
          unlinking={unlinking}
        />
      );
    case 'genre-tags': {
      const list = after ? getPath(after, fieldPath) : [];
      return (
        <ListAfter
          heading={`${fieldPath}, as it will be`}
          items={(Array.isArray(list) ? list : []).map((tag) => ({
            id: String(tag),
            label: String(tag),
          }))}
          value={
            value
              ? (genreTagField(
                  fieldPath === 'subgenreIds' ? 'subgenre' : 'genre',
                  value,
                )?.value ?? value)
              : null
          }
          valueName={valueName}
          unlinking={unlinking}
        />
      );
    }
    case 'song-artist': {
      const lead = (body: Body | null) =>
        body ? storedId(spec, body) : undefined;
      if (!unlinking && as === 'lead') {
        const before = lead(shown);
        return (
          <div className={box}>
            <p className="text-xs text-white/55">origin.artistGlobeId</p>
            <p className="text-sm text-white/85">
              <span className="text-white/45">{nameOf('artist', before)}</span>
              {' → '}
              {value ? nameOf('artist', value) : '…'}
            </p>
            {before && value && before !== value && (
              <p className="text-xs text-amber-300/85">
                Replaces {nameOf('artist', before)} as the lead act.
              </p>
            )}
          </div>
        );
      }
      const credits = recordsIn(after?.credits);
      return (
        <div className={box}>
          {unlinking && (
            <p className="text-sm text-white/85">
              <span className="text-xs text-white/55">
                origin.artistGlobeId{' '}
              </span>
              <span className="text-white/45">
                {nameOf('artist', lead(shown))}
              </span>
              {' → '}
              {nameOf('artist', lead(after))}
            </p>
          )}
          <p className="text-xs text-white/55">credits, as they will be</p>
          {credits.length === 0 ? (
            <p className="text-sm text-white/45">none</p>
          ) : (
            <ul className="flex flex-col gap-0.5 text-sm text-white/85">
              {credits.map((credit, n) => (
                <li key={n}>
                  {String(credit.name ?? '')}
                  <span className="text-xs text-white/45">
                    {' · '}
                    {String(credit.role ?? '')}
                    {credit.artistGlobeId === value && ' · linked'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
  }
};
