/**
 * Normalize the ported raw seed data (`./raw/*`) into the typed content-bank
 * shapes. The two spec-required normalizations live here and nowhere else:
 *   - atlasResource module remap: `genre-lesson`/`theory-lesson` → `learn`.
 *   - title `string` → `LocalizedText`.
 * Everything is derived in-memory on load; the raw files stay clean at source.
 */
import { PHASES, type PhaseKey } from '../../phases';
import type { LocalizedText } from '../../types';
import type {
  Activity,
  ActivityLessonSeed,
  AtlasModule,
  AtlasResource,
  ContentSource,
  DayLessonSeed,
  DaySeedPhase,
  InitiationStyle,
  Theme,
} from '../types';

// ── Raw (loose) shapes — the inferred exports cast to these at the boundary ──
export interface RawAtlasResource {
  module: string;
  label: string;
  contextNote: string;
  resourceId?: string;
}
interface RawCloAxes {
  awarenessOfFeeling?: string;
  awarenessOfTechnique?: string;
  awarenessOfContext?: string;
}
export interface RawActivity {
  id: string;
  title: string | LocalizedText;
  phase: string;
  purpose: string;
  initiationStyle: string | null;
  description: string;
  learningOutcome: string;
  assessment: string;
  clos: RawCloAxes;
  standards: string[];
  impactValues: string[];
  atlasResources: RawAtlasResource[];
  source: string;
  createdBy: string | null;
  createdAt: string;
}
export interface RawTheme {
  id: string;
  month: number | null;
  title: LocalizedText;
  focus: string;
  essentialQuestions: string[];
  suggestedArtists: string[];
  enduringUnderstandings: string[];
  seedIds: string[];
  source: string;
  createdBy: string | null;
  createdAt: string;
}
interface RawDaySeedPhase {
  presentation: { title?: LocalizedText; prompt?: LocalizedText };
  activitySuggestions: string[];
  atlasResources: RawAtlasResource[];
  cloText: RawCloAxes;
  rationaleHints?: Record<string, unknown>;
}
export interface RawDaySeed {
  id: string;
  kind: 'day';
  title: LocalizedText;
  themeId: string;
  monthHint: number | null;
  tags: string[];
  standards: string[];
  description: string;
  template: Record<string, RawDaySeedPhase>;
  songs: string[];
  localContext: LocalizedText | null;
  source: string;
  createdBy: string | null;
  createdAt: string;
}
export interface RawActivitySeed {
  id: string;
  kind: 'activity';
  title: LocalizedText;
  themeId: string;
  monthHint: number | null;
  tags: string[];
  standards: string[];
  description: string;
  anchor: { phase: string; activity: RawActivity };
  songs: string[];
  localContext: LocalizedText | null;
  source: string;
  createdBy: string | null;
  createdAt: string;
}

// ── Normalizers ──
const MODULE_REMAP: Record<string, AtlasModule> = {
  globe: 'globe',
  learn: 'learn',
  studio: 'studio',
  arcade: 'arcade',
  'genre-lesson': 'learn',
  'theory-lesson': 'learn',
};

/** Remap legacy module names to the four-module set. Throws on anything
 *  unknown (caught by the validation suite). */
export const normalizeModule = (m: string): AtlasModule => {
  const mapped = MODULE_REMAP[m];
  if (!mapped) throw new Error(`Unknown atlas module: "${m}"`);
  return mapped;
};

const normalizeResource = (r: RawAtlasResource): AtlasResource => ({
  module: normalizeModule(r.module),
  label: r.label,
  contextNote: r.contextNote,
  ...(r.resourceId ? { resourceId: r.resourceId } : {}),
});

const toLT = (t: string | LocalizedText): LocalizedText =>
  typeof t === 'string' ? { en: t } : t;

/** Normalize a raw activity — WITHOUT `cloIds` (derived downstream). */
export const normalizeActivity = (
  a: RawActivity,
): Omit<Activity, 'cloIds'> => ({
  id: a.id,
  title: toLT(a.title),
  phase: a.phase as PhaseKey,
  purpose: a.purpose,
  initiationStyle: a.initiationStyle as InitiationStyle | null,
  description: a.description,
  learningOutcome: a.learningOutcome,
  assessment: a.assessment,
  clos: a.clos,
  standards: a.standards,
  impactValues: a.impactValues,
  atlasResources: a.atlasResources.map(normalizeResource),
  source: a.source as ContentSource,
  createdBy: a.createdBy,
  createdAt: a.createdAt,
});

/** Attach the derived `cloIds` (one learning CLO per activity). */
export const withCloIds = (a: Omit<Activity, 'cloIds'>): Activity => ({
  ...a,
  cloIds: [`clo-learn-${a.id}`],
});

export const normalizeTheme = (t: RawTheme): Theme => ({
  id: t.id,
  month: t.month,
  title: t.title,
  focus: t.focus,
  essentialQuestions: t.essentialQuestions,
  suggestedArtists: t.suggestedArtists,
  enduringUnderstandings: t.enduringUnderstandings,
  seedIds: t.seedIds,
  source: t.source as ContentSource,
  createdBy: t.createdBy,
  createdAt: t.createdAt,
});

/** Fresh empty phase per missing phase (never a shared singleton — avoids
 *  mutation aliasing if a future seed omits a phase and a consumer edits it). */
const emptyPhase = (): DaySeedPhase => ({
  presentation: {},
  activitySuggestions: [],
  atlasResources: [],
  cloText: {},
});

const normalizePhase = (p: RawDaySeedPhase): DaySeedPhase => ({
  presentation: p.presentation,
  activitySuggestions: p.activitySuggestions,
  atlasResources: p.atlasResources.map(normalizeResource),
  cloText: p.cloText,
  ...(p.rationaleHints
    ? { rationaleHints: p.rationaleHints as DaySeedPhase['rationaleHints'] }
    : {}),
});

export const normalizeDaySeed = (s: RawDaySeed): DayLessonSeed => {
  const template = {} as Record<PhaseKey, DaySeedPhase>;
  for (const phase of PHASES) {
    const raw = s.template[phase];
    template[phase] = raw ? normalizePhase(raw) : emptyPhase();
  }
  return {
    id: s.id,
    kind: 'day',
    title: s.title,
    themeId: s.themeId,
    monthHint: s.monthHint,
    tags: s.tags,
    standards: s.standards,
    description: s.description,
    template,
    songs: s.songs,
    localContext: s.localContext,
    source: s.source as ContentSource,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
  };
};

export const normalizeActivitySeed = (
  s: RawActivitySeed,
): ActivityLessonSeed => ({
  id: s.id,
  kind: 'activity',
  title: s.title,
  themeId: s.themeId,
  monthHint: s.monthHint,
  tags: s.tags,
  standards: s.standards,
  description: s.description,
  anchor: {
    phase: s.anchor.phase as PhaseKey,
    activity: withCloIds(normalizeActivity(s.anchor.activity)),
  },
  songs: s.songs,
  localContext: s.localContext,
  source: s.source as ContentSource,
  createdBy: s.createdBy,
  createdAt: s.createdAt,
});
