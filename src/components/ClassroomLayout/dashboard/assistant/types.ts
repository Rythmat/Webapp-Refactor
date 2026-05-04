export interface ActivityEntry {
  label: string;
  description: string;
  route: string;
  keywords: string[];
  category: 'genre' | 'mode' | 'game' | 'section';
}

export interface MatchResult {
  entry: ActivityEntry;
  score: number;
}

export type AssistantPhase =
  | { type: 'idle' }
  | { type: 'result'; query: string; matches: MatchResult[] };
