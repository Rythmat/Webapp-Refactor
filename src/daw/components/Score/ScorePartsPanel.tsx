import { RotateCcw } from 'lucide-react';

// ── Parts ──────────────────────────────────────────────────────────────────
// One row per instrument, each with its own chord-symbol switch. The chords
// themselves belong to the lead sheet; a part only chooses to show them, and
// which ones it has dropped.

export interface ScorePartRow {
  id: string;
  name: string;
  color: string;
  showChords: boolean;
  /** How many of the lead sheet's chords this part has dropped. */
  hiddenChords: number;
}

export interface ScorePartsPanelProps {
  parts: ScorePartRow[];
  onToggleChords: (trackId: string) => void;
  onRestoreChords: (trackId: string) => void;
}

export function ScorePartsPanel({
  parts,
  onToggleChords,
  onRestoreChords,
}: ScorePartsPanelProps) {
  if (parts.length === 0) return null;
  return (
    <div
      className="shrink-0"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div
        className="flex items-center px-2 py-1.5 text-xs"
        style={{ color: 'var(--color-text)' }}
      >
        Chord symbols
      </div>
      <div className="pb-2">
        {parts.map((part) => (
          <div
            key={part.id}
            className="flex items-center gap-2 px-2 py-1 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={part.showChords}
                onChange={() => onToggleChords(part.id)}
                className="size-3 accent-[color:var(--color-accent,#7ecfcf)]"
              />
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: part.color }}
              />
              <span className="truncate" style={{ color: 'var(--color-text)' }}>
                {part.name}
              </span>
            </label>
            {part.hiddenChords > 0 && (
              <button
                onClick={() => onRestoreChords(part.id)}
                title={`Bring back ${part.hiddenChords} chord${part.hiddenChords === 1 ? '' : 's'} removed from ${part.name}`}
                className="flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-white/10"
              >
                <RotateCcw className="size-3" />
                {part.hiddenChords}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
