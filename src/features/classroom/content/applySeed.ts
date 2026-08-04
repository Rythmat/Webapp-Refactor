/**
 * applySeedToDay — pure, firewall-aware engine that populates a Day from a
 * LessonSeed. Student-facing text (title/prompt/launch tiles) lands on
 * `cell.presentation`; ALL pedagogy (activity provenance, CLO ids, standards,
 * assessment, songs, local context, unresolved suggestions) lands on
 * `cell.rationale` — never on presentation, so buildStudentView can't leak it.
 *
 * `kind:'day'`  → populates the 5 cells (Merge fills only empty cells; Replace
 *                 overwrites but PRESERVES each cell's interactions +
 *                 resetChecklist + song, so live/deck wiring survives).
 * `kind:'activity'` → inserts the anchor activity into its one phase.
 *
 * The Activity Bank is injected (`resolveActivityId`) so this stays pure/testable.
 */
import { PHASE_RATIONALE_DEFAULTS, PHASES, type PhaseKey } from '../phases';
import type { Cell, CellRationale, Day, LaunchTile } from '../types';
import type {
  Activity,
  ActivityLessonSeed,
  AtlasResource,
  CloAxes,
  DayLessonSeed,
  DaySeedPhase,
  LessonSeed,
} from './types';

export type ApplySeedMode = 'merge' | 'replace';

export interface ApplySeedConfig {
  localContextMode?: 'show' | 'hide' | 'replace';
  tenantLocalContext?: string;
}

export interface ApplySeedOptions {
  mode: ApplySeedMode;
  resolveActivityId: (id: string) => Activity | undefined;
  config?: ApplySeedConfig;
}

const hasAnyAxis = (c: CloAxes): boolean =>
  Boolean(c.awarenessOfFeeling || c.awarenessOfTechnique || c.awarenessOfContext);

const uniq = (...lists: Array<string[] | undefined>): string[] => [
  ...new Set(lists.flatMap((l) => l ?? [])),
];

/** Merge note lines, trimmed + de-duplicated, so re-applying a seed (Replace)
 *  can't accumulate duplicate "Suggested: …" / resource / song lines. */
const dedupeLines = (lines: string[]): string =>
  [...new Set(lines.map((s) => s.trim()).filter(Boolean))].join('\n');

/** A cell counts as populated if it carries any student-facing content. */
export const isCellPopulated = (cell: Cell): boolean =>
  Boolean(
    cell.presentation.title.en.trim() ||
      cell.presentation.prompt.en.trim() ||
      cell.presentation.launchTiles.length ||
      cell.presentation.interactions?.length,
  );

export const isDayPopulated = (day: Day): boolean =>
  PHASES.some((p) => isCellPopulated(day.cells[p]));

const atlasToTiles = (
  resources: AtlasResource[],
  keyPrefix: string,
): LaunchTile[] =>
  resources.map((r, i) => ({
    id: `${keyPrefix}-atlas-${i}`,
    module: r.module,
    activityRef: '',
    label: { en: r.label },
  }));

const resolveLocalContext = (
  localContext: { en: string } | null,
  config?: ApplySeedConfig,
): string | null => {
  const mode = config?.localContextMode ?? 'show';
  if (mode === 'hide') return null;
  if (mode === 'replace') return config?.tenantLocalContext?.trim() || null;
  return localContext?.en ?? null;
};

/**
 * Insert one activity into a cell (shared by activity-kind seeds AND the
 * Phase-3 Activity Bank picker). Actionable text → presentation; structured
 * pedagogy → rationale.
 */
export const insertActivityIntoCell = (activity: Activity, cell: Cell): Cell => {
  const title = cell.presentation.title.en.trim()
    ? cell.presentation.title
    : activity.title;
  const prevPrompt = cell.presentation.prompt.en.trim();
  const prompt = prevPrompt
    ? { ...cell.presentation.prompt, en: `${prevPrompt}\n\n${activity.description}` }
    : { en: activity.description };

  const notes = dedupeLines([
    ...cell.rationale.notes.split('\n'),
    `Activity: ${activity.title.en}`,
    activity.learningOutcome ? `Outcome: ${activity.learningOutcome}` : '',
    activity.assessment ? `Assessment: ${activity.assessment}` : '',
  ]);

  return {
    presentation: { ...cell.presentation, title, prompt },
    rationale: {
      ...cell.rationale,
      activityRefs: uniq(cell.rationale.activityRefs, [activity.id]),
      cloRefs: uniq(cell.rationale.cloRefs, activity.cloIds),
      notes,
      ...(activity.initiationStyle
        ? { initiationStyle: activity.initiationStyle }
        : {}),
    },
  };
};

