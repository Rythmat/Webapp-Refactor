import { useStore, type ViewType } from '@/daw/store';

// ── What a problem report says about the session (milestone 2.11) ──────────
//
// Report a problem has no endpoint to send to: the student copies the
// report (what happened, in their words, and these details) and sends it
// themselves. The details are what finding a problem needs and nothing
// personal: the build, the browser, the view, how many tracks, the window's
// size. Nothing here touches the network.

declare const __COMMIT_SHA__: string | undefined;

/**
 * Where "Email it" writes to. None yet: the app has no support address of
 * its own (the classroom footer and the error page write to a person), so
 * the dialog offers Copy report only until the owner names one.
 */
export const REPORT_EMAIL: string | null = null;

/** The build the page runs (vite's define), 'dev' outside a build. */
export const REPORT_BUILD: string =
  typeof __COMMIT_SHA__ === 'string' && __COMMIT_SHA__ !== ''
    ? __COMMIT_SHA__
    : 'dev';

const VIEW_NAMES: Record<ViewType, string> = {
  arrange: 'Create',
  studio: 'Mix',
  score: 'Score',
  leadsheet: 'Score (lead sheet)',
  practice: 'Practice',
};

export interface ReportDetail {
  label: string;
  value: string;
}

export interface ReportSource {
  view: ViewType;
  trackCount: number;
  userAgent: string;
  width: number;
  height: number;
  build?: string;
}

/** The session as the report describes it, read now. */
export function currentReportSource(): ReportSource {
  const state = useStore.getState();
  return {
    view: state.currentView,
    trackCount: state.tracks.length,
    userAgent: navigator.userAgent,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/** The details block, row by row. */
export function reportDetails(source: ReportSource): ReportDetail[] {
  return [
    { label: 'Build', value: source.build ?? REPORT_BUILD },
    { label: 'Browser', value: source.userAgent },
    { label: 'View', value: VIEW_NAMES[source.view] ?? source.view },
    { label: 'Tracks', value: String(source.trackCount) },
    { label: 'Window', value: `${source.width} × ${source.height}` },
  ];
}

/** The report as copied: the student's words, then the details. */
export function formatReport(
  text: string,
  details: readonly ReportDetail[],
): string {
  const said = text.trim() || '(nothing written)';
  return [
    'What happened:',
    said,
    '',
    'Details:',
    ...details.map((d) => `${d.label}: ${d.value}`),
  ].join('\n');
}

/** A mailto: link that opens the student's mail app with the report. */
export function reportMailto(email: string, report: string): string {
  const subject = encodeURIComponent('Music Atlas Studio: a problem');
  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(report)}`;
}
