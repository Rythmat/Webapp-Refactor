import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/daw/store';
import { useMe } from '@/hooks/data/auth/useMe';

// ── The composer line under a sheet's title ────────────────────────────────
// The Score and the Lead Sheet show the project's composer under the title,
// edited in place with a double-click. The composer is part of the project
// (saved, synced to collaborators, carried onto set-list charts), so opening
// a sheet never writes it: filling it in with whoever opened the sheet made
// viewing an edit, and put a guest's name on someone else's song. The
// signed-in name is only the field's placeholder, and reaches the project
// only when typed. Emptying the field clears the composer.

/** Who the sheet suggests as composer: the signed-in user, if any. */
function useSuggestedComposer(): string {
  const { data: me } = useMe();
  return me?.nickname || me?.username || me?.fullName || '';
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
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            borderColor: 'var(--color-accent, #7ecfcf)',
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
      style={{ color: 'var(--color-text-dim)' }}
      onDoubleClick={startEditing}
      title="Double-click to edit composer"
    >
      {composerName ? (
        `by ${composerName}`
      ) : (
        // The prompt is for the screen; a sheet with no composer prints none.
        <span className="print:hidden">Double-click to add composer</span>
      )}
    </div>
  );
}
