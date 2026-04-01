/**
 * Phase 21 — Open in Studio Button.
 *
 * Converts curriculum-generated content to DAW format and navigates
 * to the Studio/DAW view. Shown after completing an activity or on
 * the GenreLevelPage.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { curriculumToDaw } from '../bridge/dawBridge';
import type { GeneratedActivity } from '../engine/contentOrchestrator';

interface OpenInStudioButtonProps {
  /** The generated activity to load into the DAW */
  activity: GeneratedActivity;
  /** Optional custom label */
  label?: string;
  /** Optional callback to load DAW state (injected to avoid direct store coupling) */
  onLoadToDaw?: (payload: ReturnType<typeof curriculumToDaw>) => void;
}

export const OpenInStudioButton: React.FC<OpenInStudioButtonProps> = ({
  activity,
  label = 'Open in Studio',
  onLoadToDaw,
}) => {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    const payload = curriculumToDaw(activity);

    // Let parent handle DAW state loading
    onLoadToDaw?.(payload);

    // Navigate to studio
    navigate('/studio');
  }, [activity, onLoadToDaw, navigate]);

  return (
    <button
      onClick={handleClick}
      style={{
        background: '#7c3aed',
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLButtonElement).style.background = '#6d28d9';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLButtonElement).style.background = '#7c3aed';
      }}
    >
      {label}
    </button>
  );
};
