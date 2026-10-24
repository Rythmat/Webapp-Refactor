import { useState } from 'react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { formatProgression, useChordNotation } from '@/lib/chordNotation';
import {
  INSIGHT_DIM,
  INSIGHT_GHOST,
  INSIGHT_ROW,
  INSIGHT_TEXT,
  InsightCard,
} from './InsightCard';
import { keyContext } from './insightNotation';
import type {
  ProgressionMatchResult,
  UnisonDocument,
} from '@/unison/types/schema';

// ── Insight's progression (2026-10-21) ─────────────────────────────────────
//
// What the song's chords are: the progression they match best, stated with
// how sure the match is and a song that uses it, then the others that come
// close. Vibes, styles, rhythm and melody went from Insight (owner): only
// the harmony is read here. A weak match isn't listed at all (the matcher
// scores how much of the pattern and of the song a match covers).

/** A match this sure, besides the best, is listed as also close. */
const ALSO_CLOSE_AT = 0.85;
/** How many close matches show before 'Show more'. */
const CLOSE_SHOWN = 3;

interface UnisonSectionsProps {
  unisonDoc: UnisonDocument;
}

export function UnisonSections({ unisonDoc }: UnisonSectionsProps) {
  const [showAll, setShowAll] = useState(false);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const notation = useChordNotation();
  // Progression degrees in the session key; without one, the analysis's key.
  const context =
    rootNote !== null
      ? keyContext(rootNote, mode)
      : keyContext(unisonDoc.analysis.key.rootPc, unisonDoc.analysis.key.mode);

  const [best, ...rest] = unisonDoc.analysis.progressionMatches;
  if (!best) return null;
  const close = rest.filter((m) => m.score >= ALSO_CLOSE_AT);
  const shown = showAll ? close : close.slice(0, CLOSE_SHOWN);
  const text = (m: ProgressionMatchResult) =>
    formatProgression(m.progression, notation, context);

  return (
    <InsightCard data-testid="insight-progression" title="Progression">
      <div
        data-testid="insight-progression-best"
        className={cn(INSIGHT_ROW, 'flex flex-col gap-0.5')}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(INSIGHT_TEXT, 'font-medium')}>{text(best)}</span>
          <span className="insight-ink shrink-0 text-[13px] font-medium tabular-nums text-white/85 [--sweep-to:color-mix(in_srgb,white_85%,transparent)]">
            {Math.round(best.score * 100)}%
          </span>
        </div>
        <SongRef match={best} />
      </div>

      {close.length > 0 ? (
        <>
          <span className={INSIGHT_DIM}>Also close</span>
          {shown.map((m) => (
            <div
              key={m.libraryId}
              data-testid="insight-progression-close"
              className="flex flex-col gap-0.5 px-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="insight-ink text-[13px] leading-5 text-white/85 [--sweep-to:color-mix(in_srgb,white_85%,transparent)]">
                  {text(m)}
                </span>
                <span className="insight-ink shrink-0 text-[13px] tabular-nums text-white/50 [--sweep-to:color-mix(in_srgb,white_50%,transparent)]">
                  {Math.round(m.score * 100)}%
                </span>
              </div>
              <SongRef match={m} />
            </div>
          ))}
          {close.length > CLOSE_SHOWN ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className={cn(INSIGHT_GHOST, 'self-start')}
            >
              {showAll
                ? 'Show fewer'
                : `Show ${close.length - CLOSE_SHOWN} more`}
            </button>
          ) : null}
        </>
      ) : null}
    </InsightCard>
  );
}

/** 'Fleetwood Mac — Dreams', when the library names a song that uses it. */
function SongRef({ match }: { match: ProgressionMatchResult }) {
  if (!match.artist && !match.song) return null;
  return (
    <span className={INSIGHT_DIM}>
      {[match.artist, match.song].filter(Boolean).join(' — ')}
    </span>
  );
}
