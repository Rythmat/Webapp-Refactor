// ── Studio Library tag vocabularies ──────────────────────────────────────
// Fixed option sets for the per-project library metadata (genre / status /
// instruments) edited in the Studio Library and persisted as columns on
// `studio_project`. All three lists are mirrored — and enforced — in
// music-atlas-api/src/services/studio-projects/update-project-meta.ts.

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
