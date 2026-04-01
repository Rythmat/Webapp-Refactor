/**
 * Phase 16 — Curriculum Browser.
 *
 * 14 genres × 3 levels grid with progress indicators.
 * Entry point for the curriculum module.
 */

import React from 'react';
import { CurriculumRoutes } from '@/constants/routes';

// ---------------------------------------------------------------------------
// Genre metadata
// ---------------------------------------------------------------------------

interface GenreInfo {
  id: string;
  name: string;
  color: string;
}

const GENRES: GenreInfo[] = [
  { id: 'pop', name: 'Pop', color: '#ff6b9d' },
  { id: 'rock', name: 'Rock', color: '#ff4444' },
  { id: 'jazz', name: 'Jazz', color: '#4a9eff' },
  { id: 'blues', name: 'Blues', color: '#4a7eff' },
  { id: 'funk', name: 'Funk', color: '#ff9e4a' },
  { id: 'rnb', name: 'R&B', color: '#bf4aff' },
  { id: 'neoSoul', name: 'Neo Soul', color: '#9e4aff' },
  { id: 'hipHop', name: 'Hip-Hop', color: '#ff4aff' },
  { id: 'reggae', name: 'Reggae', color: '#4aff4a' },
  { id: 'latin', name: 'Latin', color: '#ffcc4a' },
  { id: 'african', name: 'African', color: '#ff8a4a' },
  { id: 'folk', name: 'Folk', color: '#8adf4a' },
  { id: 'electronic', name: 'Electronic', color: '#4affff' },
  { id: 'jamBand', name: 'Jam Band', color: '#dfaf4a' },
];

const LEVELS = [1, 2, 3];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CurriculumBrowserProps {
  /** Navigate to a genre/level page */
  onNavigate?: (path: string) => void;
}

export const CurriculumBrowser: React.FC<CurriculumBrowserProps> = ({
  onNavigate,
}) => {
  const handleClick = (genreId: string, level?: number) => {
    if (onNavigate) {
      const path = level
        ? CurriculumRoutes.genreLevel({ genre: genreId, level: String(level) })
        : CurriculumRoutes.genre({ genre: genreId });
      onNavigate(path);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#eee', margin: '0 0 8px 0', fontSize: '28px' }}>
        Music Atlas Curriculum
      </h1>
      <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '15px' }}>
        14 genres, 3 levels each. Choose your path.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {GENRES.map((genre) => (
          <div
            key={genre.id}
            style={{
              background: '#1a1a2e',
              borderRadius: '12px',
              border: `1px solid ${genre.color}33`,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={() => handleClick(genre.id)}
          >
            {/* Genre header */}
            <div
              style={{
                padding: '16px',
                borderBottom: `1px solid ${genre.color}22`,
              }}
            >
              <h3 style={{ color: genre.color, margin: 0, fontSize: '18px' }}>
                {genre.name}
              </h3>
            </div>

            {/* Level buttons */}
            <div style={{ padding: '12px', display: 'flex', gap: '8px' }}>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(genre.id, level);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    background: '#222',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#aaa',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  L{level}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
