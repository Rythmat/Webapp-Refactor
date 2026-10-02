import { Loader2 } from 'lucide-react';
import { useRepoRoster, useSetRoster } from '@/hooks/data/admin/useRepoContent';
import { Field, useFieldAria, useReadOnly } from '../recordEditors/shared';
import { useRepoMode } from './useRepoMode';

/**
 * Repo mode only: whether an artist is on the globe's artist list (the
 * roster in `artistRegistry.ts`), which the student globe reads to find the
 * artist in its events and songs and to link to them. Off the list, the
 * artist's name and aliases live in `artists.json` with the rest of its
 * record, which students never read (design C.1).
 *
 * It acts at once, apart from the item's own Save: the move writes both
 * files (`POST /repo/roster`) and nothing else about the artist changes.
 * Students see it once the files are committed and deployed. A new artist
 * is saved first; there is nothing in the files to move before that.
 */
export const RosterToggle = ({ slug }: { slug: string | undefined }) => {
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const readOnly = useReadOnly();
  const roster = useRepoRoster(repo && !!slug && !readOnly);
  const move = useSetRoster();
  if (!repo || !slug || readOnly) return null;

  const on = roster.data?.has(slug) ?? false;
  const busy = roster.isLoading || move.isPending;
  return (
    <Field
      label="Globe"
      wide
      hint="The students’ globe finds and links the artists on its list. This writes the repo files at once; students see it after a commit and deploy."
      warning={
        move.error
          ? move.error.message
          : roster.error
            ? `The globe’s list did not load: ${roster.error.message}`
            : null
      }
    >
      <RosterCheckbox
        checked={on}
        disabled={busy || !!roster.error}
        busy={busy}
        onChange={(next) => move.mutate({ slug, on: next })}
      />
    </Field>
  );
};

const RosterCheckbox = ({
  checked,
  disabled,
  busy,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}) => {
  const aria = useFieldAria();
  return (
    <label className="flex items-center gap-2 self-start text-sm text-white/75">
      <input
        {...aria}
        type="checkbox"
        className="accent-white"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      On the globe’s artist list
      {busy && (
        <Loader2 aria-hidden className="size-3.5 animate-spin text-white/45" />
      )}
    </label>
  );
};
