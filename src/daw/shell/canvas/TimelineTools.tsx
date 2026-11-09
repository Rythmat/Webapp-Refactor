import { MousePointer2, Pencil, Scissors } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/daw/store';
import type { ToolType } from '@/daw/store/uiSlice';
import { IconButton } from '@/daw/ui/IconButton';

// ── The editing tool (milestones 2.7 and 2.13; one button, 2026-10-21) ─────
//
// Pointer (V), Draw (B) and Cut (C) as one button. Out of the top bar since
// 2026-10-22 (owner): the keys pick the tool; the button stays for now, as
// it was there (owner, 2026-10-21): it shows the tool in hand, and a click
// takes the next one, Pointer → Draw → Cut → Pointer. The keys are the
// timeline's (keymaps.ts) and still pick any tool at once; this is the same
// choice, visible. It stood as three buttons in the corner over the track
// list, beside the ruler, until then.

export interface EditTool {
  value: ToolType;
  /** The tool's name, as its tip and the next tool's hint say it. */
  name: string;
  key: string;
  icon: JSX.Element;
}

export const EDIT_TOOLS: readonly EditTool[] = [
  { value: 'cursor', name: 'Pointer', key: 'V', icon: <MousePointer2 /> },
  { value: 'pencil', name: 'Draw clips', key: 'B', icon: <Pencil /> },
  { value: 'scissors', name: 'Cut clips', key: 'C', icon: <Scissors /> },
];

/** The tool shown for `tool`: 'layout' (key 4) has no button of its own. */
export function shownTool(tool: ToolType): EditTool {
  return EDIT_TOOLS.find((t) => t.value === tool) ?? EDIT_TOOLS[0];
}

/** The tool a click takes after `tool`. */
export function nextTool(tool: ToolType): EditTool {
  const at = EDIT_TOOLS.indexOf(shownTool(tool));
  return EDIT_TOOLS[(at + 1) % EDIT_TOOLS.length];
}

export const EditToolButton = memo(function EditToolButton() {
  const tool = useStore((s) => s.activeTool);
  const shown = shownTool(tool);
  const next = nextTool(tool);
  return (
    <IconButton
      label={`${shown.name} (${shown.key}): click for ${next.name}`}
      icon={shown.icon}
      variant="bare"
      size="lg"
      tooltipSide="bottom"
      data-testid="edit-tool"
      data-tool={shown.value}
      className="[&_svg]:size-4"
      onClick={() => useStore.getState().setActiveTool(next.value)}
    />
  );
});
