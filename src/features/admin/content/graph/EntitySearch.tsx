import { Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import type { GraphNode } from '@/content/graph/types';
import { kindColor, kindLabel } from './graphVocabulary';
import { normalizeText } from './map/model/text';

/**
 * Find anything in the graph by name and make it the focus.
 *
 * A plain combobox over the graph's nodes: exact names first, then names
 * that start with what was typed, then names with a word that does, then
 * the rest; songs and artists ahead of the vocabularies on a tie. Typing an
 * id (`artist:toto`) finds it too. The entity picker of 1g (aliases, fuzzy
 * matches, drafts) replaces this once it exists.
 */

const RESULTS = 10;

const KIND_RANK: Record<string, number> = {
  song: 0,
  artist: 1,
  event: 2,
  place: 3,
  release: 4,
  studio: 5,
  label: 6,
  pathway: 7,
  teach_day: 8,
};

interface Entry {
  node: GraphNode;
  name: string;
}

export function rankNodes(
  entries: readonly Entry[],
  typed: string,
): GraphNode[] {
  const q = normalizeText(typed);
  if (!q) return [];
  const scored: { node: GraphNode; score: number }[] = [];
  for (const { node, name } of entries) {
    let score: number;
    if (node.id === typed.trim() || name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(` ${q}`)) score = 2;
    else if (name.includes(q)) score = 3;
    else continue;
    scored.push({ node, score });
  }
  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        (KIND_RANK[a.node.kind] ?? 99) - (KIND_RANK[b.node.kind] ?? 99) ||
        a.node.label.length - b.node.label.length ||
        a.node.label.localeCompare(b.node.label),
    )
    .slice(0, RESULTS)
    .map((s) => s.node);
}

export const EntitySearch = ({
  nodes,
  onPick,
  disabled,
  colorOf,
}: {
  nodes: ReadonlyMap<string, GraphNode> | undefined;
  onPick(id: string): void;
  disabled?: boolean;
  /**
   * The colour of each match's dot. The Mind Map passes its colour groups,
   * so a match's dot is the colour of its dot in the graph; the kind's
   * colour when absent.
   */
  colorOf?: (node: { id: string; kind: string }) => string;
}) => {
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const entries = useMemo(
    () =>
      nodes
        ? [...nodes.values()].map((node) => ({
            node,
            name: normalizeText(node.label),
          }))
        : [],
    [nodes],
  );
  const results = useMemo(() => rankNodes(entries, text), [entries, text]);

  const pick = (node: GraphNode | undefined) => {
    if (!node) return;
    onPick(node.id);
    setText('');
    setOpen(false);
  };

  const expanded = open && results.length > 0;
  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
      />
      <input
        type="search"
        role="combobox"
        aria-label="Find in the graph"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
        placeholder="Find a song, artist, place, event…"
        disabled={disabled}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="h-9 w-full rounded-full border border-white/[0.12] bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none disabled:opacity-50"
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matches"
          className="absolute right-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/[0.12] bg-[#16161a] py-1 shadow-xl"
        >
          {results.map((node, i) => (
            <li
              key={node.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(node);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                i === active ? 'bg-white/10 text-white' : 'text-white/75'
              }`}
            >
              <span
                aria-hidden
                className="inline-block size-2 shrink-0 rounded-full"
                style={{
                  background: colorOf ? colorOf(node) : kindColor(node.kind),
                }}
              />
              <span className="truncate">{node.label}</span>
              <span className="ml-auto shrink-0 text-xs text-white/40">
                {kindLabel(node.kind)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
