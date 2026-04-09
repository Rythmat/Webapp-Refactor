/**
 * Phase 16 — Curriculum Layout.
 *
 * Layout wrapper for curriculum pages.
 * Provides the Outlet for nested routes.
 */

import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

export const CurriculumLayout: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        color: '#eee',
      }}
    >
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
};
