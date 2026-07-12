// ── Studio Library tag vocabularies ──────────────────────────────────────
// Fixed option sets for the per-project library metadata (genre / status /
// instruments) edited in the Studio Library and persisted via
// api/project-meta/*. PROJECT_STATUSES is mirrored in api/project-meta/[id].ts.

export const PROJECT_STATUSES = [
  'Idea',
  'In progress',
  'Mixing',
  'Done',
  'Archived',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_GENRES = [
  'Rock',
  'R&B',
  'Pop',
  'Indie',
  'Hip-Hop',
  'Electronic',
  'Jazz',
  'Classical',
] as const;

export const PROJECT_INSTRUMENTS = [
  'Piano',
  'Keys',
  'Guitar',
  'Bass',
  'Drums',
  'Synth',
  'Vocals',
  'Strings',
  'Pad',
  'Lead',
] as const;
