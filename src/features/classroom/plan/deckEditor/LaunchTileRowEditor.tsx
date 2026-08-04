/**
 * LaunchTileRowEditor — displays a content slide's Atlas launch tiles on the
 * canvas as removable chips. Adding tiles now lives in the editor toolbar
 * (`ChooseContentButton`, which opens the ContentPickerDialog); this component
 * only shows the already-chosen tiles where they present, each removable via its
 * ✕. Renders nothing when there are no tiles, so an empty content slide shows no
 * stray block.
 */
import { X } from 'lucide-react';
import type { LaunchTile } from '../../types';

interface LaunchTileRowEditorProps {
  tiles: LaunchTile[];
  onChange: (tiles: LaunchTile[]) => void;
}

export const LaunchTileRowEditor = ({
  tiles,
  onChange,
}: LaunchTileRowEditorProps) => {
  if (tiles.length === 0) return null;

  return (
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
  );
};
