/**
 * LaunchTileRowEditor — edits a content slide's Atlas launch tiles on the
 * canvas. Existing tiles show as removable chips; a compact form adds a new
 * tile (module + activityRef + optional label). Student-safe refs only.
 */
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { LaunchTile } from '../../types';

const MODULES: LaunchTile['module'][] = ['globe', 'learn', 'studio', 'arcade'];

const tileUid = (): string =>
  `lt-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;

interface LaunchTileRowEditorProps {
  tiles: LaunchTile[];
  onChange: (tiles: LaunchTile[]) => void;
}

export const LaunchTileRowEditor = ({
  tiles,
  onChange,
}: LaunchTileRowEditorProps) => {
  const [module, setModule] = useState<LaunchTile['module']>('globe');
  const [activityRef, setActivityRef] = useState('');
  const [label, setLabel] = useState('');

  const addTile = () => {
    if (!activityRef.trim()) return;
    onChange([
      ...tiles,
      {
        id: tileUid(),
        module,
        activityRef: activityRef.trim(),
        ...(label.trim() ? { label: { en: label.trim() } } : {}),
      },
    ]);
    setActivityRef('');
    setLabel('');
  };

  return (
    <div className="flex flex-col gap-2">
      {tiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tiles.map((tile) => (
            <span
              key={tile.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-white/80"
            >
              <span className="uppercase tracking-wide text-white/40">
                {tile.module}
              </span>
              {tile.label?.en ?? tile.activityRef}
              <button
                type="button"
                aria-label="Remove tile"
                onClick={() => onChange(tiles.filter((t) => t.id !== tile.id))}
                className="text-white/40 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={module}
          onChange={(e) => setModule(e.target.value as LaunchTile['module'])}
          aria-label="Module"
          className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/30"
        >
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={activityRef}
          onChange={(e) => setActivityRef(e.target.value)}
          placeholder="activity ref"
          className="w-32 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="label (optional)"
          className="w-36 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
        <button
          type="button"
          onClick={addTile}
          disabled={!activityRef.trim()}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Tile
        </button>
      </div>
    </div>
  );
};
