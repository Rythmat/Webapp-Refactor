/**
 * Phase 16 — Genre Level Page Route.
 *
 * Route component for /curriculum/:genre/:level.
 * Extracts URL params and renders GenreLevelPage.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CurriculumRoutes } from '@/constants/routes';
import { GenreLevelPage } from '../components/GenreLevelPage';

export const GenreLevelPageRoute: React.FC = () => {
  const { genre, level } = useParams<{ genre: string; level?: string }>();
  const navigate = useNavigate();

  if (!genre) {
    return (
      <div style={{ color: '#888', padding: '40px' }}>Genre not found.</div>
    );
  }

  const levelNum = level ? parseInt(level) : 1;

  return (
    <GenreLevelPage
      genreId={genre}
      level={levelNum}
      onBack={() => navigate(CurriculumRoutes.root())}
    />
  );
};
