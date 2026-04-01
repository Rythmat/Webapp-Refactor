/**
 * Phase 16 — Genre Level Page.
 *
 * Detail page for a specific genre × level combination.
 * Shows Style DNA + Activity Flow sections.
 */

import React, { useEffect, useState } from 'react';
import { getActivityFlow } from '../data/activityFlows';
import type { ActivityFlow } from '../types/activity';
import { StyleDnaBrowser } from './StyleDnaBrowser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenreLevelPageProps {
  genreId: string;
  level: number;
  /** Navigate to activity flow player */
  onStartActivity?: (flow: ActivityFlow) => void;
  /** Navigate back */
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GenreLevelPage: React.FC<GenreLevelPageProps> = ({
  genreId,
  level,
  onStartActivity,
  onBack,
}) => {
  const [flow, setFlow] = useState<ActivityFlow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getActivityFlow(genreId, level).then((data) => {
      if (!cancelled) {
        setFlow(data);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [genreId, level]);

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#888',
              cursor: 'pointer',
              padding: '6px 12px',
              fontSize: '13px',
            }}
          >
            &#8592; Back
          </button>
        )}
        <div>
          <h1 style={{ color: '#eee', margin: 0, fontSize: '24px' }}>
            {flow?.title ?? `${genreId} Level ${level}`}
          </h1>
          <div style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>
            {flow && (
              <>
                Tempo: {flow.params.tempoRange[0]}-{flow.params.tempoRange[1]}{' '}
                BPM
                {flow.params.swing > 0 && ` · Swing: ${flow.params.swing}`}
                {` · Key: ${flow.params.defaultKey}`}
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: '#888', padding: '20px' }}>Loading...</div>
      ) : (
        <>
          {/* Activity flow overview */}
          {flow && (
            <div style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  color: '#ddd',
                  fontSize: '18px',
                  margin: '0 0 12px 0',
                }}
              >
                Activity Flow
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                {flow.sections.map((section) => (
                  <div
                    key={section.id}
                    style={{
                      padding: '12px 16px',
                      background: '#1a1a2e',
                      borderRadius: '8px',
                      border: '1px solid #333',
                      minWidth: '140px',
                    }}
                  >
                    <div
                      style={{
                        color: '#4a9eff',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      {section.id}: {section.name}
                    </div>
                    <div
                      style={{
                        color: '#666',
                        fontSize: '12px',
                        marginTop: '4px',
                      }}
                    >
                      {section.steps.length} steps
                    </div>
                  </div>
                ))}
              </div>

              {onStartActivity && (
                <button
                  onClick={() => onStartActivity(flow)}
                  style={{
                    padding: '12px 32px',
                    background: '#1a4a2a',
                    border: '1px solid #4aff4a',
                    borderRadius: '8px',
                    color: '#4aff4a',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Start Activity
                </button>
              )}
            </div>
          )}

          {/* Style DNA */}
          <div>
            <h2
              style={{ color: '#ddd', fontSize: '18px', margin: '0 0 12px 0' }}
            >
              Style DNA
            </h2>
            <StyleDnaBrowser genreId={genreId} level={level} />
          </div>
        </>
      )}
    </div>
  );
};
