import { cpSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  CITY_CODE_FILES,
  EVENT_CODE_FILES,
  REPO_ROOT,
  SUGGESTIONS_DIR,
} from '../repoStore';
import { fsReader } from '../sources/common';
import { REPO_SOURCES } from '../sources/index';

/**
 * A copy of the repo's data files in a new temp directory, for tests that
 * write: every file an adapter reads (asked of the adapters themselves, so
 * a kind added later is copied too), the importer's suggestion artifacts
 * beside the decisions log, and the code that names globe events and
 * cities, which the store reads before it lets one go. The repo's own files are only
 * read. Returns the directory; the caller removes it.
 */
export async function scratchCopy(prefix: string): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const reader = fsReader(REPO_ROOT);
  for (const source of REPO_SOURCES) {
    for (const path of await source.files(reader)) {
      const from = join(REPO_ROOT, path);
      if (!existsSync(from)) continue;
      mkdirSync(dirname(join(root, path)), { recursive: true });
      cpSync(from, join(root, path));
    }
  }
  for (const path of new Set([...EVENT_CODE_FILES, ...CITY_CODE_FILES])) {
    const from = join(REPO_ROOT, path);
    if (!existsSync(from)) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(from, join(root, path));
  }
  const suggestions = join(REPO_ROOT, SUGGESTIONS_DIR);
  if (existsSync(suggestions)) {
    cpSync(suggestions, join(root, SUGGESTIONS_DIR), { recursive: true });
  }
  return root;
}
