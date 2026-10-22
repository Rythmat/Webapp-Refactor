// Read-only access to Serum 2's presets.db (SQLite). Opened immutable —
// the DB ships with live -wal/-shm companions we must not touch.

import { join, dirname } from 'node:path';
// eslint-disable-next-line import/no-unresolved -- Node >=22 builtin; the resolver's core-module list predates it
import { DatabaseSync } from 'node:sqlite';

export interface CandidateRow {
  name: string;
  category: string;
  author: string;
  description: string;
  location: string;
  file: string; // absolute path to the .SerumPreset
}

const EXCLUDED_TAGS = [
  'Multisample',
  'Sample',
  'Spectral',
  'Granular',
  'Arp',
  'Clip',
];

/**
 * The curation pool: factory wavetable presets that don't depend on engines
 * or sequencing Oracle lacks. ~234 rows.
 */
export function queryCandidates(dbPath: string): CandidateRow[] {
  const db = new DatabaseSync(`file:${dbPath}?mode=ro&immutable=1`, {
    readOnly: true,
  });
  try {
    const placeholders = EXCLUDED_TAGS.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT p.name, p.category, p.author, p.description, l.location
         FROM Presets p JOIN Locations l ON l.location_id = p.location_id
         WHERE p.file_ext = 'SerumPreset'
           AND l.location LIKE '%Factory%'
           AND EXISTS (
             SELECT 1 FROM Presets_Tags pt JOIN Tags t ON t.tag_id = pt.tag_id
             WHERE pt.preset_id = p.preset_id AND t.name = 'Wavetable')
           AND NOT EXISTS (
             SELECT 1 FROM Presets_Tags pt JOIN Tags t ON t.tag_id = pt.tag_id
             WHERE pt.preset_id = p.preset_id AND t.name IN (${placeholders}))
         ORDER BY p.category, p.name`,
      )
      .all(...EXCLUDED_TAGS) as Array<Record<string, string>>;

    // location is the presets dir relative to the library root; the caller
    // resolves against the Serum 2 Presets folder.
    const presetsRoot = dirname(dirname(dbPath)); // …/Serum 2 Presets
    return rows.map((r) => ({
      name: r.name,
      category: r.category ?? '',
      author: r.author ?? '',
      description: r.description ?? '',
      location: r.location,
      file: resolvePresetFile(presetsRoot, r.location, r.name),
    }));
  } finally {
    db.close();
  }
}

function resolvePresetFile(
  presetsRoot: string,
  location: string,
  name: string,
): string {
  // Locations are relative to the Presets dir: "Factory/Bass/808"
  const dir = location.startsWith('/')
    ? location
    : join(presetsRoot, 'Presets', location);
  return join(dir, `${name}.SerumPreset`);
}
