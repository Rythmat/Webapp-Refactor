/**
 * Phase 15 — Artist Reference Card.
 *
 * Displays an artist name, description, and style tags.
 */

import React from 'react';
import type { ArtistReference } from '../data/styleDna';

interface ArtistCardProps {
  artist: ArtistReference;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist }) => {
  return (
    <div
      style={{
        padding: '16px',
        background: '#1a1a2e',
        borderRadius: '10px',
        border: '1px solid #333',
      }}
    >
      <h4 style={{ color: '#eee', margin: '0 0 8px 0', fontSize: '16px' }}>
        {artist.name}
      </h4>
      {artist.description && (
        <p
          style={{
            color: '#aaa',
            fontSize: '14px',
            lineHeight: 1.5,
            margin: '0 0 10px 0',
          }}
        >
          {artist.description}
        </p>
      )}
      {artist.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {artist.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: '#2a2a4e',
                color: '#888',
              }}
            >
              {tag.split(':').pop()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
