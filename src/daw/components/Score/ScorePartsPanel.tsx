import { RotateCcw } from 'lucide-react';
import type { NotationStaffSetting } from '@/daw/store/tracksSlice';
import { PartStaffSelect } from './PartStaffControls';
import type { PartStaffState } from './partStaff';

// ── Parts ──────────────────────────────────────────────────────────────────
// Two lists of the instruments: the clef each is written in, and its own
// chord-symbol switch. A clef follows the instrument (Auto) until a teacher
// picks one. The chords themselves belong to the lead sheet; a part only
// chooses to show them, and which ones it has dropped.

export interface ScorePartRow {
  id: string;
  name: string;
  color: string;
  /** The part's clef; null while its track is not in the project. */
  staff: PartStaffState | null;
  showChords: boolean;
  /** How many of the lead sheet's chords this part has dropped. */
  hiddenChords: number;
}

export interface ScorePartsPanelProps {
  parts: ScorePartRow[];
  onSetStaff: (trackId: string, setting: NotationStaffSetting) => void;
  onToggleChords: (trackId: string) => void;
  onRestoreChords: (trackId: string) => void;
}

function PartDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

export function ScorePartsPanel({
  parts,
  onSetStaff,
  onToggleChords,
  onRestoreChords,
}: ScorePartsPanelProps) {
  if (parts.length === 0) return null;
  return (
    // A score of many parts scrolls here rather than pushing the palettes
    // out of the column.
    <div
      className="shrink-0 overflow-y-auto"
      style={{ borderTop: '1px solid var(--daw-hairline)', maxHeight: '55%' }}
    >
      <div
        className="flex items-center px-2 py-1.5 text-xs"
        style={{ color: 'var(--daw-text)' }}
      >
        Clef
      </div>
      <div className="pb-2" data-score-clefs>
        {parts.map((part) => {
          // A kit's drum staff fits beside its name; a choice gets a row of
          // its own, so 'Auto (Grand staff)' is never cut short.
          const own = !!part.staff && !part.staff.kit;
          return (
            <div
              key={part.id}
              data-score-clef={part.name}
              className="px-2 py-1 text-xs"
              style={{ color: 'var(--daw-text-3)' }}
            >
              <div className="flex items-center gap-2">
                <PartDot color={part.color} />
                <span
                  className="min-w-0 flex-1 truncate"
                  title={part.name}
                  style={{ color: 'var(--daw-text)' }}
                >
                  {part.name}
                </span>
                {part.staff?.kit && (
                  <PartStaffSelect
                    name={part.name}
                    state={part.staff}
                    onChange={(setting) => onSetStaff(part.id, setting)}
                  />
                )}
              </div>
              {own && part.staff && (
                <div className="mt-1 pl-4">
                  <PartStaffSelect
                    name={part.name}
                    state={part.staff}
                    onChange={(setting) => onSetStaff(part.id, setting)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        className="flex items-center px-2 py-1.5 text-xs"
        style={{
          color: 'var(--daw-text)',
          borderTop: '1px solid var(--daw-hairline)',
        }}
      >
        Chord symbols
      </div>
      <div className="pb-2">
        {parts.map((part) => (
          <div
            key={part.id}
            className="flex items-center gap-2 px-2 py-1 text-xs"
            style={{ color: 'var(--daw-text-3)' }}
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={part.showChords}
                onChange={() => onToggleChords(part.id)}
                className="size-3 accent-[color:var(--daw-accent)]"
              />
              <PartDot color={part.color} />
              <span className="truncate" style={{ color: 'var(--daw-text)' }}>
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
