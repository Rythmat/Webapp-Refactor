import { CAN_WRITE_FILES } from '../../drumGrooves/devFiles';

/** What the dev server wrote (scripts/vite/devContentWriter.ts). */
export interface FingerWriteReport {
  /** Repo-relative files changed. */
  files: string[];
  /** Notes whose finger was set, changed or taken out. */
  changed: number;
  /** Steps left alone, and why. */
  skipped: string[];
}

/**
 * On a dev server, a saved lesson level's fingers written into the lesson
 * files, where Learn reads them; null anywhere else. Only the fingers: the
 * rest of a lesson goes through the API.
 */
export async function writeLessonFingersToFiles(level: {
  id: string;
}): Promise<FingerWriteReport | null> {
  if (!CAN_WRITE_FILES) return null;
  const res = await fetch(
    `/__dev/lesson-fingers/${encodeURIComponent(level.id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(level),
    },
  );
  const body = (await res.json().catch(() => ({}))) as FingerWriteReport & {
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  return body;
}

/** The report in a sentence, or null when there's nothing to say. */
export function describeFingerWrite(report: FingerWriteReport): string | null {
  const parts: string[] = [];
  if (report.changed)
    parts.push(
      `${report.changed} finger${report.changed === 1 ? '' : 's'} written to ${report.files.join(', ')}.`,
    );
  if (report.skipped.length)
    parts.push(`Left alone: ${report.skipped.join('; ')}.`);
  return parts.length ? parts.join(' ') : null;
}
