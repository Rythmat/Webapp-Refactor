/**
 * Pure CSV builder for the session report + assignment progress. Reads only
 * from PublishedDay.snapshot (firewall-safe by construction) and the
 * responsesByEnrollment map — never touches Day.rationale. Serialises each
 * response payload per-kind with RFC-4180 escaping.
 *
 * Sprint 4 mock stores no per-response timestamp, so createdAt falls back to
 * session.endedAt ?? startedAt. Ryan's PartyKit swap surfaces the real ts.
 */
import type { Interaction, InteractionResponsePayload } from '../types';
import type { SessionState } from './sessionsStore';

export interface BuildSessionCsvInput {
  session: Pick<
    SessionState,
    'sessionId' | 'classroomId' | 'startedAt' | 'endedAt'
  >;
  publishedDayTitle: string;
  interactions: Interaction[];
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >;
  getDisplayName?: (enrollmentId: string) => string | undefined;
}

const HEADERS = [
  'sessionId',
  'publishedDayTitle',
  'enrollmentId',
  'displayName',
  'interactionId',
  'questionEn',
  'kind',
  'payload',
  'createdAt',
] as const;

const escapeField = (raw: string): string => {
  const needsQuoting = /[",\n\r]/.test(raw);
  if (!needsQuoting) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
};

const serializePayload = (payload: InteractionResponsePayload): string => {
  switch (payload.kind) {
    case 'choice':
      return payload.choices.join('|');
    case 'text':
      return payload.text;
    case 'number':
      return String(payload.value);
    case 'draw':
      return `[${payload.strokes.length} strokes]`;
    case 'check-in':
      return `TEACHER_ONLY:${payload.value}`;
    case 'atlas':
      return `${payload.activityRef}|${JSON.stringify(payload.result)}`;
  }
};

export const buildSessionCsv = (input: BuildSessionCsvInput): string => {
  const { session, publishedDayTitle, interactions, responsesByEnrollment } =
    input;
  const createdAt = session.endedAt ?? session.startedAt;
  const rows: string[] = [HEADERS.join(',')];

  const interactionsById = new Map<string, Interaction>();
  for (const ix of interactions) interactionsById.set(ix.id, ix);

  const sortedEnrollments = Object.keys(responsesByEnrollment).sort();
  for (const enrollmentId of sortedEnrollments) {
    const bag = responsesByEnrollment[enrollmentId] ?? {};
    const displayName = input.getDisplayName?.(enrollmentId) ?? enrollmentId;
    const interactionIds = Object.keys(bag).sort();
    for (const interactionId of interactionIds) {
      const payload = bag[interactionId];
      const interaction = interactionsById.get(interactionId);
      const row = [
        session.sessionId,
        publishedDayTitle,
        enrollmentId,
        displayName,
        interactionId,
        interaction?.question.en ?? '',
        payload.kind,
        serializePayload(payload),
        createdAt,
      ]
        .map((f) => escapeField(String(f)))
        .join(',');
      rows.push(row);
    }
  }

  return rows.join('\n');
};

export const downloadCsv = (filename: string, csv: string): void => {
  if (typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
