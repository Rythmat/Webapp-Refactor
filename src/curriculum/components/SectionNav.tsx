/**
 * Phase 13 — Section Navigation.
 *
 * Horizontal navigation for activity flow sections A/B/C/D.
 * Shows completion status per section.
 */

import React from 'react';
import type { ActivitySectionId } from '../types/activity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionNavProps {
  /** Currently active section */
  currentSectionId: ActivitySectionId;
  /** Completion percentage per section (0-100) */
  sectionProgress: Record<ActivitySectionId, number>;
  /** Callback when a section is selected */
  onSectionSelect: (sectionId: ActivitySectionId) => void;
  /** Which sections exist in this flow */
  availableSections: ActivitySectionId[];
}

// ---------------------------------------------------------------------------
// Section metadata
// ---------------------------------------------------------------------------

const SECTION_LABELS: Record<ActivitySectionId, string> = {
  A: 'Melody',
  B: 'Chords',
  C: 'Bass',
  D: 'Play-Along',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SectionNav: React.FC<SectionNavProps> = ({
  currentSectionId,
  sectionProgress,
  onSectionSelect,
  availableSections,
}) => {
  return (
    <nav
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 0',
        borderBottom: '1px solid #333',
      }}
    >
      {availableSections.map((id) => {
        const isActive = id === currentSectionId;
        const progress = sectionProgress[id] ?? 0;
        const isComplete = progress === 100;

        return (
          <button
            key={id}
            onClick={() => onSectionSelect(id)}
            style={{
              padding: '8px 16px',
              border: isActive ? '2px solid #4a9eff' : '1px solid #555',
              borderRadius: '8px',
              background: isActive
                ? '#1a3a5c'
                : isComplete
                  ? '#1a3c1a'
                  : '#222',
              color: isActive ? '#4a9eff' : isComplete ? '#4aff4a' : '#aaa',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 400,
              position: 'relative',
            }}
          >
            <span style={{ marginRight: '4px' }}>{id}</span>
            <span>{SECTION_LABELS[id]}</span>
            {progress > 0 && progress < 100 && (
              <span
                style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.7 }}
              >
                {progress}%
              </span>
            )}
            {isComplete && (
              <span style={{ marginLeft: '6px', fontSize: '12px' }}>
                &#10003;
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
