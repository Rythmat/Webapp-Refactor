/**
 * Content-bank types. Landing zone for the canonical "Teacher Mission Control"
 * package: 12 monthly themes, 81 activities (→96 with 15 seed anchors), 35
 * lesson seeds, derived learning CLOs, and the Idea Bank. Types are widened to
 * the canonical schema; the raw seed data is ported under `canonical/raw/` and
 * normalized + derived on load (see `canonical/index.ts`).
 *
 * Firewall note: `assessment`, `clos`/`cloText`, `standards`, `impactValues`,
 * `rationaleHints`, and `localContext` are TEACHER-ONLY pedagogy. They must only
 * ever land on `cell.rationale`, never on `cell.presentation` (buildStudentView).
 */
import type { PhaseKey } from '../phases';
import type { CellRationale, LocalizedText } from '../types';

export type ContentSource = 'canonical' | 'community' | 'personal';

/** The four canonical Atlas modules. Legacy `genre-lesson`/`theory-lesson`
 *  module refs in the activity bank are normalized to `learn` on load. */
export type AtlasModule = 'globe' | 'learn' | 'studio' | 'arcade';

export interface AtlasResource {
  module: AtlasModule;
  label: string;
  contextNote: string;
  /** Optional pointer into a teacher's Atlas Resource Library. */
  resourceId?: string;
}

/** IMPACT student-voice objective, three axes. The derivation source for
 *  learning CLOs; never read directly by student surfaces. */
export interface CloAxes {
  awarenessOfFeeling?: string;
  awarenessOfTechnique?: string;
  awarenessOfContext?: string;
}

export type InitiationStyle =
  | 'learn-to-apply'
  | 'try-it-first'
  | 'join-the-expert'
  | 'self-guided'
  | 'hybrid';

export interface Theme {
  id: string;
  /** 1–12 calendar month, or null for a custom/unit theme. */
  month: number | null;
  title: LocalizedText;
  focus: string;
  essentialQuestions: string[];
  suggestedArtists: string[];
  /** Statement-voice ideas (NOT student-voice — those live in the CLO Bank). */
  enduringUnderstandings: string[];
  seedIds: string[];
  source: ContentSource;
  createdBy?: string | null;
  createdAt?: string;
}

export interface Activity {
  id: string;
  title: LocalizedText;
  phase: PhaseKey;
  purpose: string;
  initiationStyle: InitiationStyle | null;
  description: string;
  learningOutcome: string;
  assessment: string;
  clos: CloAxes;
  standards: string[];
  impactValues: string[];
  atlasResources: AtlasResource[];
  source: ContentSource;
  createdBy: string | null;
  createdAt: string;
  /** Derived on load: `['clo-learn-<id>']`. */
  cloIds: string[];
}

interface CloBase {
  id: string;
  phase?: PhaseKey;
  source: ContentSource;
  createdBy: string | null;
  createdAt: string;
}
export interface LearningClo extends CloBase, CloAxes {
  type: 'learning';
  phase: PhaseKey;
}
export interface ContentLanguageClo extends CloBase {
  type: 'content-language';
  statement: string;
  languageFocus: string;
}
export type Clo = LearningClo | ContentLanguageClo;

/** One phase of a `kind:'day'` seed template. */
export interface DaySeedPhase {
  presentation: { title?: LocalizedText; prompt?: LocalizedText };
  activitySuggestions: string[];
  atlasResources: AtlasResource[];
  /** Derivation source for `clo-seed-<seedId>-<phase>`; may be empty `{}`. */
  cloText: CloAxes;
  rationaleHints?: Partial<
    Pick<
      CellRationale,
      | 'standards'
      | 'commonAnchors'
      | 'selCompetencies'
      | 'impactTags'
      | 'assessment'
      | 'notes'
    >
  >;
}

interface LessonSeedBase {
  id: string;
  kind: 'day' | 'activity';
  title: LocalizedText;
  themeId: string;
  monthHint: number | null;
  tags: string[];
  standards: string[];
  description: string;
  songs: string[];
  localContext: LocalizedText | null;
  source: ContentSource;
  createdBy: string | null;
  createdAt: string;
}
export interface DayLessonSeed extends LessonSeedBase {
  kind: 'day';
  template: Record<PhaseKey, DaySeedPhase>;
}
export interface ActivityLessonSeed extends LessonSeedBase {
  kind: 'activity';
  anchor: { phase: PhaseKey; activity: Activity };
}
export type LessonSeed = DayLessonSeed | ActivityLessonSeed;

export interface IdeaBankFormat {
  id: string;
  title: string;
  description: string;
  possibleUses?: string[];
  createOptions: string[];
  enduringUnderstandings: string[];
}
export interface IdeaBank {
  recurringFormats: IdeaBankFormat[];
  slideDeckTemplate: {
    title: string;
    slides: { slide: number; title: string; content: string }[];
  };
  crossCuttingThemes: { category: string; items: string[] }[];
  contentThreads: string[];
  activityTypes: { name: string; description: string }[];
  anthemBank: {
    songs: string[];
    prompt: string;
    createOptions: string[];
    enduringUnderstandings: string[];
  };
}

export interface Anthem {
  id: string;
  title: string;
  artist: string;
  year?: number;
  themeIds: string[];
  notes?: string;
}
