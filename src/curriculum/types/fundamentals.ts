import type { Hand, PianoFinger } from '@/lib/learn/pianoFingering/types';
import type { FundamentalsMidiEval } from './fundamentalsEval';

export type FundamentalsAssessment = 'pass_proceed';

export interface FundamentalsStep {
  stepNumber: number;
  id: string;
  activity: string;
  direction: string;
  assessment: FundamentalsAssessment;
  midiCriteria: string;
  midiEval: FundamentalsMidiEval;
  successFeedback: string;
  tag: string;
  visual?: string;
  /**
   * Authored piano fingering for the step's notes. Notes not listed get the
   * suggested fingering.
   */
  fingering?: { midi: number; hand: Hand; finger: PianoFinger }[];
  /** Finger numbers on by default here (a student's own choice still wins). */
  numbersByDefault?: boolean;
}

export interface FundamentalsSection {
  id: string;
  name: string;
  textPrompt?: string;
  steps: FundamentalsStep[];
}

export interface FundamentalsFlow {
  title: string;
  sections: FundamentalsSection[];
}
