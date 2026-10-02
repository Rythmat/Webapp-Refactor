import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  ContentApiError,
  type ContentItemDetail,
  type ContentKind,
  type ContentStatus,
  type SaveContentResult,
  useApproveContentEdit,
  useContentItem,
  useContentTemplate,
  useDeleteContentItem,
  useDiscardContentEdit,
  useRejectContentEdit,
  useSaveContentItem,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { isContentEditor } from '../../consoleRoles';
import { useUnsavedChanges } from '../mirror/UnsavedChangesGuard';
import { statusChoices } from '../repo/repoCopy';
import { useRepoMode } from '../repo/useRepoMode';
import { rebaseDraft } from './rebase';

/**
 * One content item's editing session: load it (or start a new one), hold the
 * draft body, save it, and act on its review — for any page that edits an
 * item: the content area's editor, the mirror's song page, the Table's row
 * panel.
 *
 * It knows nothing of the kind specs (`kinds.ts`, which bring every kind's
 * editor with them): the caller hands over what it needs of the kind — its
 * local default for "New …" — so the Table's row panel can hold a session
 * without loading the song page editor. `useContentItemEditor` is this plus
 * the kind's spec, for the pages that render by spec.
 *
 * `body` is the single source of truth; every view writes into it. What the
 * session seeds from, and when it re-seeds, is the part that took care:
 *  - an editor opening an item they have already submitted builds on THEIR
 *    proposal, not the live body, or resubmitting would throw the queued work
 *    away; an admin sees the live body and acts on the proposal through the
 *    review banner;
 *  - it re-seeds only when the server's version actually moved (see
 *    `versionOf`), never on a mere refetch, which would wipe unsaved edits;
 *  - when the item moves on the server while the draft has unsaved changes
 *    (a bulk accept, a Link… from another row, someone else's save), the
 *    draft is laid onto the new version (`rebase.ts`): what it changed goes
 *    over theirs, and everything else is theirs. Where both changed a field
 *    differently the session is `stale` — nothing is saved until the author
 *    reloads theirs or keeps theirs under their own (`keepMine`);
 *  - every save of an existing item reads it again first and does the same,
 *    so a save never writes back an old copy of what someone else changed;
 *  - a save also sends the revision of the version the draft is laid on
 *    (`expectedRevision`, contract 5b), so a version saved between that
 *    read and the write is refused by the server (409 `REVISION_CONFLICT`)
 *    rather than written over. The session then reads the item again and
 *    lays the draft onto it as above: where nothing overlaps it saves once
 *    more, and where the two changed the same field it is `stale`, and the
 *    author chooses, as for a change seen before the save.
 *
 * Saving is identity-aware: the slug is the kind's identity field (`id` for
 * today's kinds, `slug` for the records), and a new item is sent create-only
 * where the server supports it, so it can never overwrite an existing one.
 * Once a new item is saved the session goes on as that item, so a second
 * save updates it rather than trying to create it again.
 */

export interface ItemSessionOptions {
  kind: ContentKind;
  /** The item's DB id, or 'new'. */
  itemId: string;
  /** For a new item: the body to start from (else `makeDefault`'s). */
  newBody?: Record<string, unknown>;
  /**
   * The kind's local body for "New …" (a song's 4-bar starter), when the
   * caller has none; without either, the server's template.
   */
  makeDefault?: () => Record<string, unknown>;
  /**
   * Held from a save's re-read to its write, when the page writes the item
   * from more than one place: the Table's row panel passes the item lock
   * its cell edits and Link… hold too (`table/edit/itemLock.ts`), so a
   * save never reads the item while another write to it is on its way
   * and then puts that write's values back. Without it, a save runs at
   * once, as the content area's editors do.
   */
  lock?: <T>(run: () => Promise<T>) => Promise<T>;
}

type Body = Record<string, unknown>;

/**
 * Whose proposal the item carries, as this viewer sees it: `mine` (an
 * editor's own, which the session builds on), `other` (anyone else's, or
 * any at all for an admin, whose saves are never proposals), or null.
 * An editor is not shown another editor's proposed body, only that one
 * exists (`pendingById`, `editState`).
 */
