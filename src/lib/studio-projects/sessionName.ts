// ── A Studio session's name ────────────────────────────────────────────────
// What the Studio makes is a session (owner, 2026-11-11): a Library Project
// is a folder of them. A new one is 'Untitled Session'. Sessions made before
// were named 'Untitled Project' and keep that name where they are stored
// (drafts, the account), so it is read as untitled wherever a name is shown.
// No imports: the editor, the Library and Home all load this.

export const UNTITLED_SESSION = 'Untitled Session';

/** The default name sessions were given before 2026-11-11. */
export const LEGACY_UNTITLED_SESSION = 'Untitled Project';

/** Whether `name` is no name of the student's own: empty, or a default. */
export function isUntitledSessionName(
  name: string | null | undefined,
): boolean {
  const trimmed = name?.trim() ?? '';
  return (
    trimmed === '' ||
    trimmed === UNTITLED_SESSION ||
    trimmed === LEGACY_UNTITLED_SESSION
  );
}

/** The name to show for a session: its own, else 'Untitled Session'. */
export function sessionDisplayName(name: string | null | undefined): string {
  return isUntitledSessionName(name) ? UNTITLED_SESSION : name!.trim();
}
