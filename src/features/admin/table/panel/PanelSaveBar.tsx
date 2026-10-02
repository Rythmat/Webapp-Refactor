import { Loader2 } from 'lucide-react';
import { type FC, useEffect, useId, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  ContentApiError,
  type ContentStatus,
  type ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import type {
  ItemSession,
  SavedDraft,
} from '../../content/itemEditor/useItemSession';
import { inputClass } from '../../content/recordEditors/shared';
import {
  REPO_NO_STATUS_LABEL,
  repoStatusNote,
} from '../../content/repo/repoCopy';
import { useRepoMode } from '../../content/repo/useRepoMode';
import { ConsoleBadge } from '../../ui/ConsoleBadge';

/**
 * The row panel's sticky footer (Table design §7.1): Save for an admin, with
 * the item's status beside it; Submit for review for an editor, with a note
 * for whoever reviews it (their save is a proposal — the API decides that
 * from the session, so the wording only says what will happen); Discard; and
 * what went wrong, inline, each problem the API names with a way to its
 * field.
 *
 * The line above the buttons says where the draft stands: unsaved changes
 * (and what was merged under them from a version saved meanwhile), saved
 * (with any warnings the save came back with), or sent for review.
 *
 * When the item changed on the server in a field the draft changed too,
 * Save waits for the author: Reload takes the other version (the draft is
 * dropped), Keep mine lays the draft's value of those fields over it.
 *
 * For a new item (`create`) the button makes it — Create, or Submit for
 * review — whether or not anything was typed since it opened (a name can
 * arrive from the search), and waits while `blocked` says what it lacks.
 *
 * The status control offers only what the store honours (the session's
 * `statuses`, from repoCopy.ts as the content area's editors have them):
 * Draft, Published and Archived against the content API; in repo mode
 * Draft and Published for a song, and for any other kind no control at
 * all, since it is saved into its file as published whatever is asked.
 */

/** The problems a refused save names, when the API sent them. */
const problemsOf = (error: unknown): ValidationProblem[] => {
  if (!(error instanceof ContentApiError)) return [];
  const problems = error.body.problems;
  return Array.isArray(problems) ? (problems as ValidationProblem[]) : [];
};

const PRIMARY =
  'inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs text-[#101012] transition-colors hover:bg-white/90 disabled:pointer-events-none disabled:opacity-40';
const SECONDARY =
  'inline-flex h-8 items-center rounded-full px-3 text-xs text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-40';

export const PanelSaveBar: FC<{
  session: ItemSession;
  /** Scroll to the field a problem names (its body path). */
  onShowField(path: string): void;
  /** A new item: the button makes it. */
  create?: boolean;
  /** Why it cannot be saved yet ("Needs a name"), or null. */
  blocked?: string | null;
  /** After a save went through, with what it came back with. */
  onSaved?(result: SavedDraft): void;
  /** Said after "Saved": what else the save did ("2 suggestions logged"). */
  savedNote?: string | null;
}> = ({
  session,
  onShowField,
  create = false,
  blocked = null,
  onSaved,
  savedNote = null,
}) => {
  const {
    isEditor,
    dirty,
    saving,
    saveError,
    jsonError,
    status,
    setStatus,
    submitNote,
    setSubmitNote,
    stale,
    merged,
  } = session;
  const noteId = useId();
  // The literal DEV gate lets the build drop the repo branch (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const { statuses } = session;
  // What the last save came back with, until the next edit.
  const [saved, setSaved] = useState<{ warnings: ValidationProblem[] } | null>(
    null,
  );
  useEffect(() => {
    if (dirty) setSaved(null);
  }, [dirty]);

  const save = async () => {
    const result = await session.save().catch(() => null);
    if (!result) return;
    setSaved({ warnings: result.warnings });
    setSubmitNote('');
    onSaved?.(result);
  };
  const ready = (create || dirty) && !saving && !blocked && !stale;

  const problems = problemsOf(saveError);
  const errors = problems.filter((p) => p.severity !== 'warning');
  const state = saving
    ? isEditor
      ? 'Sending for review…'
      : 'Saving…'
    : dirty
      ? merged?.length
        ? `Unsaved changes, on a version saved meanwhile (${merged.join(', ')})`
        : 'Unsaved changes'
      : saved
        ? isEditor
          ? 'Sent for review'
          : 'Saved'
        : null;

  return (
    <footer
      aria-label="Save"
      className="flex shrink-0 flex-col gap-2 border-t border-white/[0.08] bg-[#101012] px-5 py-3"
    >
      {stale && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-amber-300/30 bg-amber-300/[0.06] px-3 py-2 text-xs text-amber-100/90"
        >
          <p>
            This item changed since you opened it, in {stale.overlap.join(', ')}{' '}
            — which you changed too. Nothing is saved until you choose.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={SECONDARY}
              onClick={session.discardChanges}
            >
              Reload theirs
            </button>
            <button
              type="button"
              className={SECONDARY}
              onClick={session.keepMine}
              title="Everything else is theirs; your value of these fields goes over it"
            >
              Keep mine for {stale.overlap.length === 1 ? 'it' : 'them'}
            </button>
          </div>
        </div>
      )}
      {!stale && (jsonError || saveError) && (
        <div role="alert" className="flex flex-col gap-1 text-xs text-red-300">
          <p>{jsonError ?? saveError?.message}</p>
          {errors.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {errors.map((problem, index) => (
                <li
                  key={`${problem.path ?? ''}|${index}`}
                  className="flex flex-wrap items-baseline gap-x-2"
                >
                  <span className="text-red-300/85">{problem.detail}</span>
                  {problem.path && (
                    <button
                      type="button"
                      className="text-white/55 underline underline-offset-2 hover:text-white"
                      onClick={() => onShowField(problem.path!)}
                    >
                      {problem.path}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {saved && saved.warnings.length > 0 && !dirty && (
        <ul
          aria-label="Saved with warnings"
          className="flex flex-col gap-0.5 text-xs text-amber-300/80"
        >
          {saved.warnings.map((warning, index) => (
            <li key={`${warning.path ?? ''}|${index}`}>{warning.detail}</li>
          ))}
        </ul>
      )}

      {isEditor && (
        <>
          <label htmlFor={noteId} className="sr-only">
            What changed
          </label>
          <input
            id={noteId}
            value={submitNote}
            onChange={(event) => setSubmitNote(event.target.value)}
            placeholder="What changed? (optional)"
            className={cn(inputClass, 'w-full')}
          />
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Publishing status is an admin's call; an editor proposes. */}
        {!isEditor &&
          (statuses ? (
            <select
              aria-label="Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ContentStatus)
              }
              title={repo ? repoStatusNote(session.kind) : undefined}
              className={cn(inputClass, 'h-8')}
            >
              {statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            repo && (
              <ConsoleBadge tone="muted" title={repoStatusNote(session.kind)}>
                {REPO_NO_STATUS_LABEL}
              </ConsoleBadge>
            )
          ))}
        <p
          role="status"
          className={cn(
            'min-w-0 flex-1 truncate text-xs',
            dirty ? 'text-amber-300/85' : 'text-white/45',
          )}
        >
          {blocked && !saving ? blocked : state}
          {saved && !dirty && savedNote && ` · ${savedNote}`}
          {saved && saved.warnings.length > 0 && !dirty && (
            <>
              {' · '}
              {saved.warnings.length}{' '}
              {saved.warnings.length === 1 ? 'warning' : 'warnings'}
            </>
          )}
        </p>
        <button
          type="button"
          className={SECONDARY}
          disabled={!dirty || saving}
          onClick={session.discardChanges}
        >
          Discard
        </button>
        <button
          type="button"
          className={PRIMARY}
          disabled={!ready}
          title={blocked ?? undefined}
          onClick={() => void save()}
        >
          {saving && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {isEditor ? 'Submit for review' : create ? 'Create' : 'Save'}
        </button>
      </div>
    </footer>
  );
};
