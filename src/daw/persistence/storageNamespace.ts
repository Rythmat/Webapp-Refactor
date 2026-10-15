// ── Whose it is, in storage keys ───────────────────────────────────────────
//
// What the Studio keeps on a device for one person (prefs, kept work, the
// drafts set aside and backed up) sits under a key naming them, since school
// Chromebooks are shared. Every such key names them the same way, so one
// module's entry can be matched to another's (a quarantined kept slot to its
// owner, say). No imports: the store, the prefs and the quarantine all load
// this.

/**
 * A user's namespace in storage keys: their id, encoded so it never holds a
 * ':' and one id can't be the start of another's namespace; 'anon' signed
 * out.
 */
export const userNamespace = (userId?: string | null): string =>
  encodeURIComponent(userId || 'anon');

/**
 * How long the ISO time ending a timestamped key is: 2026-10-07T09:00:00.000Z.
 * Kept work, quarantined drafts and backups are named by when they were
 * written.
 */
export const ISO_LENGTH = 24;
