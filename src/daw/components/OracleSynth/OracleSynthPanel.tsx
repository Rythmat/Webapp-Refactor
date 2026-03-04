import { useState, useCallback } from 'react';
import { useOracleSynthInstance } from '@/daw/hooks/useOracleSynthInstance';
import { OracleSynthBridge } from './OracleSynthBridge';

// ── Constants ────────────────────────────────────────────────────────────

const EXPANDED_HEIGHT = 400;
const COLLAPSED_HEIGHT = 32;

// ── Component ────────────────────────────────────────────────────────────
// Collapsible panel that appears at the bottom of the center column when
// an oracle-synth track is selected.  Shows a placeholder body for now;
// the real SynthLayout will be embedded in the integration step.

export function OracleSynthPanel() {
  const { isVisible, trackName } = useOracleSynthInstance();
  const [collapsed, setCollapsed] = useState(false);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  if (!isVisible) return null;

  return (
    <div
      className="shrink-0 border-t flex flex-col"
      style={{
        height: collapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT,
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        transition: 'height 150ms ease',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <button
        onClick={toggle}
        className="flex items-center justify-between px-3 h-8 shrink-0 cursor-pointer select-none"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border)',
          color: 'var(--color-text)',
          border: 'none',
          borderBottomWidth: collapsed ? 0 : 1,
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--color-border)',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span className="text-xs font-semibold tracking-wide">
          Oracle Synth: {trackName}
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {collapsed ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {/* ── Body ──────────────────────────────────────────────────── */}
      {!collapsed && (
        <OracleSynthBridge>
          <div
            className="flex-1 flex items-center justify-center overflow-auto"
            style={{ color: 'var(--color-text-dim)' }}
          >
            <span className="text-sm">
              Oracle Synth UI will be embedded here
            </span>
          </div>
        </OracleSynthBridge>
      )}
    </div>
  );
}
