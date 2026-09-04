/**
 * Responses tab — the 5 student-response component types (Choice / Text /
 * Number / Draw / Check-in). Picking one inserts a new question slide of that
 * interaction type into the deck (see `SlideDeckEditor.insertResponseSlide`),
 * which the teacher configures in the side-panel `InteractionEditor` and
 * students answer live. Reuses the shared `INTERACTION_TYPES` roster so the
 * labels/icons match the editor.
 */
import type { InteractionType } from '../../../types';
import { INTERACTION_TYPES } from '../../InteractionEditor';

interface ResponsesTabProps {
  onPick: (type: InteractionType) => void;
}

export const ResponsesTab = ({ onPick }: ResponsesTabProps) => (
  <ul className="max-h-[46vh] min-h-32 overflow-y-auto px-2 pb-3 pt-1">
    {INTERACTION_TYPES.map(({ value, label, Icon, description }) => (
      <li key={value}>
        <button
          type="button"
          onClick={() => onPick(value)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white/70">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white">{label}</span>
            <span className="block truncate text-xs text-white/50">
              {description}
            </span>
          </span>
        </button>
      </li>
    ))}
  </ul>
);
