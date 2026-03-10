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
