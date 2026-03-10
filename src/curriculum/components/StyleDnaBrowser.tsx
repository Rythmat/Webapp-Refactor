/**
 * Phase 15 — Style DNA Browser.
 *
 * Browsable artist references and musical vocabulary per genre/level.
 * Lazy-loads data on mount.
 */

import React, { useEffect, useState } from 'react';
import { getStyleDna, type StyleDnaLevel } from '../data/styleDna';
import { ArtistCard } from './ArtistCard';
import { VocabularyTable } from './VocabularyTable';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StyleDnaBrowserProps {
  genreId: string;
  /** Optional: show only a specific level (1, 2, or 3) */
  level?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleDnaBrowser: React.FC<StyleDnaBrowserProps> = ({
  genreId,
  level,
}) => {
  const [levels, setLevels] = useState<StyleDnaLevel[] | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(level ?? 1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getStyleDna(genreId).then((data) => {
      if (!cancelled) {
        setLevels(data);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [genreId]);

  useEffect(() => {
    if (level !== undefined) setSelectedLevel(level);
  }, [level]);

  if (isLoading) {
    return (
      <div style={{ color: '#888', padding: '20px' }}>Loading Style DNA...</div>
    );
  }

  if (!levels || levels.length === 0) {
    return (
      <div style={{ color: '#666', padding: '20px' }}>
        No Style DNA available for this genre.
      </div>
    );
  }

  const currentLevel =
    levels.find((l) => l.level === selectedLevel) ?? levels[0];

  return (
    <div>
      {/* Level selector (only if not locked to a specific level) */}
      {level === undefined && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {levels.map((l) => (
            <button
              key={l.level}
              onClick={() => setSelectedLevel(l.level)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border:
                  l.level === selectedLevel
                    ? '2px solid #4a9eff'
                    : '1px solid #444',
                background: l.level === selectedLevel ? '#1a3a5c' : '#222',
                color: l.level === selectedLevel ? '#4a9eff' : '#aaa',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              L{l.level}
              {l.subtitle && (
                <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                  — {l.subtitle}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Subtitle */}
      {currentLevel.subtitle && (
        <h3 style={{ color: '#ddd', margin: '0 0 16px 0', fontSize: '18px' }}>
          {currentLevel.subtitle}
        </h3>
      )}

      {/* Artist references */}
      {currentLevel.artists.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              color: '#888',
              margin: '0 0 12px 0',
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Artist References
          </h4>
          <div
            style={{
              display: 'grid',
              gap: '12px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            {currentLevel.artists.map((artist, i) => (
              <ArtistCard key={i} artist={artist} />
            ))}
          </div>
        </div>
      )}

      {/* Musical vocabulary */}
      {currentLevel.vocabulary.length > 0 && (
        <div>
          <h4
            style={{
              color: '#888',
              margin: '0 0 12px 0',
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Musical Vocabulary
          </h4>
          <VocabularyTable entries={currentLevel.vocabulary} />
        </div>
      )}
    </div>
  );
};
