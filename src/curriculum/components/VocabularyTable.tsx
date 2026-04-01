/**
 * Phase 15 — Vocabulary Table.
 *
 * Displays categorized musical vocabulary for a genre/level.
 */

import React from 'react';
import type { VocabularyEntry } from '../data/styleDna';

interface VocabularyTableProps {
  entries: VocabularyEntry[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Scales/Modes': '#4a9eff',
  Chords: '#ff9e4a',
  Progressions: '#4aff4a',
  Techniques: '#ff4aff',
  Melody: '#ffff4a',
  Bass: '#4affff',
  Rhythm: '#ff4a4a',
  Groove: '#9e4aff',
  Tempo: '#aaa',
  Swing: '#aaa',
};

export const VocabularyTable: React.FC<VocabularyTableProps> = ({
  entries,
}) => {
  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: '12px',
            padding: '10px 14px',
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #2a2a3e',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: `${CATEGORY_COLORS[entry.category] ?? '#888'}22`,
              color: CATEGORY_COLORS[entry.category] ?? '#888',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minWidth: '80px',
              textAlign: 'center',
            }}
          >
            {entry.category}
          </span>
          <span style={{ fontSize: '13px', color: '#bbb', lineHeight: 1.4 }}>
            {entry.description}
          </span>
        </div>
      ))}
    </div>
  );
};