export type ProposalOwner = 'mine' | 'other' | null;

export function proposalOwner(
  detail: ContentItemDetail | undefined,
  isEditor: boolean,
  userId: string | null | undefined,
): ProposalOwner {
  if (!detail) return null;
  if (!detail.pendingBody && !detail.pendingById && !detail.editState)
    return null;
  if (!isEditor) return 'other';
  if (detail.pendingById)
    return userId && detail.pendingById === userId ? 'mine' : 'other';
  return detail.pendingBody ? 'mine' : 'other';
}

/** The item changed on the server in a field the draft changed too. */
export interface StaleDraft {
  /** The fields both changed, differently ("born.date"). */
  overlap: string[];
  /** Every field the other version changed. */
  theirs: string[];
}

/** A save that went through: the server's answer, what was sent, over what. */
export interface SavedDraft extends SaveContentResult {
  sent: Body;
  /** The version the draft was laid on; null for a new item. */
  from: Body | null;
}

/** A stale draft, with the version it is stale against. */
interface StaleState extends StaleDraft {
  key: string;
  seed: Body;
  /** That version's revision, when the server numbers them. */
  revision: number | undefined;
}

/** The server refused a save because the item moved since its revision. */
const isRevisionConflict = (error: unknown): boolean =>
  error instanceof ContentApiError &&
  error.status === 409 &&
  error.code === 'REVISION_CONFLICT';