const buildDayPhaseCell = (
  seed: DayLessonSeed,
  phase: PhaseKey,
  tmpl: DaySeedPhase,
  existing: Cell,
  opts: ApplySeedOptions,
  seedLevelNotes: string[],
  localCtx: string | null,
): Cell => {
  // Resolve activity suggestions against the bank.
  const resolved: string[] = [];
  const unresolved: string[] = [];
  const resolvedCloIds: string[] = [];
  for (const sid of tmpl.activitySuggestions) {
    const a = opts.resolveActivityId(sid);
    if (a) {
      resolved.push(sid);
      resolvedCloIds.push(...a.cloIds);
    } else {
      unresolved.push(sid);
    }
  }

  const presentation = {
    ...existing.presentation,
    ...(tmpl.presentation.title ? { title: tmpl.presentation.title } : {}),
    ...(tmpl.presentation.prompt ? { prompt: tmpl.presentation.prompt } : {}),
    launchTiles: atlasToTiles(tmpl.atlasResources, `${seed.id}-${phase}`),
    // Preserve live-session/deck wiring across a Replace.
    ...(existing.presentation.interactions
      ? { interactions: existing.presentation.interactions }
      : {}),
    ...(existing.presentation.resetChecklist
      ? { resetChecklist: existing.presentation.resetChecklist }
      : {}),
    ...(existing.presentation.song ? { song: existing.presentation.song } : {}),
  };

  const defaults = PHASE_RATIONALE_DEFAULTS[phase];
  const hints = tmpl.rationaleHints ?? {};
  const notes = dedupeLines([
    ...existing.rationale.notes.split('\n'),
    hints.notes ?? '',
    unresolved.length ? `Suggested: ${unresolved.join(', ')}` : '',
    ...tmpl.atlasResources
      .filter((r) => r.contextNote)
      .map((r) => `${r.label} — ${r.contextNote}`),
    ...seedLevelNotes,
  ]);

  const cloRefs = uniq(
    existing.rationale.cloRefs,
    hasAnyAxis(tmpl.cloText) ? [`clo-seed-${seed.id}-${phase}`] : [],
    resolvedCloIds,
  );

  const rationale: CellRationale = {
    ...existing.rationale,
    standards: uniq(defaults.standards, hints.standards, existing.rationale.standards),
    commonAnchors: uniq(
      defaults.commonAnchors,
      hints.commonAnchors,
      existing.rationale.commonAnchors,
    ),
    selCompetencies: uniq(
      defaults.selCompetencies,
      hints.selCompetencies,
      existing.rationale.selCompetencies,
    ),
    ...(hints.impactTags
      ? { impactTags: uniq(existing.rationale.impactTags, hints.impactTags) }
      : {}),
    ...(hints.assessment ? { assessment: hints.assessment } : {}),
    cloRefs,
    activityRefs: uniq(existing.rationale.activityRefs, resolved),
    notes,
    ...(localCtx ? { localContext: localCtx } : {}),
  };

  return { presentation, rationale };
};

const applyDaySeed = (
  seed: DayLessonSeed,
  day: Day,
  opts: ApplySeedOptions,
): Day => {
  const cells = { ...day.cells };
  const localCtx = resolveLocalContext(seed.localContext, opts.config);
  const songNote = seed.songs.length
    ? [`Suggested songs / sources: ${seed.songs.join('; ')}`]
    : [];

  for (const phase of PHASES) {
    const existing = day.cells[phase];
    if (opts.mode === 'merge' && isCellPopulated(existing)) continue;
    const isConnect = phase === 'connectRegulate';
    cells[phase] = buildDayPhaseCell(
      seed,
      phase,
      seed.template[phase],
      existing,
      opts,
      isConnect ? songNote : [],
      isConnect ? localCtx : null,
    );
  }

  return { ...day, cells, sourceSeedId: seed.id };
};

const applyActivitySeed = (
  seed: ActivityLessonSeed,
  day: Day,
  _opts: ApplySeedOptions,
): Day => {
  const phase = seed.anchor.phase;
  const cells = { ...day.cells };
  cells[phase] = insertActivityIntoCell(seed.anchor.activity, day.cells[phase]);
  return { ...day, cells, sourceSeedId: seed.id };
};

export const applySeedToDay = (
  seed: LessonSeed,
  day: Day,
  opts: ApplySeedOptions,
): Day =>
  seed.kind === 'day'
    ? applyDaySeed(seed, day, opts)
    : applyActivitySeed(seed, day, opts);
