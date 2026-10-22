import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/daw/store';
import { composerNameOf } from '@/daw/model/composerName';
import { useMe } from '@/hooks/data/auth/useMe';

// ── The composer line under a sheet's title ────────────────────────────────
// The Score and the Lead Sheet show the project's composer under the title,
// edited in place with a double-click. The composer is part of the project
// (saved, synced to collaborators, carried onto set-list charts), so opening
// a sheet never writes it: filling it in with whoever opened the sheet made
// viewing an edit, and put a guest's name on someone else's song. A new
// project starts with its creator as composer (the session's new and
// template opens, owner 2026-10-22). A sheet with none offers the signed-in
// name, faint and never printed, in place of the old "Double-click to add
// composer"; it is the field's placeholder, and reaches the project only
// when typed. Emptying the field clears the composer.

/** Who the sheet suggests as composer: the signed-in user, if any. */
function useSuggestedComposer(): string {
  const { data: me } = useMe();
  return composerNameOf(me);
}

export function ComposerLine() {
  const composerName = useStore((s) => s.composerName);
  const setComposerName = useStore((s) => s.setComposerName);
  const suggestion = useSuggestedComposer();

  const [isEditing, setIsEditing] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // The composer the field opened with. A collaborator's edit can reach the
  // store while the field is open, so the field's text is only an edit when
  // it differs from this: comparing it with the store alone would write the
  // stale text back over theirs, and an untouched empty field would clear it
  // for everyone.
  const openedWith = useRef('');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openedWith.current = composerName;
      setInput(composerName);
      setIsEditing(true);
    },
    [composerName],
  );

  const commit = useCallback(() => {
    const next = input.trim();
    // Only a real change is written: closing the field with the text it
    // opened with (even after a collaborator renamed the composer meanwhile),
    // or committing it twice, is no edit to the project.
    if (
      next !== openedWith.current.trim() &&
      next !== useStore.getState().composerName
    ) {
      setComposerName(next);
    }
    setIsEditing(false);
  }, [input, setComposerName]);

  if (isEditing) {
    return (
      <div className="mb-1 flex justify-center">
        <input
          ref={inputRef}
          aria-label="Composer"
          value={input}
          placeholder={suggestion || undefined}
          onChange={(e) => setInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="rounded border px-2 py-0.5 text-center text-sm"
          style={{
            background: 'var(--daw-surface-2)',
            color: 'var(--daw-text)',
            borderColor: 'var(--daw-accent)',
            outline: 'none',
            width: 200,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="leadsheet-composer mb-1 cursor-pointer text-center text-sm"
      style={{ color: 'var(--daw-text-3)' }}
      onDoubleClick={startEditing}
      title="Double-click to edit composer"
    >
      {composerName ? (
        `by ${composerName}`
      ) : (
        // The offer is for the screen; a sheet with no composer prints none.
        <span data-testid="composer-offer" className="opacity-60 print:hidden">
          {suggestion ? `by ${suggestion}` : 'Composer'}
        </span>
      )}
    </div>
  );
}
