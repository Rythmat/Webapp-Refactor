/**
 * What this browser's last repo compare found, so Publishing can hide the
 * Import tab once the store matches the repo.
 *
 * Import is temporary: one more run lands the charts the old schema rejected,
 * and then the tab has nothing to do. It shows while it might — never
 * compared here, or the last compare left writes or failures — and hides
 * after a clean one. The URL keeps working either way. localStorage, because
 * this is a per-browser convenience, never a record anyone relies on.
 */

const KEY = 'console.songImport.lastCompare';

export interface ImportMemory {
  /** ISO time of the compare or write that left this. */
  at: string;
  /** Songs still to create or replace. */
  toWrite: number;
  failures: number;
}

export function readImportMemory(): ImportMemory | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ImportMemory>;
    return typeof parsed.toWrite === 'number' &&
      typeof parsed.failures === 'number'
      ? {
          at: String(parsed.at ?? ''),
          toWrite: parsed.toWrite,
          failures: parsed.failures,
        }
      : null;
  } catch {
    return null;
  }
}

export function rememberImport(memory: Omit<ImportMemory, 'at'>): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...memory, at: new Date().toISOString() }),
    );
  } catch {
    // Storage off or full: the tab just keeps showing.
  }
}

export const shouldOfferImport = (
  memory: ImportMemory | null = readImportMemory(),
): boolean => !memory || memory.toWrite > 0 || memory.failures > 0;
