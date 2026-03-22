import { useState } from 'react';
import { midiToNoteName } from './insightConstants';
import type { UnisonDocument } from '@/unison/types/schema';

interface UnisonSectionsProps {
  unisonDoc: UnisonDocument;
}

export function UnisonSections({ unisonDoc }: UnisonSectionsProps) {
  const [expandedMatches, setExpandedMatches] = useState(false);

  return (
    <>
      {/* Progression Matches */}
      {unisonDoc.analysis.progressionMatches.length > 0 && (
        <div
          className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Progression Matches ({unisonDoc.analysis.progressionMatches.length})
          </span>
          {(expandedMatches
            ? unisonDoc.analysis.progressionMatches
            : unisonDoc.analysis.progressionMatches.slice(0, 5)
          ).map((match) => (
            <div
              key={match.libraryId}
              className="rounded px-2 py-1.5"
              style={{ backgroundColor: 'var(--color-surface-2)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  {match.progression}
                </span>
                <span
                  className="text-[9px] font-mono"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {Math.round(match.score * 100)}%
                </span>
              </div>
              {(match.artist || match.song) && (
                <span
                  className="text-[9px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {[match.artist, match.song].filter(Boolean).join(' — ')}
                </span>
              )}
            </div>
          ))}
          {unisonDoc.analysis.progressionMatches.length > 5 && (
            <button
              type="button"
              onClick={() => setExpandedMatches(!expandedMatches)}
              className="text-[9px] font-medium cursor-pointer"
              style={{
                color: 'var(--color-accent)',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              {expandedMatches
                ? 'Show less'
                : `Show all ${unisonDoc.analysis.progressionMatches.length}`}
            </button>
          )}
        </div>
      )}

      {/* Vibes & Styles */}
      {(unisonDoc.analysis.vibes.length > 0 ||
        unisonDoc.analysis.styles.length > 0) && (
        <div
          className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {unisonDoc.analysis.vibes.length > 0 && (
            <div className="flex flex-col gap-1">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Vibes
              </span>
              <div className="flex flex-wrap gap-1">
                {unisonDoc.analysis.vibes.slice(0, 8).map((vibe) => (
                  <span
                    key={vibe}
                    className="rounded-full px-1.5 py-0.5 text-[9px]"
                    style={{
                      backgroundColor: 'rgba(126, 207, 207, 0.1)',
                      color: 'var(--color-accent)',
                      border: '1px solid rgba(126, 207, 207, 0.2)',
                    }}
                  >
                    {vibe}
                  </span>
                ))}
                {unisonDoc.analysis.vibes.length > 8 && (
                  <span
                    className="text-[9px]"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    +{unisonDoc.analysis.vibes.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}
          {unisonDoc.analysis.styles.length > 0 && (
            <div className="flex flex-col gap-1">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Styles
              </span>
              <div className="flex flex-wrap gap-1">
                {unisonDoc.analysis.styles.slice(0, 8).map((style) => (
                  <span
                    key={style}
                    className="rounded-full px-1.5 py-0.5 text-[9px]"
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      color: '#c084fc',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                    }}
                  >
                    {style}
                  </span>
                ))}
                {unisonDoc.analysis.styles.length > 8 && (
                  <span
                    className="text-[9px]"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    +{unisonDoc.analysis.styles.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rhythm */}
      <div
        className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Rhythm
        </span>
        <div className="grid grid-cols-3 gap-1">
          <div className="flex flex-col">
            <span
              className="text-[8px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              BPM
            </span>
            <span
              className="text-[11px] font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              {unisonDoc.rhythm.bpm}
            </span>
          </div>
          <div className="flex flex-col">
            <span
              className="text-[8px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Time
            </span>
            <span
              className="text-[11px] font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              {unisonDoc.rhythm.timeSignatureNumerator}/
              {unisonDoc.rhythm.timeSignatureDenominator}
            </span>
          </div>
          <div className="flex flex-col">
            <span
              className="text-[8px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Feel
            </span>
            <span
              className="text-[11px] font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              {unisonDoc.rhythm.subdivision}
            </span>
          </div>
        </div>
        {unisonDoc.rhythm.swingAmount > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[8px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Swing
            </span>
            <div
              className="h-1 flex-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface-2)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${unisonDoc.rhythm.swingAmount * 100}%`,
                  backgroundColor: 'var(--color-accent)',
                }}
              />
            </div>
            <span
              className="text-[8px] font-mono"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {Math.round(unisonDoc.rhythm.swingAmount * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Melody */}
      {unisonDoc.melody && (
        <div
          className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Melody
          </span>
          <div className="grid grid-cols-2 gap-1">
            <div className="flex flex-col">
              <span
                className="text-[8px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Range
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {midiToNoteName(unisonDoc.melody.pitchRange.low)} —{' '}
                {midiToNoteName(unisonDoc.melody.pitchRange.high)}
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className="text-[8px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Contour
              </span>
              <span
                className="text-[10px] font-medium capitalize"
                style={{ color: 'var(--color-text)' }}
              >
                {unisonDoc.melody.contour}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
