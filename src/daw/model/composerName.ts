// ── Who a project's composer is, by default ────────────────────────────────
// The signed-in student's name: their nickname, else their username, else
// their full name. A new project starts with it as its composer (the
// session's new and template opens, owner 2026-10-22), and a sheet with no
// composer offers it (ComposerLine).

interface NamedUser {
  nickname?: string | null;
  username?: string | null;
  fullName?: string | null;
}

/** The name a project's composer defaults to; '' when there is none. */
export function composerNameOf(me: NamedUser | null | undefined): string {
  return (me?.nickname || me?.username || me?.fullName || '').trim();
}
