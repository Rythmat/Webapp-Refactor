import { Check, Search, Shuffle, Video } from 'lucide-react';
import { useState } from 'react';
import { cortexColor } from '@/content/graph/cortexPalette';
import type { LessonCatalog } from '../cortex/catalog';
import type { LessonGraph } from '../cortex/graphQueries';
import { searchFocus } from '../cortex/suggestFocus';
import type { CortexLessonPlan, LessonFocus } from '../cortex/types';
import {
  EYEBROW,
  FIELD,
  OUTLINE_PILL,
  PANEL,
  PRIMARY_PILL,
} from './wizardStyles';

/**
 * Step 1 — the Showcase's focus. The generator's suggestion, with why it was
 * suggested and what the Atlas says about it; the teacher accepts it,
 * shuffles to the next one, or searches for an artist or city by name.
 */

const KIND_LABEL = { artist: 'Artist', place: 'Place' } as const;

const kindColor = (focus: Pick<LessonFocus, 'kind'>) =>
  cortexColor(focus.kind === 'artist' ? 'Artists' : 'Location');

export const reasonText = (focus: LessonFocus): string => {
  switch (focus.reason.kind) {
    case 'plannedSong':
      return `From today's plan: “${focus.reason.title}”`;
    case 'plannedEvent':
      return `From today's plan: ${focus.reason.title}`;
    case 'searched':
      return 'Your pick';
    case 'wellConnected':
      return `${focus.connections} connections in the Atlas`;
  }
};

export interface CortexFocusStepProps {
  graph: LessonGraph;
  catalog: LessonCatalog;
  focus: LessonFocus;
  plan: CortexLessonPlan;
  onShuffle: () => void;
  onPick: (focus: LessonFocus) => void;
  onAccept: () => void;
}

export const CortexFocusStep = ({
  graph,
  catalog,
  focus,
  plan,
  onShuffle,
  onPick,
  onAccept,
}: CortexFocusStepProps) => {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const results = searching ? searchFocus(graph, catalog, query) : [];
  const visual = plan.showcase.visual;
  const portrait =
    visual?.type === 'artistImage'
      ? catalog.songs.get(visual.songId)?.artistImageRef
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${PANEL} flex flex-col gap-4 p-5 md:flex-row`}>
        {portrait ? (
          <img
            src={portrait}
            alt=""
            className="h-40 w-40 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div
            className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${kindColor(focus)}33` }}
            aria-hidden
          >
            <span
              className="size-10 rounded-full"
              style={{ backgroundColor: kindColor(focus) }}
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="inline-flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: kindColor(focus) }}
              aria-hidden
            />
            <span className={EYEBROW}>{KIND_LABEL[focus.kind]} showcase</span>
          </span>
          <h2 className="text-2xl font-bold tracking-[-0.01em]">
            {focus.label}
          </h2>
          <p className="text-sm text-white/55">{reasonText(focus)}</p>
          <ul className="mt-1 flex flex-col gap-1 text-[15px]">
            {plan.showcase.facts.slice(0, 3).map((fact) => (
              <li key={fact.text.en}>{fact.text.en}</li>
            ))}
          </ul>
          {plan.showcase.listen && (
            <p className="inline-flex items-center gap-2 text-sm text-white/55">
              <Video className="h-4 w-4" />
              {plan.showcase.listen.caption}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={PRIMARY_PILL} onClick={onAccept}>
          <Check className="h-4 w-4" />
          Use {focus.label}
        </button>
        <button type="button" className={OUTLINE_PILL} onClick={onShuffle}>
          <Shuffle className="h-4 w-4" />
          Shuffle
        </button>
        <button
          type="button"
          className={OUTLINE_PILL}
          aria-expanded={searching}
          onClick={() => setSearching((s) => !s)}
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      {searching && (
        <section className={`${PANEL} flex flex-col gap-3 p-4`}>
          <label className="flex flex-col gap-2">
            <span className={EYEBROW}>Find an artist or a city</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Marvin Gaye, Detroit…"
              className={FIELD}
              autoFocus
            />
          </label>
          {query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-white/55">
              Nothing in the Atlas matches “{query}”.
            </p>
          )}
          {results.length > 0 && (
            <ul className="flex flex-col">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(result);
                      setSearching(false);
                      setQuery('');
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: kindColor(result) }}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm">{result.label}</span>
                    <span className="text-xs text-white/45">
                      {KIND_LABEL[result.kind]} · {result.connections}{' '}
                      connections
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
