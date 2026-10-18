import { chordLabel } from '@/daw/commands/keys';
import { getScope, type DeclaredCommand } from '@/daw/commands/registry';
import { scopeRank } from '@/daw/commands/scopeOrder';

// ── What the command palette lists (milestone 2.15) ────────────────────────
//
// Pure: the commands that work where the palette was opened
// (dispatcher.ts availableCommands), matched against what the student typed
// and grouped by where they work, in the '?' sheet's order. Each row shows
// its shortcut, which Soundtrap's Quick Actions doesn't.

export interface PaletteRow {
  id: string;
  label: string;
  /** The first key, as this keyboard names it; null for a command without. */
  keys: string | null;
}

export interface PaletteGroup {
  scope: string;
  /** The scope's heading ('Everywhere', 'Track list'). */
  label: string;
  rows: PaletteRow[];
}

/** Lower case, accents and punctuation gone: what matching compares. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * How well `command` matches `query`, or 0 when it doesn't: every word of the
 * query must start a word of its label, its scope's heading or a keyword. A
 * match in the label counts most, then at the label's start.
 */
export function matchScore(command: DeclaredCommand, query: string): number {
  const words = fold(query).split(' ').filter(Boolean);
  if (words.length === 0) return 1;
  const label = fold(command.label);
  const labelWords = label.split(' ');
  const scopeWords = fold(getScope(command.scope)?.label ?? '').split(' ');
  const keywordWords = (command.keywords ?? []).flatMap((k) =>
    fold(k).split(' '),
  );
  let score = 0;
  for (const word of words) {
    if (labelWords.some((w) => w.startsWith(word))) score += 3;
    else if (keywordWords.some((w) => w.startsWith(word))) score += 2;
    else if (scopeWords.some((w) => w.startsWith(word))) score += 1;
    else return 0;
  }
  if (label.startsWith(fold(query))) score += 2;
  return score;
}

/** One command as a row. */
export function paletteRow(
  command: DeclaredCommand,
  apple?: boolean,
): PaletteRow {
  const chord = command.chords[0];
  return {
    id: command.id,
    label: command.label,
    keys: command.keysLabel ?? (chord ? chordLabel(chord, apple) : null),
  };
}

/**
 * The palette's groups for `query`: by scope in the listing order; with a
 * query, only the matches, the best first within each group.
 */
export function paletteGroups(
  commands: readonly DeclaredCommand[],
  query: string,
  apple?: boolean,
): PaletteGroup[] {
  const byScope = new Map<
    string,
    { command: DeclaredCommand; score: number }[]
  >();
  for (const command of commands) {
    const score = matchScore(command, query);
    if (score === 0) continue;
    const list = byScope.get(command.scope) ?? [];
    list.push({ command, score });
    byScope.set(command.scope, list);
  }
  const searching = fold(query) !== '';
  return [...byScope.entries()]
    .sort(([a], [b]) => scopeRank(a) - scopeRank(b))
    .map(([scope, list]) => ({
      scope,
      label: getScope(scope)?.label ?? scope,
      rows: (searching
        ? [...list].sort((a, b) => b.score - a.score)
        : list
      ).map(({ command }) => paletteRow(command, apple)),
    }));
}

/** Every row of `groups`, in the order they show. */
export function paletteRows(groups: readonly PaletteGroup[]): PaletteRow[] {
  return groups.flatMap((group) => group.rows);
}
