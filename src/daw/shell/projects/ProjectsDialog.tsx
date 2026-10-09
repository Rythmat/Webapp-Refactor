import { Download, Search, Trash2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import { SESSION_SCHEMA_VERSION } from '@/daw/persistence/projectDocument/codec';
import { openSession } from '@/daw/session/openSession';
import { getSessionDeps } from '@/daw/session/sessionDeps';
import { useSessionStore } from '@/daw/session/sessionStore';
import type { OpenIntent, SessionUser } from '@/daw/session/types';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { Chip } from '@/daw/ui/Chip';
import { ConfirmDialog } from '@/daw/ui/ConfirmDialog';
import { DawDialog } from '@/daw/ui/DawDialog';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TYPE_CLASS } from '@/daw/ui/styles';
import { DEVICE_USER_KEY, type UserKey } from '@/lib/local-store/userScope';
import type {
  DraftMeta,
  QuarantineRecord,
} from '@/lib/studio-projects/drafts/types';
import { showNotice } from '@/util/toast';
import { useCloudProjectList } from './cloudProjectList';
import {
  buildProjectRows,
  draftProjectId,
  type ProjectRow,
  type ProjectRowTag,
} from './projectRows';

// ── The Projects dialog (milestone 1.4, spec E16) ──────────────────────────
//
// Everything this student can open, in three sections: work kept on this
// device, work found on the device that names nobody yet, and the projects
// saved to their account. Open goes through openSession (the dialog closes
// first); Delete removes a device draft after a confirm. Drafts come from
// the draft port each time it opens (which re-runs the legacy import); the
// account list is fetched on open, its cached copy shown meanwhile. A
// '~device' draft whose project is in the account list is claimed for this
// user. In a shared session nothing opens: the room's project is the
// session. No Duplicate or Rename until 1.5 / 2.3.

export interface ProjectsDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  sortBy: 'recent' | 'size';
  /** A draft to scroll to and focus (the kept-work toast's View). */
  focusDraftId: string | null;
}

interface DraftLists {
  mine: DraftMeta[];
  device: DraftMeta[];
  quarantined: QuarantineRecord[];
  locked: Set<string>;
}

type DraftListStatus = 'loading' | 'ready' | 'error' | 'unavailable';

const TAG_LABEL: Record<ProjectRowTag, string> = {
  'open-now': 'Open now',
  kept: 'Kept',
  'changes-on-device': 'Changes on this device',
  'not-in-account': 'Not in your account',
  copy: 'Copy',
  'found-on-device': 'Found on this device',
  'from-earlier-version': 'From an earlier version',
  'newer-version': 'Newer version',
  'other-tab': 'Open in another tab',
};

/** Tags worth a chip on the row (the section already says 'found'). */
const SHOWN_TAGS: readonly ProjectRowTag[] = [
  'open-now',
  'kept',
  'copy',
  'changes-on-device',
  'not-in-account',
  'newer-version',
  'other-tab',
];

const pluralDrafts = (n: number) => (n === 1 ? '1 draft' : `${n} drafts`);

/** Save the quarantined entries as one JSON file, through an anchor. */
export function downloadQuarantine(records: QuarantineRecord[]): void {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          kind: 'music-atlas-studio-unopened-drafts',
          exportedAt: new Date().toISOString(),
          drafts: records,
        },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'music-atlas-unopened-drafts.json';
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Long enough for the browser to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function currentUser(): SessionUser | null {
  return getSessionDeps()?.user() ?? null;
}

/**
 * Counts the dialog's openings, bumped during the render that opens it, so
 * nothing from an earlier opening is shown even for one frame (React's
 * derive-from-props pattern).
 */
function useOpening(open: boolean): number {
  const [state, setState] = useState({ open, opening: open ? 1 : 0 });
  if (state.open !== open) {
    const next = { open, opening: state.opening + (open ? 1 : 0) };
    setState(next);
    return next.opening;
  }
  return state.opening;
}

interface HeldDraftLists {
  opening: number;
  userKey: UserKey;
  lists: DraftLists | null;
  status: 'ready' | 'error';
}

/**
 * This user's drafts, the device's, the quarantine and the locks, from the
 * draft port, asked each time the dialog opens. Lists are held with the
 * opening and the user they were read for: until this opening's answer for
 * the current user arrives, there are no rows (status 'loading'), so no
 * Open, Delete, Download or claim ever acts on a previous opening's or
 * another user's lists. A reload within one opening keeps the rows.
 */
