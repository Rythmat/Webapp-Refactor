/**
 * Dashboard responsive QA harness — dev-only page that iframes the dashboard
 * at 9 viewport widths simultaneously. See docs/dashboard-responsive.md.
 *
 * Route: /__dashboard-qa  (registered in src/App.tsx behind import.meta.env.DEV).
 *
 * Use it to:
 * 1. Catch cropping or layout regressions BEFORE pushing a change.
 * 2. Build the audit truth-table referenced in the responsive plan.
 *
 * Each iframe loads the dashboard URL (`/`) at a fixed width. Browsers will
 * lay them out as they would at that viewport size.
 */
import { useState } from 'react';

const WIDTHS = [375, 480, 640, 768, 1024, 1280, 1440, 1920, 2560] as const;
type Width = (typeof WIDTHS)[number];

export const DashboardResponsiveTest = () => {
  const [path, setPath] = useState('/');
  const [heightVh, setHeightVh] = useState(85);
  const [selected, setSelected] = useState<Set<Width>>(new Set(WIDTHS));

  const toggle = (w: Width) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  return (
    <div
      style={{
        padding: 16,
        background: '#0a0a0a',
        minHeight: '100vh',
        color: '#e8e8f0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Dashboard Responsive QA
        </h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Path:</span>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{
              padding: '4px 8px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: 4,
              width: 220,
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Frame height:</span>
          <input
            type="range"
            min={40}
            max={120}
            value={heightVh}
            onChange={(e) => setHeightVh(Number(e.target.value))}
          />
          <span style={{ fontSize: 13, opacity: 0.5, width: 40 }}>
            {heightVh}vh
          </span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => toggle(w)}
              style={{
                padding: '4px 8px',
                background: selected.has(w) ? '#3b82f6' : '#1a1a1a',
                color: selected.has(w) ? '#fff' : '#888',
                border: '1px solid #333',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {w}
            </button>
          ))}
        </div>
      </header>

      <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 16 }}>
        Each frame loads <code>{path}</code> at the labelled viewport width.
        Browsers render media queries based on the iframe's content area, so
        these accurately simulate the dashboard at those sizes. (If you change
        layout code, refresh this page to reload all frames.)
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {WIDTHS.filter((w) => selected.has(w)).map((w) => (
          <div
            key={w}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.85,
              }}
            >
              <span>{w}px wide</span>
              <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 400 }}>
                {regimeFor(w)}
              </span>
            </div>
            <iframe
              src={path}
              title={`Dashboard @ ${w}px`}
              style={{
                width: w,
                height: `${heightVh}vh`,
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#191919',
                borderRadius: 4,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const regimeFor = (w: number) => {
  if (w < 768) return 'compact';
  if (w < 1024) return 'comfortable';
  return 'expansive';
};
