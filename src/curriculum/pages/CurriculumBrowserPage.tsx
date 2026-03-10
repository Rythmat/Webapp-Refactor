/**
 * Phase 16 — Curriculum Browser Page.
 *
 * Route component for /curriculum — renders the genre grid.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CurriculumBrowser } from '../components/CurriculumBrowser';

export const CurriculumBrowserPage: React.FC = () => {
  const navigate = useNavigate();
  return <CurriculumBrowser onNavigate={(path) => navigate(path)} />;
};