function useDraftLists(open: boolean, opening: number) {
  const [held, setHeld] = useState<HeldDraftLists | null>(null);
  const [nonce, setNonce] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!open) return;
    const deps = getSessionDeps();
    const user = deps?.user() ?? null;
    if (!deps || !user) {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    let live = true;
    deps.drafts
      .listDrafts(user)
      .then((lists) => {
        if (live) {
          setHeld({ opening, userKey: user.userKey, lists, status: 'ready' });
        }
      })
      .catch((err: unknown) => {
        if (!live) return;
        console.warn('[projects] Drafts could not be listed:', err);
        setHeld((prev) =>
          prev && prev.opening === opening && prev.userKey === user.userKey
            ? { ...prev, status: 'error' }
            : { opening, userKey: user.userKey, lists: null, status: 'error' },
        );
      });
    return () => {
      live = false;
    };
  }, [open, opening, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const userKey = currentUser()?.userKey ?? null;
  const current =
    held !== null && held.opening === opening && held.userKey === userKey
      ? held
      : null;
  const status: DraftListStatus = unavailable
    ? 'unavailable'
    : current === null
      ? 'loading'
      : current.status;
  return {
    /** This opening's lists for the current user; null until they arrive. */
    lists: current?.lists ?? null,
    /** Whom `lists` belong to (null with them). */
    userKey: current?.lists ? current.userKey : null,
    status,
    reload,
  };
}

