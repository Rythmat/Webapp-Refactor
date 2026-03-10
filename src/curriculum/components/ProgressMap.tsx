/**
 * Phase 19 — Progress Map.
 *
 * Full 14×3 grid showing completion status across all genres and levels.
 * Intended for use in the curriculum browser or a dedicated progress page.
 */

import React from 'react';
import {
  CURRICULUM_GENRE_IDS,
  type CurriculumGenreId,
} from '../bridge/genreIdMap';
import { ProgressIndicator } from './ProgressIndicator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProgressMapProps {
  /**
   * Progress data: Map of `GENRE:L#` keys to completion percentage (0-100).
   * Missing keys are treated as 0%.
   */
  progressData: Map<string, number>;
  /** Callback when a genre/level cell is clicked */
  onCellClick?: (genre: CurriculumGenreId, level: number) => void;
}

// ---------------------------------------------------------------------------
// Genre display config
// ---------------------------------------------------------------------------

const GENRE_DISPLAY: Record<
  CurriculumGenreId,
  { label: string; color: string }
> = {
  POP: { label: 'Pop', color: '#3b82f6' },
  ROCK: { label: 'Rock', color: '#ef4444' },
  'HIP-HOP': { label: 'Hip-Hop', color: '#8b5cf6' },
  'JAM BAND': { label: 'Jam Band', color: '#10b981' },
  FUNK: { label: 'Funk', color: '#f59e0b' },
  'NEO SOUL': { label: 'Neo Soul', color: '#ec4899' },
  JAZZ: { label: 'Jazz', color: '#6366f1' },
  'R&B': { label: 'R&B', color: '#f97316' },
  LATIN: { label: 'Latin', color: '#14b8a6' },
  BLUES: { label: 'Blues', color: '#64748b' },
  FOLK: { label: 'Folk', color: '#84cc16' },
  ELECTRONIC: { label: 'Electronic', color: '#06b6d4' },
  AFRICAN: { label: 'African', color: '#d97706' },
  REGGAE: { label: 'Reggae', color: '#22c55e' },
};

const LEVELS = [1, 2, 3];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  background: '#1a1a2e',
  borderRadius: 12,
  padding: 20,
};

const headerRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px repeat(3, 60px)',
  gap: 8,
  marginBottom: 8,
  alignItems: 'center',
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px repeat(3, 60px)',
  gap: 8,
  padding: '6px 0',
  alignItems: 'center',
};

const cellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  borderRadius: 8,
  padding: 4,
  transition: 'background 0.15s',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ProgressMap: React.FC<ProgressMapProps> = ({
  progressData,
  onCellClick,
}) => {
  return (
    <div style={containerStyle}>
      <div
        style={{
          color: '#e2e8f0',
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Progress Map
      </div>

      {/* Header */}
      <div style={headerRowStyle}>
        <div
          style={{
            color: '#94a3b8',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Genre
        </div>
        {LEVELS.map((l) => (
          <div
            key={l}
            style={{
              color: '#94a3b8',
              fontSize: 12,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            L{l}
          </div>
        ))}
      </div>

      {/* Genre rows */}
      {CURRICULUM_GENRE_IDS.map((genre) => {
        const display = GENRE_DISPLAY[genre];
        return (
          <div key={genre} style={rowStyle}>
            <div
              style={{
                color: display.color,
                fontSize: 13,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {display.label}
            </div>
            {LEVELS.map((l) => {
              const key = `${genre}:L${l}`;
              const pct = progressData.get(key) ?? 0;
              return (
                <div
                  key={l}
                  style={cellStyle}
                  onClick={() => onCellClick?.(genre, l)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onCellClick?.(genre, l);
                  }}
                >
                  <ProgressIndicator percentage={pct} size="small" />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
