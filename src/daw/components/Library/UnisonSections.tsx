import { useState } from 'react';
import { useStore } from '@/daw/store';
import { formatProgression, useChordNotation } from '@/lib/chordNotation';
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
    <div
      data-testid="insight-progression"
      className="flex flex-col gap-1.5 border-b px-3 py-2.5"
      style={{ borderColor: 'var(--daw-hairline)' }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--daw-text-3)' }}
      >
        Progression
      </span>
      <div
        data-testid="insight-progression-best"
        className="flex flex-col gap-0.5 rounded px-2 py-1.5"
        style={{ backgroundColor: 'var(--daw-surface-2)' }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="text-[12px] font-semibold"
            style={{ color: 'var(--daw-text)' }}
          >
            {text(best)}
          </span>
          <span
            className="shrink-0 text-[12px] font-semibold tabular-nums"
            style={{ color: 'var(--daw-text)' }}
          >
            {Math.round(best.score * 100)}%
          </span>
        </div>
        <SongRef match={best} />
      </div>

      {close.length > 0 ? (
        <>
          <span className="text-[12px]" style={{ color: 'var(--daw-text-3)' }}>
            Also close
          </span>
          {shown.map((m) => (
            <div
              key={m.libraryId}
              data-testid="insight-progression-close"
              className="flex flex-col gap-0.5 px-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-[12px]"
                  style={{ color: 'var(--daw-text-2)' }}
                >
                  {text(m)}
                </span>
                <span
                  className="shrink-0 text-[12px] tabular-nums"
                  style={{ color: 'var(--daw-text-3)' }}
                >
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
              className="self-start text-[12px] font-medium"
              style={{ color: 'var(--daw-text-2)' }}
            >
              {showAll
                ? 'Show fewer'
                : `Show ${close.length - CLOSE_SHOWN} more`}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** 'Fleetwood Mac — Dreams', when the library names a song that uses it. */
function SongRef({ match }: { match: ProgressionMatchResult }) {
  if (!match.artist && !match.song) return null;
  return (
    <span className="text-[12px]" style={{ color: 'var(--daw-text-3)' }}>
      {[match.artist, match.song].filter(Boolean).join(' — ')}
    </span>
  );
}