export function ProjectsDialog({
  open,
  onOpenChange,
  sortBy,
  focusDraftId,
}: ProjectsDialogProps) {
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState<ProjectRow | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const opening = useOpening(open);
  const drafts = useDraftLists(open, opening);
  const cloud = useCloudProjectList(open);

  // E15: membership is the editor's roomId, not isCollabActive.
  const inRoom = useStore((s) => s.roomId !== null);
  const liveProjectId = useStore((s) => s.projectId);
  const sessionDraftId = useSessionStore((s) => s.draftId);

  // A fresh search each time it opens.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // '~device' drafts of a project in this user's account are theirs. Only
  // against this opening's answers for this user: the draft lists (null
  // until they arrive) and an account list fetched now (status 'ready').
  const claimed = useRef(new Set<string>());
  useEffect(() => {
    const lists = drafts.lists;
    if (!open || cloud.status !== 'ready' || !cloud.list || !lists) return;
    const deps = getSessionDeps();
    const user = currentUser();
    if (
      !deps ||
      !user ||
      user.userKey === DEVICE_USER_KEY ||
      user.userKey !== drafts.userKey
    ) {
      return;
    }
    const ids = new Set(cloud.list.map((p) => p.id));
    const toClaim = lists.device.filter((meta) => {
      const projectId = draftProjectId(meta);
      return (
        projectId !== null &&
        ids.has(projectId) &&
        !claimed.current.has(meta.draftId)
      );
    });
    if (toClaim.length === 0) return;
    for (const meta of toClaim) claimed.current.add(meta.draftId);
    void Promise.allSettled(
      toClaim.map((meta) => deps.drafts.claimDeviceDraft(user, meta.draftId)),
    ).then((results) => {
      // A claim that failed or found nothing may be tried on a later opening.
      results.forEach((result, index) => {
        if (result.status === 'rejected' || result.value === null) {
          claimed.current.delete(toClaim[index].draftId);
        }
      });
      drafts.reload();
    });
  }, [
    open,
    cloud.status,
    cloud.list,
    drafts.lists,
    drafts.userKey,
    drafts.reload,
  ]);

  const activeDraftId =
    getSessionDeps()?.drafts.activeDraftId() ?? sessionDraftId;

  const sections = useMemo(
    () =>
      buildProjectRows({
        mine: drafts.lists?.mine ?? [],
        device: drafts.lists?.device ?? [],
        cloud: cloud.list,
        cloudFresh: cloud.status === 'ready',
        locked: drafts.lists?.locked ?? new Set(),
        activeDraftId,
        liveProjectId,
        inRoom,
        schemaVersion: SESSION_SCHEMA_VERSION,
        query,
        sortBy,
      }),
    [
      drafts.lists,
      cloud.list,
      cloud.status,
      activeDraftId,
      liveProjectId,
      inRoom,
      query,
      sortBy,
    ],
  );

  // Scroll to the draft a toast's View named, once its row is there.
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      focused.current = null;
      return;
    }
    if (!focusDraftId || focused.current === focusDraftId) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-draft-id="${CSS.escape(focusDraftId)}"]`,
    );
    if (!row) return;
    focused.current = focusDraftId;
    row.scrollIntoView({ block: 'nearest' });
    row.querySelector<HTMLElement>('button:not([disabled])')?.focus();
  }, [open, focusDraftId, sections]);

  const openRow = useCallback(
    (intent: OpenIntent | null) => {
      if (!intent) return;
      onOpenChange(false);
      void openSession(intent, { source: 'dialog' });
    },
    [onOpenChange],
  );

  const deleteRow = useCallback(
    async (row: ProjectRow) => {
      const deps = getSessionDeps();
      if (!deps || !row.draft) return;
      try {
        const result = await deps.drafts.deleteDraft(row.draft.draftId);
        if (result === 'refused') {
          showNotice('That draft is open right now, so it wasn’t deleted');
        }
      } catch (err) {
        console.warn('[projects] A draft could not be deleted:', err);
        showNotice('That draft couldn’t be deleted. Try again.');
      }
      drafts.reload();
    },
    [drafts],
  );

  // Legacy backups are kept copies, not drafts that failed to open: the line
  // counts only the others, and Download still saves everything.
  const allQuarantined = drafts.lists?.quarantined ?? [];
  const quarantined = allQuarantined.filter(
    (r) => r.source !== 'legacy-backup',
  );
  const searching = query.trim().length > 0;
  const nothingOnDevice =
    sections.device.length === 0 && sections.found.length === 0;

  return (
    <>
      <DawDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Projects"
        initialFocus={searchRef}
        className="h-[min(560px,calc(100dvh-64px))] max-w-[560px]"
      >
        <div
          className="flex h-full min-h-0 flex-col gap-3"
          data-testid="projects-dialog"
        >
          <label className="relative block shrink-0">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-daw-text-3"
            />
            <input
              ref={searchRef}
              type="search"
              aria-label="Search projects"
              placeholder="Search projects"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(
                'h-7 w-full rounded-full border border-daw-outline bg-transparent pl-8 pr-3 text-daw-text placeholder:text-daw-text-3',
                TYPE_CLASS.label,
                FOCUS_RING,
              )}
            />
          </label>

          {inRoom ? (
            <p
              className={cn(TYPE_CLASS.label, 'shrink-0 text-daw-text-3')}
              data-testid="projects-in-room"
            >
              Leave the shared session to open another project.
            </p>
          ) : null}

          <div
            ref={listRef}
            className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2"
          >
            {drafts.status === 'loading' ? (
              <p className={cn(TYPE_CLASS.label, 'py-2 text-daw-text-3')}>
                Loading…
              </p>
            ) : null}
            {drafts.status === 'error' ? (
              <p className={cn(TYPE_CLASS.label, 'py-2 text-daw-text-3')}>
                Work on this device couldn’t be listed.{' '}
                <button
                  type="button"
                  onClick={drafts.reload}
                  className={cn(
                    'min-h-6 text-daw-text underline underline-offset-2',
                    FOCUS_RING,
                  )}
                >
                  Retry
                </button>
              </p>
            ) : null}

            <Section
              title="On this device"
              rows={sections.device}
              empty={
                drafts.lists && !searching && nothingOnDevice
                  ? 'Nothing unsaved on this device.'
                  : null
              }
              onOpen={openRow}
              onDelete={setConfirming}
            />
            <Section
              title="Found on this device"
              rows={sections.found}
              empty={null}
              onOpen={openRow}
              onDelete={setConfirming}
            />

            {quarantined.length > 0 ? (
              <div
                data-testid="projects-quarantine"
                className={cn(
                  TYPE_CLASS.label,
                  'mt-1 flex min-h-11 items-center justify-between gap-3 rounded-[var(--daw-radius-md)] px-2 text-daw-text-2',
                )}
              >
                <span>
                  {pluralDrafts(quarantined.length)} couldn’t be opened
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadQuarantine(allQuarantined)}
                >
                  <Download aria-hidden />
                  Download
                </Button>
              </div>
            ) : null}

            <AccountSection
              rows={sections.account}
              signedIn={cloud.signedIn}
              status={cloud.status}
              hasList={cloud.list !== null}
              searching={searching}
              onRetry={cloud.refresh}
              onOpen={openRow}
            />
          </div>
        </div>
      </DawDialog>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) setConfirming(null);
        }}
        title="Delete from this device?"
        description={confirming ? deleteDescription(confirming) : ''}
        confirmLabel="Delete from this device"
        danger
        onConfirm={() => {
          const row = confirming;
          setConfirming(null);
          if (row) void deleteRow(row);
        }}
      />
    </>
  );
}

/**
 * The Delete confirm's line. A draft never saved to the account, or whose
 * project is gone from it, is the only copy, and the student is told so.
 */
export function deleteDescription(row: ProjectRow): string {
  const onlyCopy =
    row.draft === null ||
    draftProjectId(row.draft) === null ||
    row.tags.includes('not-in-account');
  return onlyCopy
    ? `‘${row.name}’ isn’t saved to your account. Deleting it removes the only copy.`
    : `‘${row.name}’ will be removed from this browser. Anything saved to your account stays there.`;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h3
      className={cn(
        TYPE_CLASS.label,
        'sticky top-0 z-[var(--daw-z-sticky)] bg-daw-popover pb-1 pt-3 font-bold text-daw-text-2',
      )}
    >
      {children}
    </h3>
  );
}

function Section({
  title,
  rows,
  empty,
  onOpen,
  onDelete,
}: {
  title: string;
  rows: ProjectRow[];
  empty: string | null;
  onOpen(intent: OpenIntent | null): void;
  onDelete(row: ProjectRow): void;
}) {
  if (rows.length === 0 && !empty) return null;
  return (
    <section aria-label={title}>
      <SectionHeading>{title}</SectionHeading>
      {rows.length === 0 ? (
        <p className={cn(TYPE_CLASS.label, 'py-2 text-daw-text-3')}>{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <ProjectRowItem
              key={row.key}
              row={row}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AccountSection({
  rows,
  signedIn,
  status,
  hasList,
  searching,
  onRetry,
  onOpen,
}: {
  rows: ProjectRow[];
  signedIn: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  hasList: boolean;
  searching: boolean;
  onRetry(): void;
  onOpen(intent: OpenIntent | null): void;
}) {
  let note: ReactNode = null;
  if (!signedIn) {
    note = 'Sign in to see projects saved to your account.';
  } else if (status === 'error') {
    note = (
      <>
        Your account’s projects couldn’t load.{' '}
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'min-h-6 text-daw-text underline underline-offset-2',
            FOCUS_RING,
          )}
        >
          Retry
        </button>
      </>
    );
  } else if (!hasList) {
    note = 'Loading…';
  } else if (rows.length === 0) {
    note = searching
      ? 'No saved projects match.'
      : 'Nothing saved to your account yet. Press Ctrl+S (⌘S) to save.';
  }
  return (
    <section
      aria-label="Saved to your account"
      aria-busy={status === 'loading'}
    >
      <SectionHeading>Saved to your account</SectionHeading>
      {rows.length > 0 ? (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <ProjectRowItem
              key={row.key}
              row={row}
              onOpen={onOpen}
              onDelete={() => {}}
            />
          ))}
        </ul>
      ) : null}
      {note ? (
        <p
          className={cn(TYPE_CLASS.label, 'py-2 text-daw-text-3')}
          data-testid="projects-account-note"
        >
          {note}
        </p>
      ) : null}
    </section>
  );
}

function ProjectRowItem({
  row,
  onOpen,
  onDelete,
}: {
  row: ProjectRow;
  onOpen(intent: OpenIntent | null): void;
  onDelete(row: ProjectRow): void;
}) {
  const nameId = useId();
  const chips = SHOWN_TAGS.filter((tag) => row.tags.includes(tag));
  const warning = (tag: ProjectRowTag) =>
    tag === 'not-in-account' || tag === 'newer-version';
  return (
    <li
      data-testid="projects-row"
      data-section={row.section}
      data-tags={row.tags.join(' ')}
      {...(row.draft
        ? {
            'data-draft-id': row.draft.draftId,
            'data-origin': row.draft.origin,
          }
        : {})}
      {...(row.cloud ? { 'data-project-id': row.cloud.id } : {})}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-[var(--daw-radius-md)] px-2 py-1',
        row.isOpen ? 'bg-daw-selected' : 'hover:bg-daw-hover',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            id={nameId}
            className={cn(TYPE_CLASS.body, 'min-w-0 truncate text-daw-text')}
            title={row.name}
          >
            {row.name}
          </span>
          {chips.map((tag) => (
            <Chip
              key={tag}
              tone={warning(tag) ? 'warning' : 'neutral'}
              className="hidden sm:inline-flex"
            >
              {TAG_LABEL[tag]}
            </Chip>
          ))}
        </div>
        {row.subtitle ? (
          <div className={cn(TYPE_CLASS.label, 'truncate text-daw-text-3')}>
            {row.subtitle}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {row.openSavedIntent ? (
          <Button
            size="sm"
            variant="quiet"
            onClick={() => onOpen(row.openSavedIntent)}
          >
            Open saved version
          </Button>
        ) : null}
        {!row.isOpen ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={!row.canOpen || row.openIntent === null}
            aria-describedby={nameId}
            onClick={() => onOpen(row.openIntent)}
          >
            Open
          </Button>
        ) : null}
        {row.canDelete ? (
          <IconButton
            size="sm"
            label="Delete from this device"
            icon={<Trash2 />}
            onClick={() => onDelete(row)}
          />
        ) : null}
      </div>
    </li>
  );
}
