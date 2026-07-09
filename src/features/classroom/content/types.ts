/**
 * Content-bank types. The v1 planner shipped 12 canonical themes,
 * 81 activities, 106 CLOs, 35 seeds, and an anthem bank. This module holds
 * a minimal port of that shape — enough for the teacher's starter picker
 * to feel real. Grow the seed files as the Idea Bank surface lands.
 */
import type { PhaseKey } from '../phases';
import type { LocalizedText } from '../types';

export type ContentSource = 'canonical' | 'community';

export interface Theme {
  id: string;
  month: number;
  title: LocalizedText;
  focus: string;
  essentialQuestions: string[];
  suggestedArtists: string[];
  enduringUnderstandings: string[];
  seedIds: string[];
  source: ContentSource;
}

export interface Activity {
  id: string;
  phase: PhaseKey;
  title: LocalizedText;
  summary: LocalizedText;
  minutes: number;
  materials: string[];
  cloRefs: string[];
  themeIds: string[];
  source: ContentSource;
}

export interface Clo {
  id: string;
  stem: string;
  title: LocalizedText;
  domain: 'learn' | 'perform' | 'create' | 'respond' | 'connect';
  standards: string[];
  source: ContentSource;
}

export interface LessonSeed {
  id: string;
  title: LocalizedText;
  themeId: string;
  overview: string;
  cellHints: Partial<Record<PhaseKey, LocalizedText>>;
  suggestedActivityIds: string[];
  source: ContentSource;
}

export interface Anthem {
  id: string;
  title: string;
  artist: string;
  year?: number;
  themeIds: string[];
  notes?: string;
}