export function useItemSession({
  kind,
  itemId,
  newBody,
  makeDefault,
  lock,
}: ItemSessionOptions) {
  // A new item saved in this session: from then on the session is that item.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const currentId = createdId ?? itemId;
  const isNew = currentId === 'new';
  const { role, userId } = useAuthContext();
  // An editor's save is a proposal: the API decides that from the session, so
  // this only changes what the page offers and what it calls things.
  const isEditor = isContentEditor(role);
  const caps = useCapabilities();
  // The literal DEV gate lets the build drop the repo branch (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  // The statuses a save may set: none for an editor (the API ignores theirs)
  // and none in repo mode but a song's, where every other kind is saved
  // into its file as published whatever is asked.
  const statuses = isEditor ? null : statusChoices(kind, repo);

  const existing = useContentItem(isNew ? undefined : currentId);
  const template = useContentTemplate(isNew && !newBody ? kind : undefined);
  const saveMutation = useSaveContentItem();
  const removeMutation = useDeleteContentItem();
  const approve = useApproveContentEdit();
  const reject = useRejectContentEdit();
  const discard = useDiscardContentEdit();

  const [status, setStatusState] = useState<ContentStatus>('draft');
  const [body, setBody] = useState<Record<string, unknown> | null>(null);
  // Bumped to re-seed an uncontrolled JSON pane from the current body.
  const [jsonSeed, setJsonSeed] = useState(0);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dirty, setDirtyState] = useState(false);
  // Editors only: a one-line "what I changed", shown to whoever reviews it.
  const [submitNote, setSubmitNote] = useState('');
  // Editors only: abandon a sent-back draft and start again from the live body.
  const [restartFromLive, setRestartFromLive] = useState(false);

  const markClean = useUnsavedChanges(dirty);

  // What the draft is laid on (the version it was seeded from, or last
  // merged with), the draft itself and whether it has changes — as refs too,
  // for the merge, which runs from an effect and from a save in flight.
  const baseRef = useRef<Body | null>(null);
  // The base's revision: what a save sends as `expectedRevision`. Undefined
  // for a new item, and on a server that numbers no revisions.
  const revisionRef = useRef<number | undefined>(undefined);
  const bodyRef = useRef<Body | null>(null);
  const dirtyRef = useRef(false);
  const [stale, setStaleState] = useState<StaleState | null>(null);
  const staleRef = useRef(stale);
  // Fields another version changed that were merged under the draft.
  const [merged, setMerged] = useState<string[] | null>(null);

  const setDraft = (next: Body) => {
    bodyRef.current = next;
    setBody(next);
  };
  const setDirty = (next: boolean) => {
    dirtyRef.current = next;
    setDirtyState(next);
  };
  const setStale = (next: typeof stale) => {
    staleRef.current = next;
    setStaleState(next);
  };

  /** Edit the in-memory body and flag unsaved changes. */
  const applyBody = (next: Record<string, unknown>) => {
    setDraft(next);
    setDirty(true);
  };

  const setStatus = (next: ContentStatus) => {
    setStatusState(next);
    setDirty(true);
  };

  // For "New …", the caller's body, else the kind's local default, else the
  // server's template. Memoized so its identity is stable and the seeding
  // effect runs once; the caller's body and default are constants of the
  // session, which starts afresh only with another kind.
  const defaultBody = useMemo(
    () => (isNew ? (newBody ?? makeDefault?.() ?? null) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isNew, kind],
  );

  /** The body the session builds on: an editor's own proposal, else the live body. */
  const seedOf = useCallback(
    (detail: ContentItemDetail): Body =>
      proposalOwner(detail, isEditor, userId) === 'mine' &&
      detail.pendingBody &&
      !restartFromLive
        ? detail.pendingBody
        : detail.body,
    [isEditor, userId, restartFromLive],
  );

  /**
   * The server's version of the item, as a key that moves only when it does.
   *
   * Keyed on updatedAt/editState rather than on the query result's identity,
   * which changes on every refetch: react-query hands back a fresh object each
   * time (SuperJSON revives Dates, so structural sharing cannot dedupe it), and
   * an effect keyed on that would re-seed whenever anything invalidated the
   * content queries. Keying on the id ALONE has the opposite failure —
   * approving an edit rewrites the body server-side and the pane would keep
   * showing the pre-approval version, one Save away from reverting it.
   *
   * An editor's own proposal moves without the item's `updatedAt` (a
   * proposal is not a save of the item): when the session builds on it,
   * its `pendingAt` is part of the version too, so a suggestion accepted
   * into it elsewhere (the row panel's Accept) shows here rather than being
   * saved over.
   */
  const versionOf = useCallback(
    (detail: ContentItemDetail): string => {
      const own =
        proposalOwner(detail, isEditor, userId) === 'mine' && !restartFromLive;
      return `${detail.id}:${
        detail.updatedAt ? new Date(detail.updatedAt).getTime() : ''
      }:${detail.revision ?? ''}:${detail.editState ?? ''}:${
        restartFromLive ? 'live' : ''
      }${
        own && detail.pendingAt
          ? `:${new Date(detail.pendingAt).getTime()}`
          : ''
      }`;
    },
    [isEditor, userId, restartFromLive],
  );

  const seed = isNew
    ? (defaultBody ?? template.data?.body)
    : existing.data
      ? seedOf(existing.data)
      : undefined;
  const seedKey = isNew
    ? 'new'
    : existing.data
      ? versionOf(existing.data)
      : ':';
  const seededKey = useRef<string | null>(null);

  /** Start (again) from `from`: nothing unsaved. */
  const reseed = (from: Body, key: string, detail?: ContentItemDetail) => {
    seededKey.current = key;
    baseRef.current = from;
    revisionRef.current = detail?.revision;
    setDraft(from);
    setJsonSeed((value) => value + 1);
    if (detail) setStatusState(detail.status);
    setStale(null);
    setMerged(null);
    setDirty(false);
  };

  /**
   * Take in a version of the item from the server: from the query, or read
   * again by a save. Once per version. With nothing unsaved, the session
   * starts from it; with a draft, the draft is laid onto it — at once where
   * nothing overlaps, and otherwise not until the author chooses. Returns
   * whether the draft can be saved as it now stands.
   */
  const absorb = (detail: ContentItemDetail): boolean => {
    const key = versionOf(detail);
    if (seededKey.current === key) return staleRef.current === null;
    if (staleRef.current?.key === key) return false;
    const next = seedOf(detail);
    if (!dirtyRef.current || !baseRef.current || !bodyRef.current) {
      reseed(next, key, detail);
      return true;
    }
    const rebased = rebaseDraft(baseRef.current, bodyRef.current, next);
    if (rebased.overlap.length) {
      setStale({
        key,
        seed: next,
        revision: detail.revision,
        overlap: rebased.overlap,
        theirs: rebased.theirs,
      });
      return false;
    }
    seededKey.current = key;
    baseRef.current = next;
    revisionRef.current = detail.revision;
    setDraft(rebased.body);
    setJsonSeed((value) => value + 1);
    setStale(null);
    if (rebased.theirs.length)
      setMerged((before) => [
        ...new Set([...(before ?? []), ...rebased.theirs]),
      ]);
    return true;
  };

  useEffect(() => {
    if (!seed) return;
    if (isNew) {
      if (seededKey.current !== 'new') reseed(seed as Body, 'new');
      return;
    }
    if (existing.data) absorb(existing.data);
    // `absorb` reads the refs; the version key says when to run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, seedKey, isNew]);

  // Warn before losing unsaved edits on a hard navigation / tab close.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const staleMessage = (paths: readonly string[]) =>
    `This item changed since you opened it, in ${paths.join(', ')} — which you changed too. Reload it, or keep your version of those fields, then save.`;

  /**
   * Save the body; resolves with the result — and what was sent, over what
   * — or null when it was not sent. Under the caller's `lock` when it gave
   * one, from the re-read to the write.
   */
  const save = (): Promise<SavedDraft | null> =>
    lock ? lock(saveNow) : saveNow();

  /**
   * Read the item again and lay the draft onto it (`absorb`). False when
   * the two changed the same field: the session is stale, and says so.
   */
  const catchUp = async (): Promise<boolean> => {
    const fresh = (await existing.refetch()).data;
    if (fresh && !absorb(fresh)) {
      // `absorb` has just set it; a narrowing before the await predates it.
      const found = staleRef.current as StaleState | null;
      setJsonError(staleMessage(found?.overlap ?? []));
      return false;
    }
    return true;
  };

  const saveNow = async (): Promise<SavedDraft | null> => {
    if (!bodyRef.current) return null;
    if (staleRef.current) {
      setJsonError(staleMessage(staleRef.current.overlap));
      return null;
    }
    // Read it again first: a version saved meanwhile (by anyone, from
    // anywhere) is merged under the draft, or stops the save where the two
    // changed the same field — never written over with an old copy.
    if (!isNew && existing.data && !(await catchUp())) return null;
    const identity = caps.identityOf(kind);
    const slug = String(bodyRef.current[identity] ?? '').trim();
    if (!slug) {
      setJsonError(
        `This item needs a "${identity}" — it becomes the item's id.`,
      );
      return null;
    }
    setJsonError(null);
    const send = (body: Body) => {
      const revision = isNew ? undefined : revisionRef.current;
      return saveMutation.mutateAsync({
        kind,
        slug,
        body,
        // An editor never sets status — the API ignores it for them, and
        // sending one would only make the button lie about what it does.
        // Nor does repo mode for anything but a song (`statuses`).
        status: statuses ? status : undefined,
        note: isEditor ? submitNote.trim() || undefined : undefined,
        ...(isNew && caps.feature('create') ? { create: true as const } : {}),
        ...(revision !== undefined ? { expectedRevision: revision } : {}),
      });
    };
    let draft = bodyRef.current;
    let from = baseRef.current;
    let result: SaveContentResult;
    try {
      result = await send(draft);
    } catch (error) {
      if (isNew || !isRevisionConflict(error)) throw error;
      // Saved by someone between the read above and this write: read it
      // again and lay the draft onto that, as above. Where the two changed
      // the same field the author chooses (`stale`), so the refusal is not
      // an error to show; otherwise the draft goes once more, and a second
      // refusal is.
      saveMutation.reset();
      if (!(await catchUp())) return null;
      draft = bodyRef.current;
      from = baseRef.current;
      result = await send(draft);
    }
    // Before the caller navigates: the guard must not stop a saved page.
    markClean();
    // What was sent is what the next version is laid onto: typing on while
    // the refetch is on its way is not a conflict with one's own save.
    baseRef.current = draft;
    revisionRef.current = result.item.revision;
    setMerged(null);
    // Unsaved only if the author typed on while it was saving.
    setDirty(bodyRef.current !== draft);
    if (isNew) setCreatedId(result.item.id);
    return { ...result, sent: draft, from };
  };

  /** Drop the unsaved changes: back to the item as the server has it now. */
  const discardChanges = () => {
    const found = staleRef.current;
    const latest = found?.seed ?? seed;
    if (latest) {
      reseed(latest as Body, found?.key ?? seedKey);
      revisionRef.current = found
        ? found.revision
        : isNew
          ? undefined
          : existing.data?.revision;
    }
    if (!isNew && existing.data) setStatusState(existing.data.status);
    setJsonError(null);
    saveMutation.reset();
    markClean();
    setDirty(false);
  };

  /**
   * The item changed where the draft did too: keep the draft's value of
   * those fields over theirs (everything else is theirs), and go on editing.
   */
  const keepMine = () => {
    const found = staleRef.current;
    if (!found || !baseRef.current || !bodyRef.current) return;
    const rebased = rebaseDraft(baseRef.current, bodyRef.current, found.seed, {
      mineWins: true,
    });
    seededKey.current = found.key;
    baseRef.current = found.seed;
    revisionRef.current = found.revision;
    setDraft(rebased.body);
    setJsonSeed((value) => value + 1);
    setStale(null);
    setJsonError(null);
    setMerged(rebased.theirs.length ? rebased.theirs : null);
  };

  const loading = isNew
    ? defaultBody
      ? false
      : template.isLoading
    : existing.isLoading;

  return {
    kind,
    isNew,
    isEditor,
    existing,
    template,
    loading,
    body,
    /** What the draft is laid on: the server's version it started from. */
    base: baseRef.current,
    applyBody,
    dirty,
    /** Whose proposal the item carries, as this viewer sees it. */
    proposal: proposalOwner(existing.data, isEditor, userId),
    /** The item changed where the draft did too: reload, or keep mine. */
    stale: stale ? { overlap: stale.overlap, theirs: stale.theirs } : null,
    keepMine,
    /** Fields another version changed, merged under the draft since it was opened. */
    merged,
    status,
    setStatus,
    /**
     * The statuses a save may set, for the status control; null when it
     * sets none (an editor, or repo mode for anything but a song).
     */
    statuses,
    submitNote,
    setSubmitNote,
    jsonSeed,
    reseedJson: () => setJsonSeed((value) => value + 1),
    jsonError,
    setJsonError,
    save,
    saving: saveMutation.isPending,
    saveError: saveMutation.error,
    discardChanges,
    remove: async () => {
      if (!existing.data) return false;
      await removeMutation.mutateAsync(existing.data.id);
      markClean();
      setDirty(false);
      return true;
    },
    review: {
      busy: approve.isPending || reject.isPending || discard.isPending,
      // Shown by the banner: a failed approve used to vanish silently.
      error: approve.error ?? reject.error ?? discard.error ?? null,
      // Each resolves either way; a failure is shown from `error` above.
      approve: () =>
        existing.data
          ? approve.mutateAsync(existing.data.id).catch(() => undefined)
          : undefined,
      reject: (note: string) =>
        existing.data
          ? reject
              .mutateAsync({ id: existing.data.id, note })
              .catch(() => undefined)
          : undefined,
      // Withdrawing a proposal, or starting again from the live body, is
      // leaving the draft behind: the next version starts afresh.
      discard: () =>
        existing.data
          ? discard
              .mutateAsync(existing.data.id)
              .then(() => {
                markClean();
                setDirty(false);
              })
              .catch(() => undefined)
          : undefined,
      restartFromLive: () => {
        setDirty(false);
        setRestartFromLive(true);
      },
    },
  };
}

export type ItemSession = ReturnType<typeof useItemSession>;
